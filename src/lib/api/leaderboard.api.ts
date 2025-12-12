/**
 * Frontend API client for leaderboard
 * Used in React components to communicate with the backend API
 */

import type { LeaderboardResponseDTO } from "@/types";

/**
 * Parameters for fetching leaderboard
 */
export interface FetchLeaderboardParams {
  tournamentId: number;
  limit?: number;
  offset?: number;
}

/**
 * Fetches leaderboard for a specific tournament from the API
 */
export async function fetchLeaderboard(params: FetchLeaderboardParams): Promise<LeaderboardResponseDTO> {
  const { tournamentId, limit = 100, offset = 0 } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("limit", limit.toString());
  searchParams.set("offset", offset.toString());

  const response = await fetch(`/api/tournaments/${tournamentId}/leaderboard?${searchParams.toString()}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/login";
      throw new Error("Wymagane logowanie");
    }

    const error = await response.json();
    throw new Error(error.error || "Nie udało się pobrać rankingu");
  }

  return response.json();
}
