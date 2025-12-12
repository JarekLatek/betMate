import { useState, useCallback, useEffect, useRef } from "react";
import { fetchLeaderboard } from "@/lib/api/leaderboard.api";
import type { LeaderboardEntryDTO, TournamentDTO, PaginationDTO } from "@/types";

const DEFAULT_LIMIT = 100;

interface UseLeaderboardOptions {
  tournamentId: number | null;
  currentUserId: string;
  limit?: number;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntryDTO[];
  tournament: Pick<TournamentDTO, "id" | "name"> | null;
  userEntry: LeaderboardEntryDTO | null;
  pagination: PaginationDTO | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLeaderboard({
  tournamentId,
  currentUserId,
  limit = DEFAULT_LIMIT,
}: UseLeaderboardOptions): UseLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntryDTO[]>([]);
  const [tournament, setTournament] = useState<Pick<TournamentDTO, "id" | "name"> | null>(null);
  const [pagination, setPagination] = useState<PaginationDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);

  // Find current user's entry in the leaderboard
  const userEntry = entries.find((entry) => entry.user_id === currentUserId) ?? null;

  const hasMore = pagination?.has_more ?? false;

  // Fetch leaderboard data
  const fetchData = useCallback(
    async (reset = true) => {
      if (!tournamentId) {
        setEntries([]);
        setTournament(null);
        setPagination(null);
        setError(null);
        return;
      }

      const currentOffset = reset ? 0 : offsetRef.current;

      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await fetchLeaderboard({
          tournamentId,
          limit,
          offset: currentOffset,
        });

        if (reset) {
          setEntries(response.data);
        } else {
          setEntries((prev) => [...prev, ...response.data]);
        }

        setTournament(response.tournament);
        setPagination(response.pagination);
        offsetRef.current = currentOffset + response.data.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [tournamentId, limit]
  );

  // Load more entries
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await fetchData(false);
  }, [isLoadingMore, hasMore, fetchData]);

  // Refresh data
  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchData(true);
  }, [fetchData]);

  // Initial fetch and refetch when tournamentId changes
  useEffect(() => {
    offsetRef.current = 0;
    fetchData(true);
  }, [fetchData]);

  return {
    entries,
    tournament,
    userEntry,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
