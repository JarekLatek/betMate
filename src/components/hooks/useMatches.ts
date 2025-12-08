import { useState, useCallback, useEffect, useRef } from "react";
import { fetchMatches, type MatchFilter, type FetchMatchesParams } from "@/lib/api/matches.api";
import type { MatchDTO } from "@/types";

const DEFAULT_LIMIT = 20;

interface UseMatchesOptions {
  tournamentId?: number | null;
  filter?: MatchFilter;
}

interface UseMatchesReturn {
  matches: MatchDTO[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateMatchLocally: (matchId: number, update: Partial<MatchDTO>) => void;
}

export function useMatches({ tournamentId, filter = "UPCOMING" }: UseMatchesOptions = {}): UseMatchesReturn {
  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const loadMatches = useCallback(
    async (reset = false) => {
      if (!tournamentId) {
        setMatches([]);
        setHasMore(false);
        return;
      }

      const currentOffset = reset ? 0 : offsetRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const params: FetchMatchesParams = {
          tournament_id: tournamentId,
          filter,
          limit: DEFAULT_LIMIT,
          offset: currentOffset,
        };

        const response = await fetchMatches(params);

        if (reset) {
          setMatches(response.data);
        } else {
          setMatches((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.pagination.has_more);
        offsetRef.current = currentOffset + response.data.length;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd ładowania meczów");
      } finally {
        setIsLoading(false);
      }
    },
    [tournamentId, filter]
  );

  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await loadMatches(true);
  }, [loadMatches]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await loadMatches(false);
  }, [isLoading, hasMore, loadMatches]);

  const updateMatchLocally = useCallback((matchId: number, update: Partial<MatchDTO>) => {
    setMatches((prev) => prev.map((match) => (match.id === matchId ? { ...match, ...update } : match)));
  }, []);

  useEffect(() => {
    offsetRef.current = 0;
    setMatches([]);
    setHasMore(true);

    if (tournamentId) {
      loadMatches(true);
    }
  }, [tournamentId, filter, loadMatches]);

  return {
    matches,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
    updateMatchLocally,
  };
}
