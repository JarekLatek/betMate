import type { LeaderboardEntryDTO, TournamentDTO } from "@/types";

/**
 * Props for the main LeaderboardView component
 */
export interface LeaderboardViewProps {
  initialTournaments?: TournamentDTO[];
  initialTournamentId?: number | null;
  currentUserId: string;
}

/**
 * Props for the LeaderboardTable component
 */
export interface LeaderboardTableProps {
  entries: LeaderboardEntryDTO[];
  currentUserId: string;
  isLoading?: boolean;
}

/**
 * Props for the LeaderboardRow component
 */
export interface LeaderboardRowProps {
  entry: LeaderboardEntryDTO;
  isCurrentUser: boolean;
}

/**
 * Props for the StickyUserRow component
 */
export interface StickyUserRowProps {
  userEntry: LeaderboardEntryDTO | null;
  isVisible: boolean;
}

/**
 * Props for the LoadMoreButton component
 */
export interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
}
