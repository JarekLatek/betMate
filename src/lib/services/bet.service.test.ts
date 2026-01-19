import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { BetService } from "./bet.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { BetEntity, CreateBetCommand, UpdateBetCommand, BetsQueryParams } from "@/types";

// Mock Supabase client
const createMockSupabaseClient = () => {
  return {
    from: vi.fn(),
  } as unknown as SupabaseClient<Database>;
};

describe("BetService", () => {
  let betService: BetService;
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    betService = new BetService(mockSupabase);
    vi.clearAllMocks();
  });

  describe("createBet", () => {
    it("should create a new bet successfully", async () => {
      // Arrange
      const userId = "user-123";
      const command: CreateBetCommand = {
        match_id: 1,
        picked_result: "HOME_WIN",
      };
      const expectedBet: BetEntity = {
        id: 1,
        user_id: userId,
        match_id: command.match_id,
        picked_result: command.picked_result,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: expectedBet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.createBet(userId, command);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("bets");
      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: userId,
        match_id: command.match_id,
        picked_result: command.picked_result,
      });
      expect(result).toEqual(expectedBet);
    });

    it("should throw error when database operation fails", async () => {
      // Arrange
      const userId = "user-123";
      const command: CreateBetCommand = {
        match_id: 1,
        picked_result: "HOME_WIN",
      };
      const dbError = { message: "Database error", code: "23505" };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act & Assert
      await expect(betService.createBet(userId, command)).rejects.toEqual(dbError);
    });
  });

  describe("updateBet", () => {
    const betId = 1;
    const userId = "user-123";
    const command: UpdateBetCommand = { picked_result: "AWAY_WIN" };

    it("should update bet successfully when all validations pass", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: futureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const updatedBet: BetEntity = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "AWAY_WIN",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const selectMockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      const updateMockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedBet, error: null }),
      };

      (mockSupabase.from as Mock)
        .mockReturnValueOnce(selectMockChain)
        .mockReturnValueOnce(updateMockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({ success: true, data: updatedBet });
    });

    it("should return 404 when bet is not found (RLS policy block)", async () => {
      // Arrange
      const rlsError = { code: "PGRST116", message: "Not found" };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: rlsError }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Bet not found",
        status: 404,
      });
    });

    it("should return 404 when bet data is null", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Bet not found",
        status: 404,
      });
    });

    it("should return 403 when match is not scheduled", async () => {
      // Arrange
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: new Date().toISOString(),
          status: "IN_PLAY",
        },
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Cannot modify this bet",
        reason: "Match is not scheduled",
        status: 403,
      });
    });

    it("should return 403 when match starts in less than 5 minutes", async () => {
      // Arrange
      const nearFutureDate = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: nearFutureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Cannot modify this bet",
        reason: "Match starts in less than 5 minutes",
        status: 403,
      });
    });

    it("should return 403 when match starts in exactly 5 minutes", async () => {
      // Arrange
      const exactlyFiveMinutes = new Date(Date.now() + 5 * 60 * 1000);
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: exactlyFiveMinutes.toISOString(),
          status: "SCHEDULED",
        },
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Cannot modify this bet",
        reason: "Match starts in less than 5 minutes",
        status: 403,
      });
    });

    it("should return 500 when database fetch fails with unknown error", async () => {
      // Arrange
      const dbError = { code: "UNKNOWN", message: "Database error" };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Internal server error",
        status: 500,
      });
    });

    it("should return 500 when update operation fails", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: futureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const selectMockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      const updateError = { message: "Update failed", code: "UPDATE_ERROR" };
      const updateMockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: updateError }),
      };

      (mockSupabase.from as Mock)
        .mockReturnValueOnce(selectMockChain)
        .mockReturnValueOnce(updateMockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Internal server error",
        status: 500,
      });
    });

    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.updateBet(betId, userId, command);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Internal server error",
        status: 500,
      });
    });
  });

  describe("deleteBet", () => {
    const betId = 1;
    const userId = "user-123";

    it("should delete bet successfully when all validations pass", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: futureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const selectMockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      const deleteMockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Chain the last eq() call to return a promise
      deleteMockChain.eq = vi.fn().mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      (mockSupabase.from as Mock)
        .mockReturnValueOnce(selectMockChain)
        .mockReturnValueOnce(deleteMockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it("should return 404 when bet is not found (RLS policy block)", async () => {
      // Arrange
      const rlsError = { code: "PGRST116", message: "Not found" };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: rlsError }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Bet not found",
        status: 404,
      });
    });

    it("should return 404 when bet data is null", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Bet not found",
        status: 404,
      });
    });

    it("should return 403 when match is not scheduled", async () => {
      // Arrange
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: new Date().toISOString(),
          status: "FINISHED",
        },
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Cannot delete this bet",
        reason: "Match is not scheduled",
        status: 403,
      });
    });

    it("should return 403 when match starts in less than 5 minutes", async () => {
      // Arrange
      const nearFutureDate = new Date(Date.now() + 2 * 60 * 1000);
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: nearFutureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Cannot delete this bet",
        reason: "Match starts in less than 5 minutes",
        status: 403,
      });
    });

    it("should return 500 when delete operation fails", async () => {
      // Arrange
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const bet = {
        id: betId,
        user_id: userId,
        match_id: 1,
        picked_result: "HOME_WIN",
        match: {
          id: 1,
          match_datetime: futureDate.toISOString(),
          status: "SCHEDULED",
        },
      };

      const selectMockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: bet, error: null }),
      };

      const deleteError = { message: "Delete failed", code: "DELETE_ERROR" };
      const deleteMockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ error: deleteError }),
        }),
      };

      (mockSupabase.from as Mock)
        .mockReturnValueOnce(selectMockChain)
        .mockReturnValueOnce(deleteMockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Internal server error",
        status: 500,
      });
    });

    it("should return 500 when unexpected error occurs", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          throw new Error("Unexpected error");
        }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      // Act
      const result = await betService.deleteBet(betId, userId);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Internal server error",
        status: 500,
      });
    });
  });

  describe("getUserBets", () => {
    const userId = "user-123";

    it("should return paginated bets with default parameters", async () => {
      // Arrange
      const bets = [
        {
          id: 1,
          user_id: userId,
          match_id: 1,
          picked_result: "HOME_WIN",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          match: {
            id: 1,
            tournament_id: 1,
            home_team: "Team A",
            away_team: "Team B",
            match_datetime: "2024-01-15T00:00:00Z",
            status: "SCHEDULED",
            result: null,
            home_score: null,
            away_score: null,
          },
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: bets, error: null, count: 1 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = {};

      // Act
      const result = await betService.getUserBets(userId, params);

      // Assert
      expect(result).toEqual({
        data: bets,
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          has_more: false,
        },
      });
      expect(mockChain.range).toHaveBeenCalledWith(0, 49);
    });

    it("should apply tournament_id filter when provided", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = { tournament_id: 5 };

      // Act
      await betService.getUserBets(userId, params);

      // Assert
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockChain.eq).toHaveBeenCalledWith("match.tournament_id", 5);
    });

    it("should apply match_id filter when provided", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = { match_id: 10 };

      // Act
      await betService.getUserBets(userId, params);

      // Assert
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockChain.eq).toHaveBeenCalledWith("match_id", 10);
    });

    it("should handle custom pagination parameters", async () => {
      // Arrange
      const bets = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        user_id: userId,
        match_id: i + 1,
        picked_result: "HOME_WIN",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        match: {
          id: i + 1,
          tournament_id: 1,
          home_team: "Team A",
          away_team: "Team B",
          match_datetime: "2024-01-15T00:00:00Z",
          status: "SCHEDULED",
          result: null,
          home_score: null,
          away_score: null,
        },
      }));

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: bets, error: null, count: 25 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = { limit: 10, offset: 10 };

      // Act
      const result = await betService.getUserBets(userId, params);

      // Assert
      expect(mockChain.range).toHaveBeenCalledWith(10, 19);
      expect(result.pagination).toEqual({
        total: 25,
        limit: 10,
        offset: 10,
        has_more: true,
      });
    });

    it("should set has_more to false when on last page", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 5 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = { limit: 10, offset: 0 };

      // Act
      const result = await betService.getUserBets(userId, params);

      // Assert
      expect(result.pagination.has_more).toBe(false);
    });

    it("should throw error when database operation fails", async () => {
      // Arrange
      const dbError = { message: "Database error", code: "DB_ERROR", details: "Some details" };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: null, error: dbError, count: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = {};

      // Act & Assert
      await expect(betService.getUserBets(userId, params)).rejects.toThrow("Failed to fetch bets");
    });

    it("should handle null count from database", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: null }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = {};

      // Act
      const result = await betService.getUserBets(userId, params);

      // Assert
      expect(result.pagination.total).toBe(0);
    });

    it("should order bets by created_at descending", async () => {
      // Arrange
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };

      (mockSupabase.from as Mock).mockReturnValue(mockChain);

      const params: BetsQueryParams = {};

      // Act
      await betService.getUserBets(userId, params);

      // Assert
      expect(mockChain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });
});
