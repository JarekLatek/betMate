/**
 * Type definitions for DTOs (Data Transfer Objects) and Command Models
 * These types represent the data structures exchanged between the API and clients
 * All types are derived from the database schema in database.types.ts
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/db/database.types";

// ============================================================================
// Base Entity Types (Direct mappings from database tables)
// ============================================================================

/**
 * Tournament entity representing a football competition
 * Source: Tables<"tournaments">
 */
export type TournamentDTO = Tables<"tournaments">;

/**
 * Match entity representing a single football match
 * Source: Tables<"matches">
 */
export type MatchEntity = Tables<"matches">;

/**
 * Bet entity representing a user's prediction for a match
 * Source: Tables<"bets">
 */
export type BetEntity = Tables<"bets">;

/**
 * Profile entity representing a user's public information
 * Source: Tables<"profiles">
 */
export type ProfileDTO = Tables<"profiles">;

/**
 * Score entity representing a user's points in a tournament
 * Source: Tables<"scores">
 */
export type ScoreEntity = Tables<"scores">;

// ============================================================================
// Enum Types (Direct mappings from database enums)
// ============================================================================

/**
 * Possible outcomes of a match
 */
export type MatchOutcome = Enums<"match_outcome">;

/**
 * Possible statuses of a match
 */
export type MatchStatus = Enums<"match_status">;

// ============================================================================
// Match DTOs (with computed/joined fields)
// ============================================================================

/**
 * Simplified bet information embedded in match responses
 * Contains only the essential bet details without full entity data
 */
export type BetDTO = Pick<BetEntity, "id" | "picked_result" | "created_at" | "updated_at">;

/**
 * Match DTO with optional user bet information
 * Used in match list endpoints (GET /api/matches)
 */
export type MatchDTO = MatchEntity & {
  /**
   * User's bet on this match (if exists)
   * Only present for authenticated user's own bets
   */
  user_bet: BetDTO | null;
};

/**
 * Detailed match DTO with additional computed fields
 * Used in single match endpoint (GET /api/matches/:id)
 */
export type MatchDetailDTO = MatchDTO & {
  /**
   * Whether the user can currently place/modify a bet on this match
   * Computed based on match status and time remaining
   */
  can_bet: boolean;

  /**
   * ISO 8601 timestamp when betting closes (5 minutes before match start)
   */
  betting_closes_at: string;
};

/**
 * Match information subset for embedding in bet responses
 * Contains only the essential match details needed when viewing bets
 */
export type MatchSummaryDTO = Pick<
  MatchEntity,
  "id" | "tournament_id" | "home_team" | "away_team" | "match_datetime" | "status" | "result" | "home_score" | "away_score"
>;

/**
 * Bet with associated match information
 * Used in user bets endpoint (GET /api/me/bets)
 */
export type BetWithMatchDTO = BetEntity & {
  /**
   * Summary of the match this bet is for
   */
  match: MatchSummaryDTO;
};

// ============================================================================
// Leaderboard DTOs
// ============================================================================

/**
 * Single entry in a tournament leaderboard
 * Combines user profile and score information with computed rank
 */
export interface LeaderboardEntryDTO {
  /**
   * Position in the leaderboard (1-based)
   * Users with equal points share the same rank
   */
  rank: number;

  /**
   * User's unique identifier
   */
  user_id: string;

  /**
   * User's public username
   */
  username: string;

  /**
   * Total points earned in this tournament
   */
  points: number;
}

/**
 * Tournament statistics for a user profile
 * Shows performance across different tournaments
 */
export interface ProfileStatsDTO {
  /**
   * Tournament identifier
   */
  tournament_id: number;

  /**
   * Tournament name
   */
  tournament_name: string;

  /**
   * Points earned in this tournament
   */
  points: number;

  /**
   * Current rank in this tournament
   */
  rank: number;
}

/**
 * Public profile with tournament statistics
 * Used in profile view endpoint (GET /api/profiles/:username)
 */
export type PublicProfileDTO = ProfileDTO & {
  /**
   * User's statistics across all tournaments
   */
  stats: ProfileStatsDTO[];
};

