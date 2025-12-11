/**
 * Type definitions for My Bets view
 * ViewModel types specific to the /my-bets page
 */

import type { BetWithMatchDTO } from "@/types";
import type { BetDisplayStatus, BetStatsData } from "@/lib/utils/bet-utils";

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filter for bet status in the UI
 */
export type BetStatusFilter = "all" | "pending" | "resolved";

/**
 * Current filter state
 */
export interface BetFilterState {
  tournamentId: number | null; // null = all tournaments
  status: BetStatusFilter;
}

// ============================================================================
// Extended Bet Type
// ============================================================================

/**
 * Bet with computed display status and delete permission
 */
export interface BetWithDisplayStatus extends BetWithMatchDTO {
  displayStatus: BetDisplayStatus;
  canDelete: boolean;
}

// ============================================================================
// View Model Types
// ============================================================================

/**
 * Complete view model for My Bets page
 */
export interface MyBetsViewModel {
  bets: BetWithMatchDTO[];
  stats: BetStatsData;
  filters: BetFilterState;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  deletingBetId: number | null;
}

// Re-export for convenience
export type { BetDisplayStatus, BetStatsData };
