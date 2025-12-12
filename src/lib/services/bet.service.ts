import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type {
  BetEntity,
  BetsQueryParams,
  BetWithMatchDTO,
  CreateBetCommand,
  PaginatedResponseDTO,
  UpdateBetCommand,
} from "@/types";

/**
 * Result type for update bet operation
 */
type UpdateBetResult =
  | { success: true; data: BetEntity }
  | { success: false; error: string; reason?: string; status: 403 | 404 | 500 };

/**
 * Result type for delete bet operation
 */
type DeleteBetResult =
  | { success: true }
  | {
      success: false;
      error: string;
      reason?: string;
      status: 403 | 404 | 500;
    };

/**
 * Service class for bet-related database operations
 * Handles all business logic for creating and managing bets
 */
export class BetService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Creates a new bet for a user on a specific match
   *
   * @param userId - The authenticated user's ID
   * @param command - The bet creation data (match_id and picked_result)
   * @returns The created bet entity
   * @throws PostgrestError if database operation fails (constraint violations, RLS policy failures, etc.)
   */
  async createBet(userId: string, command: CreateBetCommand): Promise<BetEntity> {
    const { data, error } = await this.supabase
      .from("bets")
      .insert({
        user_id: userId,
        match_id: command.match_id,
        picked_result: command.picked_result,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Updates an existing bet for a user
   *
   * Validates that:
   * - The bet exists and belongs to the user
   * - The match has status SCHEDULED
   * - There are more than 5 minutes until match start
   *
   * @param betId - The ID of the bet to update
   * @param userId - The authenticated user's ID
   * @param command - The bet update data (picked_result)
   * @returns Result object with success/error information
   */
  async updateBet(betId: number, userId: string, command: UpdateBetCommand): Promise<UpdateBetResult> {
    try {
      // Step 1: Fetch the bet with match data
      const { data: bet, error: fetchError } = await this.supabase
        .from("bets")
        .select(
          `
          *,
          match:matches (
            id,
            match_datetime,
            status
          )
        `
        )
        .eq("id", betId)
        .eq("user_id", userId)
        .single();

      // Handle fetch errors
      if (fetchError) {
        // eslint-disable-next-line no-console
        console.error("Error fetching bet:", fetchError);

        // RLS policy blocks access - bet doesn't exist or doesn't belong to user
        if (fetchError.code === "PGRST116") {
          return {
            success: false,
            error: "Bet not found",
            status: 404,
          };
        }

        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      if (!bet) {
        return {
          success: false,
          error: "Bet not found",
          status: 404,
        };
      }

      // Step 2: Business validation - match status
      const match = bet.match as {
        id: number;
        match_datetime: string;
        status: string;
      };

      if (match.status !== "SCHEDULED") {
        return {
          success: false,
          error: "Cannot modify this bet",
          reason: "Match is not scheduled",
          status: 403,
        };
      }

      // Step 3: Business validation - time until match
      const matchDatetime = new Date(match.match_datetime);
      const now = new Date();
      const timeUntilMatch = matchDatetime.getTime() - now.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeUntilMatch <= fiveMinutesInMs) {
        return {
          success: false,
          error: "Cannot modify this bet",
          reason: "Match starts in less than 5 minutes",
          status: 403,
        };
      }

      // Step 4: Update the bet
      const { data: updatedBet, error: updateError } = await this.supabase
        .from("bets")
        .update({
          picked_result: command.picked_result,
        })
        .eq("id", betId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        // eslint-disable-next-line no-console
        console.error("Error updating bet:", updateError);
        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      if (!updatedBet) {
        // This shouldn't happen after our validation
        return {
          success: false,
          error: "Bet not found",
          status: 404,
        };
      }

      return {
        success: true,
        data: updatedBet,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Unexpected error in updateBet:", error);
      return {
        success: false,
        error: "Internal server error",
        status: 500,
      };
    }
  }

  /**
   * Deletes an existing bet for a user
   *
   * Validates that:
   * - The bet exists and belongs to the user
   * - The match has status SCHEDULED
   * - There are more than 5 minutes until match start
   *
   * @param betId - The ID of the bet to delete
   * @param userId - The authenticated user's ID
   * @returns Result object with success/error information
   */
  async deleteBet(betId: number, userId: string): Promise<DeleteBetResult> {
    try {
      // Step 1: Fetch the bet with match data
      const { data: bet, error: fetchError } = await this.supabase
        .from("bets")
        .select(
          `
          *,
          match:matches (
            id,
            match_datetime,
            status
          )
        `
        )
        .eq("id", betId)
        .eq("user_id", userId)
        .single();

      // Handle fetch errors
      if (fetchError) {
        // eslint-disable-next-line no-console
        console.error("Error fetching bet:", fetchError);

        // RLS policy blocks access - bet doesn't exist or doesn't belong to user
        if (fetchError.code === "PGRST116") {
          return {
            success: false,
            error: "Bet not found",
            status: 404,
          };
        }

        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      if (!bet) {
        return {
          success: false,
          error: "Bet not found",
          status: 404,
        };
      }

      // Step 2: Business validation - match status
      const match = bet.match as {
        id: number;
        match_datetime: string;
        status: string;
      };

      if (match.status !== "SCHEDULED") {
        return {
          success: false,
          error: "Cannot delete this bet",
          reason: "Match is not scheduled",
          status: 403,
        };
      }

      // Step 3: Business validation - time until match
      const matchDatetime = new Date(match.match_datetime);
      const now = new Date();
      const timeUntilMatch = matchDatetime.getTime() - now.getTime();
      const fiveMinutesInMs = 5 * 60 * 1000;

      if (timeUntilMatch <= fiveMinutesInMs) {
        return {
          success: false,
          error: "Cannot delete this bet",
          reason: "Match starts in less than 5 minutes",
          status: 403,
        };
      }

      // Step 4: Delete the bet
      const { error: deleteError } = await this.supabase.from("bets").delete().eq("id", betId).eq("user_id", userId);

      if (deleteError) {
        // eslint-disable-next-line no-console
        console.error("Error deleting bet:", deleteError);
        return {
          success: false,
          error: "Internal server error",
          status: 500,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Unexpected error in deleteBet:", error);
      return {
        success: false,
        error: "Internal server error",
        status: 500,
      };
    }
  }

  /**
   * Retrieves all bets for a specific user with optional filters
   *
   * @param userId - The authenticated user's ID
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of user's bets with match information
   * @throws Error if database operation fails
   */
  async getUserBets(userId: string, params: BetsQueryParams): Promise<PaginatedResponseDTO<BetWithMatchDTO>> {
    const { tournament_id, match_id, limit = 50, offset = 0 } = params;

    // Build base query with match data using nested select
    let query = this.supabase
      .from("bets")
      .select(
        `
        id,
        user_id,
        match_id,
        picked_result,
        created_at,
        updated_at,
        match:matches!inner (
          id,
          tournament_id,
          home_team,
          away_team,
          match_datetime,
          status,
          result,
          home_score,
          away_score
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply optional filters
    if (tournament_id !== undefined) {
      query = query.eq("match.tournament_id", tournament_id);
    }

    if (match_id !== undefined) {
      query = query.eq("match_id", match_id);
    }

    // Apply pagination
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("BetsService.getUserBets failed:", {
        userId,
        params,
        error: error.message,
        code: error.code,
        details: error.details,
      });
      throw new Error("Failed to fetch bets");
    }

    // Calculate pagination metadata
    const total = count ?? 0;
    const has_more = offset + limit < total;

    return {
      data: data as BetWithMatchDTO[],
      pagination: {
        total,
        limit,
        offset,
        has_more,
      },
    };
  }
}
