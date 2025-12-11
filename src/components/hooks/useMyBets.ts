import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { getBetDisplayStatus, canDeleteBet, calculateBetStats, type BetStatsData } from "@/lib/utils/bet-utils";
import type { BetWithMatchDTO, PaginatedResponseDTO } from "@/types";
import type { BetStatusFilter, BetFilterState, BetWithDisplayStatus } from "@/types/my-bets.types";

const DEFAULT_LIMIT = 20;

interface UseMyBetsOptions {
  initialTournamentId?: number | null;
  initialStatus?: BetStatusFilter;
  limit?: number;
}

interface UseMyBetsReturn {
  // State
  bets: BetWithDisplayStatus[];
  stats: BetStatsData;
  filters: BetFilterState;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  deletingBetId: number | null;

  // Actions
  setFilters: (filters: Partial<BetFilterState>) => void;
  loadMore: () => Promise<void>;
  deleteBet: (betId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMyBets(options: UseMyBetsOptions = {}): UseMyBetsReturn {
  const limit = options.limit ?? DEFAULT_LIMIT;

  const [bets, setBets] = useState<BetWithMatchDTO[]>([]);
  const [filters, setFiltersState] = useState<BetFilterState>({
    tournamentId: options.initialTournamentId ?? null,
    status: options.initialStatus ?? "all",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deletingBetId, setDeletingBetId] = useState<number | null>(null);

  const offsetRef = useRef(0);

  // Fetch bets (initial or after filter change)
  const fetchBets = useCallback(
    async (reset = true) => {
      const currentOffset = reset ? 0 : offsetRef.current;

      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters.tournamentId !== null) {
          params.set("tournament_id", filters.tournamentId.toString());
        }
        params.set("limit", limit.toString());
        params.set("offset", currentOffset.toString());

        const response = await fetch(`/api/me/bets?${params}`);

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error("Nie udało się załadować zakładów");
        }

        const data: PaginatedResponseDTO<BetWithMatchDTO> = await response.json();

        if (reset) {
          setBets(data.data);
        } else {
          setBets((prev) => [...prev, ...data.data]);
        }

        setHasMore(data.pagination.has_more);
        offsetRef.current = currentOffset + data.data.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters.tournamentId, limit]
  );

  // Load more (Load More pattern)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await fetchBets(false);
  }, [isLoadingMore, hasMore, fetchBets]);

  // Effect to fetch bets on filter change
  useEffect(() => {
    offsetRef.current = 0;
    fetchBets(true);
  }, [fetchBets]);

  // Client-side filtering by status
  const filteredBets = useMemo(() => {
    if (filters.status === "all") return bets;

    return bets.filter((bet) => {
      const status = getBetDisplayStatus(bet);
      if (filters.status === "pending") return status === "pending";
      if (filters.status === "resolved") return status === "hit" || status === "miss";
      return true;
    });
  }, [bets, filters.status]);

  // Extend bets with displayStatus and canDelete
  const betsWithStatus: BetWithDisplayStatus[] = useMemo(() => {
    return filteredBets.map((bet) => ({
      ...bet,
      displayStatus: getBetDisplayStatus(bet),
      canDelete: canDeleteBet(bet),
    }));
  }, [filteredBets]);

  // Calculate stats from all bets (not filtered)
  const stats = useMemo(() => calculateBetStats(bets), [bets]);

  // Actions
  const setFilters = useCallback((newFilters: Partial<BetFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    // Reset offset when filters change - fetchBets will be called by useEffect
  }, []);

  const deleteBet = useCallback(
    async (betId: number) => {
      setDeletingBetId(betId);

      try {
        const response = await fetch(`/api/bets/${betId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();

          if (response.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (response.status === 403) {
            throw new Error(data.reason || "Nie można usunąć tego zakładu");
          }
          if (response.status === 404) {
            throw new Error("Zakład nie został znaleziony");
          }

          throw new Error(data.error || "Nie udało się usunąć zakładu");
        }

        // Optimistic update - remove bet from local state
        setBets((prev) => prev.filter((bet) => bet.id !== betId));
        offsetRef.current = Math.max(0, offsetRef.current - 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
        // Refresh list on error
        await fetchBets(true);
      } finally {
        setDeletingBetId(null);
      }
    },
    [fetchBets]
  );

  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchBets(true);
  }, [fetchBets]);

  return {
    bets: betsWithStatus,
    stats,
    filters,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    deletingBetId,
    setFilters,
    loadMore,
    deleteBet,
    refresh,
  };
}
