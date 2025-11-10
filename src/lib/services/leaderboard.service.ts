import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { LeaderboardEntryDTO, LeaderboardResponseDTO, TournamentDTO } from "@/types";

/**
 * Get tournament by ID
 * @returns Tournament data or null if not found
 */
async function getTournamentById(
  supabase: SupabaseClient<Database>,
  tournamentId: number
): Promise<Pick<TournamentDTO, "id" | "name"> | null> {
  const { data, error } = await supabase.from("tournaments").select("id, name").eq("id", tournamentId).single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get total count of participants in tournament
 */
async function getTotalParticipants(supabase: SupabaseClient<Database>, tournamentId: number): Promise<number> {
  const { count, error } = await supabase
    .from("scores")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (error) {
    throw new Error("Failed to count participants");
  }

  return count ?? 0;
}

/**
 * Calculate ranks for leaderboard entries
 * Users with same points share the same rank
 */
function calculateRanks(entries: { user_id: string; username: string; points: number }[]): LeaderboardEntryDTO[] {
  if (entries.length === 0) return [];

  const ranked: LeaderboardEntryDTO[] = [];
  let currentRank = 1;
  let previousPoints: number | null = null;

  entries.forEach((entry, index) => {
    // If points are different from previous, update rank to current position
    if (previousPoints !== null && entry.points !== previousPoints) {
      currentRank = index + 1;
    }

    ranked.push({
      rank: currentRank,
      user_id: entry.user_id,
      username: entry.username,
      points: entry.points,
    });

    previousPoints = entry.points;
  });

  return ranked;
}

/**
 * Get leaderboard for a tournament
 * @throws Error if database operation fails
 */
export async function getLeaderboard(
  supabase: SupabaseClient<Database>,
  tournamentId: number,
  limit: number,
  offset: number
): Promise<LeaderboardResponseDTO> {
  // Step 1: Check if tournament exists
  const tournament = await getTournamentById(supabase, tournamentId);
  if (!tournament) {
    throw new Error("TOURNAMENT_NOT_FOUND");
  }

  // Step 2: Get total count for pagination
  const total = await getTotalParticipants(supabase, tournamentId);

  // Step 3: Fetch leaderboard entries with pagination
  const { data: scores, error } = await supabase
    .from("scores")
    .select("user_id, points, profiles!inner(username)")
    .eq("tournament_id", tournamentId)
    .order("points", { ascending: false })
    .order("profiles.username", { ascending: true }) // Secondary sort for consistency
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error("Failed to fetch leaderboard");
  }

  // Step 4: Transform data and calculate ranks
  const entries = scores.map(
    (score: { user_id: string; points: number; profiles: { username: string } | { username: string }[] }) => ({
      user_id: score.user_id,
      username: Array.isArray(score.profiles) ? score.profiles[0].username : score.profiles.username,
      points: score.points,
    })
  );

  const rankedEntries = calculateRanks(entries);

  // Step 5: Build response
  return {
    data: rankedEntries,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + limit < total,
    },
    tournament: {
      id: tournament.id,
      name: tournament.name,
    },
  };
}
