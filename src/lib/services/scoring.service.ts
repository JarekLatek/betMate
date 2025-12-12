import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { MatchOutcome, ScoreMatchesResponseDTO } from "@/types";

const POINTS_FOR_CORRECT_BET = 3;

interface UnscoredMatch {
  id: number;
  tournament_id: number;
  result: MatchOutcome;
}

interface BetToScore {
  id: number;
  user_id: string;
  picked_result: MatchOutcome;
}

/**
 * Get all finished matches that haven't been scored yet
 */
async function getUnscoredMatches(supabase: SupabaseClient<Database>): Promise<UnscoredMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, tournament_id, result")
    .eq("status", "FINISHED")
    .eq("is_scored", false)
    .not("result", "is", null);

  if (error) {
    throw new Error(`Failed to fetch unscored matches: ${error.message}`);
  }

  return (data || []) as UnscoredMatch[];
}

/**
 * Get all bets for a specific match
 */
async function getBetsForMatch(supabase: SupabaseClient<Database>, matchId: number): Promise<BetToScore[]> {
  const { data, error } = await supabase.from("bets").select("id, user_id, picked_result").eq("match_id", matchId);

  if (error) {
    throw new Error(`Failed to fetch bets for match ${matchId}: ${error.message}`);
  }

  return (data || []) as BetToScore[];
}

/**
 * Update or insert score for a user in a tournament
 */
async function upsertScore(
  supabase: SupabaseClient<Database>,
  userId: string,
  tournamentId: number,
  pointsToAdd: number
): Promise<void> {
  // First try to get existing score
  const { data: existing } = await supabase
    .from("scores")
    .select("points")
    .eq("user_id", userId)
    .eq("tournament_id", tournamentId)
    .single();

  const newPoints = (existing?.points || 0) + pointsToAdd;

  const { error } = await supabase.from("scores").upsert(
    {
      user_id: userId,
      tournament_id: tournamentId,
      points: newPoints,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,tournament_id",
    }
  );

  if (error) {
    throw new Error(`Failed to upsert score for user ${userId}: ${error.message}`);
  }
}

/**
 * Mark a match as scored
 */
async function markMatchAsScored(supabase: SupabaseClient<Database>, matchId: number): Promise<void> {
  const { error } = await supabase.from("matches").update({ is_scored: true }).eq("id", matchId);

  if (error) {
    throw new Error(`Failed to mark match ${matchId} as scored: ${error.message}`);
  }
}

/**
 * Score all unscored finished matches
 * Awards points to users who correctly predicted match results
 */
export async function scoreMatches(
  supabase: SupabaseClient<Database>,
  dryRun = false
): Promise<ScoreMatchesResponseDTO> {
  const response: ScoreMatchesResponseDTO = {
    processed_matches: 0,
    updated_scores: 0,
    errors: [],
  };

  // 1. Get all unscored finished matches
  const unscoredMatches = await getUnscoredMatches(supabase);

  if (unscoredMatches.length === 0) {
    return response;
  }

  // 2. Process each match
  for (const match of unscoredMatches) {
    try {
      // Get all bets for this match
      const bets = await getBetsForMatch(supabase, match.id);

      // Find correct bets and award points
      for (const bet of bets) {
        if (bet.picked_result === match.result) {
          if (!dryRun) {
            await upsertScore(supabase, bet.user_id, match.tournament_id, POINTS_FOR_CORRECT_BET);
          }
          response.updated_scores++;
        }
      }

      // Mark match as scored
      if (!dryRun) {
        await markMatchAsScored(supabase, match.id);
      }

      response.processed_matches++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Unknown error processing match ${match.id}`;
      response.errors.push(errorMessage);
    }
  }

  return response;
}
