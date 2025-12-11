/**
 * Utility functions for bet-related operations
 * Shared between MatchResult and MyBets components
 */

import type { MatchOutcome, BetWithMatchDTO } from "@/types";

// ============================================================================
// Result Label Functions (extracted from MatchResult.tsx)
// ============================================================================

/**
 * Maps match outcome to short label (1/X/2)
 */
export function getResultLabel(result: MatchOutcome): string {
  switch (result) {
    case "HOME_WIN":
      return "1";
    case "DRAW":
      return "X";
    case "AWAY_WIN":
      return "2";
  }
}

/**
 * Maps match outcome to human-readable description
 */
export function getResultDescription(result: MatchOutcome): string {
  switch (result) {
    case "HOME_WIN":
      return "Wygrana gospodarzy";
    case "DRAW":
      return "Remis";
    case "AWAY_WIN":
      return "Wygrana gości";
  }
}

// ============================================================================
// Bet Display Status Functions
// ============================================================================

/**
 * Display status for a bet
 */
export type BetDisplayStatus = "pending" | "hit" | "miss";

/**
 * Calculates the display status for a bet based on match result
 */
export function getBetDisplayStatus(bet: BetWithMatchDTO): BetDisplayStatus {
  const match = bet.match;

  // Match not played yet - pending
  if (match.status === "SCHEDULED") {
    return "pending";
  }

  // Match played but no result yet (edge case)
  if (match.result === null) {
    return "pending";
  }

  // Compare prediction with actual result
  return bet.picked_result === match.result ? "hit" : "miss";
}

/**
 * Checks if a bet can be deleted
 * Bet can be deleted only if:
 * 1. Match status is SCHEDULED
 * 2. Match starts in more than 5 minutes
 */
export function canDeleteBet(bet: BetWithMatchDTO): boolean {
  const match = bet.match;

  if (match.status !== "SCHEDULED") {
    return false;
  }

  const matchDatetime = new Date(match.match_datetime);
  const now = new Date();
  const fiveMinutesInMs = 5 * 60 * 1000;

  return matchDatetime.getTime() - now.getTime() > fiveMinutesInMs;
}

// ============================================================================
// Stats Calculation Functions
// ============================================================================

/**
 * Statistics data for user's bets
 */
export interface BetStatsData {
  totalBets: number;
  hits: number;
  misses: number;
  pending: number;
  hitRate: number; // 0-100 percentage
}

/**
 * Calculates statistics from a list of bets
 */
export function calculateBetStats(bets: BetWithMatchDTO[]): BetStatsData {
  const stats: BetStatsData = {
    totalBets: bets.length,
    hits: 0,
    misses: 0,
    pending: 0,
    hitRate: 0,
  };

  for (const bet of bets) {
    const status = getBetDisplayStatus(bet);
    if (status === "hit") stats.hits++;
    else if (status === "miss") stats.misses++;
    else stats.pending++;
  }

  const resolved = stats.hits + stats.misses;
  stats.hitRate = resolved > 0 ? Math.round((stats.hits / resolved) * 100) : 0;

  return stats;
}
