import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import { scoreMatches } from "./scoring.service";
import type { MatchOutcome } from "@/types";

// Create a comprehensive mock Supabase client
const createMockSupabaseClient = () => {
  const createQuery = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
  });

  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    from: vi.fn((_table: string) => createQuery()),
  };
};

describe("scoring.service", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe("scoreMatches - happy path", () => {
    it("should return empty result when no unscored matches exist", async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      }));

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result).toEqual({
        processed_matches: 0,
        updated_scores: 0,
        errors: [],
      });
    });

    it("should process single match with one correct bet and award 3 points", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockResolvedValue({ data: null, error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.updated_scores).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should process match with multiple bets and award points only to correct predictions", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [
        { id: 1, user_id: "user-1", picked_result: "HOME_WIN" as MatchOutcome }, // Correct
        { id: 2, user_id: "user-2", picked_result: "AWAY_WIN" as MatchOutcome }, // Incorrect
        { id: 3, user_id: "user-3", picked_result: "HOME_WIN" as MatchOutcome }, // Correct
        { id: 4, user_id: "user-4", picked_result: "DRAW" as MatchOutcome }, // Incorrect
      ];

      let fromCallIndex = 0;
      let scoresCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores") {
          scoresCallIndex++;
          if (scoresCallIndex % 2 === 1) {
            // Odd calls are select().single() for getting existing score
            query.single.mockResolvedValue({ data: null, error: null });
          } else {
            // Even calls are upsert()
            query.upsert.mockResolvedValue({ data: null, error: null });
          }
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.updated_scores).toBe(2); // Only 2 correct bets
      expect(result.errors).toHaveLength(0);
    });

    it("should add points to existing user score", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];
      const existingScore = { points: 10 };

      let fromCallIndex = 0;
      let upsertedData: any = null;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          // Get existing score
          query.single.mockResolvedValue({ data: existingScore, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          // Upsert new score
          query.upsert.mockImplementation((data) => {
            upsertedData = data;
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.updated_scores).toBe(1);
      expect(upsertedData.points).toBe(13); // 10 existing + 3 new
    });

    it("should process multiple matches sequentially", async () => {
      // Arrange
      const unscoredMatches = [
        { id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome },
        { id: 2, tournament_id: 100, result: "DRAW" as MatchOutcome },
      ];
      const bets1 = [{ id: 1, user_id: "user-1", picked_result: "HOME_WIN" as MatchOutcome }];
      const bets2 = [{ id: 2, user_id: "user-2", picked_result: "DRAW" as MatchOutcome }];

      let fromCallIndex = 0;
      let betsCallCount = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          betsCallCount++;
          const betsData = betsCallCount === 1 ? bets1 : bets2;
          query.eq.mockResolvedValue({ data: betsData, error: null });
        } else if (table === "scores") {
          query.single.mockResolvedValue({ data: null, error: null });
          query.upsert.mockResolvedValue({ data: null, error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(2);
      expect(result.updated_scores).toBe(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("scoreMatches - dryRun mode", () => {
    it("should not persist changes when dryRun is true", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let upsertCalled = false;
      let updateCalled = false;
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        fromCallIndex++;

        // Create a query object with all methods that return itself
        const query: any = {
          select: vi.fn(),
          eq: vi.fn(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        };

        // Make methods return the query object for chaining
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.update.mockReturnValue(query);

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores") {
          query.upsert.mockImplementation(() => {
            upsertCalled = true;
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockImplementation(() => {
            updateCalled = true;
            return Promise.resolve({ error: null });
          });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>, true);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.updated_scores).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(upsertCalled).toBe(false);
      expect(updateCalled).toBe(false);
    });

    it("should count all would-be updates in dryRun mode", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [
        { id: 1, user_id: "user-1", picked_result: "HOME_WIN" as MatchOutcome },
        { id: 2, user_id: "user-2", picked_result: "HOME_WIN" as MatchOutcome },
        { id: 3, user_id: "user-3", picked_result: "AWAY_WIN" as MatchOutcome },
      ];

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        if (table === "matches") {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>, true);

      // Assert
      expect(result.updated_scores).toBe(2); // Only 2 correct bets
    });
  });

  describe("scoreMatches - edge cases", () => {
    it("should handle match with no bets", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        fromCallIndex++;

        const query: any = {
          select: vi.fn(),
          eq: vi.fn(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        };

        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.update.mockReturnValue(query);

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: [], error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.updated_scores).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle match where all bets are incorrect", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [
        { id: 1, user_id: "user-1", picked_result: "AWAY_WIN" as MatchOutcome },
        { id: 2, user_id: "user-2", picked_result: "DRAW" as MatchOutcome },
      ];
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        fromCallIndex++;

        const query: any = {
          select: vi.fn(),
          eq: vi.fn(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn(),
          upsert: vi.fn(),
        };

        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.update.mockReturnValue(query);

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.updated_scores).toBe(0);
    });

    it("should handle null existing score data (new user)", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let upsertedData: any = null;
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockImplementation((data) => {
            upsertedData = data;
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(upsertedData.points).toBe(3); // 0 + 3
    });
  });

  describe("scoreMatches - error handling", () => {
    it("should throw error when getUnscoredMatches fails", async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection failed" },
        }),
        single: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      }));

      // Act & Assert
      await expect(scoreMatches(mockSupabase as unknown as SupabaseClient<Database>)).rejects.toThrow(
        "Failed to fetch unscored matches: Database connection failed"
      );
    });

    it("should collect error and continue processing when getBetsForMatch fails", async () => {
      // Arrange
      const unscoredMatches = [
        { id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome },
        { id: 2, tournament_id: 100, result: "DRAW" as MatchOutcome },
      ];

      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets" && fromCallIndex === 2) {
          // First match - fail to get bets
          query.eq.mockResolvedValue({ data: null, error: { message: "Bets query failed" } });
        } else if (table === "bets" && fromCallIndex === 3) {
          // Second match - succeed
          query.eq.mockResolvedValue({ data: [], error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to fetch bets for match 1");
    });

    it("should collect error when upsertScore fails", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockResolvedValue({ data: null, error: { message: "Upsert failed" } });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to upsert score for user user-123");
    });

    it("should collect error when markMatchAsScored fails", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];

      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: [], error: null });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: { message: "Update failed" } });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Failed to mark match 1 as scored");
    });

    it("should handle multiple errors across different matches", async () => {
      // Arrange
      const unscoredMatches = [
        { id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome },
        { id: 2, tournament_id: 100, result: "DRAW" as MatchOutcome },
        { id: 3, tournament_id: 100, result: "AWAY_WIN" as MatchOutcome },
      ];

      let fromCallIndex = 0;
      let betsCallCount = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          betsCallCount++;
          if (betsCallCount === 1) {
            query.eq.mockResolvedValue({ data: null, error: { message: "Error 1" } });
          } else {
            query.eq.mockResolvedValue({ data: [], error: null });
          }
        } else if (table === "matches" && fromCallIndex > 1) {
          if (fromCallIndex === 4) {
            // Match 3 fails to mark as scored
            query.eq.mockResolvedValue({ error: { message: "Error 3" } });
          } else {
            query.eq.mockResolvedValue({ error: null });
          }
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.processed_matches).toBe(1); // Only match 2 succeeded
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("scoreMatches - business rules validation", () => {
    it("should award exactly 3 points for each correct bet", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let upsertedData: any = null;
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockImplementation((data) => {
            upsertedData = data;
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(upsertedData.points).toBe(3);
    });

    it("should only score exact match between picked_result and match result", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [
        { id: 1, user_id: "user-1", picked_result: "HOME_WIN" as MatchOutcome }, // Correct
        { id: 2, user_id: "user-2", picked_result: "AWAY_WIN" as MatchOutcome }, // Incorrect
        { id: 3, user_id: "user-3", picked_result: "DRAW" as MatchOutcome }, // Incorrect
      ];

      const upsertedUsers: string[] = [];
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores") {
          query.single.mockResolvedValue({ data: null, error: null });
          query.upsert.mockImplementation((data) => {
            upsertedUsers.push(data.user_id);
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      const result = await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(result.updated_scores).toBe(1);
      expect(upsertedUsers).toEqual(["user-1"]);
    });

    it("should include updated_at timestamp in upsert", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let upsertedData: any = null;
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockImplementation((data, options) => {
            upsertedData = { data, options };
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(upsertedData.data.updated_at).toBeDefined();
      expect(typeof upsertedData.data.updated_at).toBe("string");
    });

    it("should use correct upsert conflict resolution", async () => {
      // Arrange
      const unscoredMatches = [{ id: 1, tournament_id: 100, result: "HOME_WIN" as MatchOutcome }];
      const bets = [{ id: 1, user_id: "user-123", picked_result: "HOME_WIN" as MatchOutcome }];

      let upsertOptions: any = null;
      let fromCallIndex = 0;

      mockSupabase.from = vi.fn((table: string) => {
        const query = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn(),
          single: vi.fn(),
          update: vi.fn().mockReturnThis(),
          upsert: vi.fn(),
        };

        fromCallIndex++;

        if (table === "matches" && fromCallIndex === 1) {
          query.not.mockResolvedValue({ data: unscoredMatches, error: null });
        } else if (table === "bets") {
          query.eq.mockResolvedValue({ data: bets, error: null });
        } else if (table === "scores" && fromCallIndex === 3) {
          query.single.mockResolvedValue({ data: null, error: null });
        } else if (table === "scores" && fromCallIndex === 4) {
          query.upsert.mockImplementation((_data, options) => {
            upsertOptions = options;
            return Promise.resolve({ data: null, error: null });
          });
        } else if (table === "matches" && fromCallIndex > 1) {
          query.eq.mockResolvedValue({ error: null });
        }

        return query;
      });

      // Act
      await scoreMatches(mockSupabase as unknown as SupabaseClient<Database>);

      // Assert
      expect(upsertOptions).toEqual({ onConflict: "user_id,tournament_id" });
    });
  });
});