// ============================================================================
// Command Models (Request DTOs for mutations)
// ============================================================================

/**
 * Command to create a new bet
 * Used in: POST /api/bets
 *
 * Note: user_id is automatically set from authenticated session
 */
export type CreateBetCommand = Pick<TablesInsert<"bets">, "match_id" | "picked_result">;

/**
 * Command to update an existing bet
 * Used in: PUT /api/bets/:id
 *
 * Only the prediction can be modified; match_id and user_id are immutable
 */
export type UpdateBetCommand = Pick<TablesUpdate<"bets">, "picked_result">;

/**
 * Command to create a new tournament (Admin only)
 * Used in: POST /api/admin/tournaments
 */
export type CreateTournamentCommand = Pick<TablesInsert<"tournaments">, "name" | "api_tournament_id">;

/**
 * Command to create a new match (Admin only)
 * Used in: POST /api/admin/matches
 */
export type CreateMatchCommand = Pick<
  TablesInsert<"matches">,
  "tournament_id" | "home_team" | "away_team" | "match_datetime" | "status" | "api_match_id"
>;

/**
 * Command to update match details (Admin only)
 * Used in: PUT /api/admin/matches/:id
 *
 * Typically used to update match status, result, and scoring flag
 */
export type UpdateMatchCommand = Pick<TablesUpdate<"matches">, "status" | "result" | "is_scored">;

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination metadata for list endpoints
 */
export interface PaginationDTO {
  /**
   * Total number of items available (across all pages)
   */
  total: number;

  /**
   * Number of items per page (as requested)
   */
  limit: number;

  /**
   * Number of items skipped (page offset)
   */
  offset: number;

  /**
   * Whether there are more items beyond the current page
   */
  has_more: boolean;
}

/**
 * Generic wrapper for paginated API responses
 * @template T - The type of items in the data array
 */
export interface PaginatedResponseDTO<T> {
  /**
   * Array of items for the current page
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: PaginationDTO;
}

/**
 * Leaderboard response with tournament context
 * Extends PaginatedResponseDTO with tournament information
 */
export type LeaderboardResponseDTO = PaginatedResponseDTO<LeaderboardEntryDTO> & {
  /**
   * Tournament information for context
   */
  tournament: Pick<TournamentDTO, "id" | "name">;
};

// ============================================================================
// API Response Wrappers
// ============================================================================

/**
 * Standard success response wrapper for single resources
 * @template T - The type of the resource data
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  /**
   * Human-readable error message
   */
  error: string;

  /**
   * Optional validation error details
   */
  details?: {
    path: string[];
    message: string;
  }[];

  /**
   * Optional machine-readable error code
   */
  code?: string;

  /**
   * Optional additional context (e.g., "reason" for 403 errors)
   */
  reason?: string;
}

/**
 * Simple message response for operations without data
 * Used for DELETE operations and similar
 */
export interface MessageResponse {
  message: string;
}

// ============================================================================
// Query Parameter Types
// ============================================================================

/**
 * Query parameters for match list endpoint
 * Used in: GET /api/matches
 */
export interface MatchesQueryParams {
  tournament_id?: number;
  status?: MatchStatus;
  from_date?: string; // ISO 8601
  to_date?: string; // ISO 8601
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for user bets endpoint
 * Used in: GET /api/me/bets
 */
export interface BetsQueryParams {
  tournament_id?: number;
  match_id?: number;
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for leaderboard endpoint
 * Used in: GET /api/tournaments/:tournament_id/leaderboard
 */
export interface LeaderboardQueryParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Admin Types
// ============================================================================

/**
 * Request body for manual scoring trigger (Admin only)
 * Used in: POST /api/admin/score-matches
 */
export interface ScoreMatchesCommand {
  /**
   * If true, simulate scoring without committing changes
   */
  dry_run: boolean;
}

/**
 * Response from scoring operation
 * Used in: POST /api/admin/score-matches response
 */
export interface ScoreMatchesResponseDTO {
  /**
   * Number of matches processed
   */
  processed_matches: number;

  /**
   * Number of score records updated
   */
  updated_scores: number;

  /**
   * Array of error messages for failed operations
   */
  errors: string[];
}
