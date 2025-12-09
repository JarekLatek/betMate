/**
 * Frontend API client for matches and bets
 * Used in React components to communicate with the backend API
 */

import type { MatchDTO, TournamentDTO, PaginatedResponseDTO, CreateBetCommand, BetDTO } from "@/types";

/**
 * Filter type for match list (maps to API status parameter)
 */
export type MatchFilter = "UPCOMING" | "FINISHED";

/**
 * Parameters for fetching matches
 */
export interface FetchMatchesParams {
  tournament_id?: number;
  filter?: MatchFilter;
  limit?: number;
  offset?: number;
}

/**
 * API error response structure
 */
export interface ApiError {
  error: string;
  reason?: string;
  code?: string;
}

/**
 * Result type for API operations
 */
export type ApiResult<T> = { success: true; data: T } | { success: false; error: ApiError };

/**
 * Fetches paginated list of matches from the API
 */
export async function fetchMatches(params: FetchMatchesParams = {}): Promise<PaginatedResponseDTO<MatchDTO>> {
  const searchParams = new URLSearchParams();

  if (params.tournament_id) {
    searchParams.set("tournament_id", params.tournament_id.toString());
  }

  if (params.filter) {
    searchParams.set("filter", params.filter);
  }

  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  if (params.offset) {
    searchParams.set("offset", params.offset.toString());
  }

  const response = await fetch(`/api/matches?${searchParams.toString()}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch matches");
  }

  return response.json();
}

/**
 * Fetches all available tournaments from the API
 */
export async function fetchTournaments(): Promise<TournamentDTO[]> {
  const response = await fetch("/api/tournaments", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch tournaments");
  }

  const result = await response.json();
  return result.data;
}

/**
 * Creates a new bet or updates existing one (upsert)
 */
export async function placeBet(command: CreateBetCommand): Promise<ApiResult<BetDTO>> {
  const response = await fetch("/api/bets", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    return { success: false, error };
  }

  const result = await response.json();
  return { success: true, data: result.data };
}

/**
 * Updates an existing bet
 */
export async function updateBet(
  betId: number,
  pickedResult: "HOME_WIN" | "DRAW" | "AWAY_WIN"
): Promise<ApiResult<BetDTO>> {
  const response = await fetch(`/api/bets/${betId}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ picked_result: pickedResult }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    return { success: false, error };
  }

  const result = await response.json();
  return { success: true, data: result.data };
}
