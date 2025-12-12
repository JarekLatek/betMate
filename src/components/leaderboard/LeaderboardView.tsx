import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TournamentSelector } from "@/components/matches/TournamentSelector";
import { LeaderboardTable } from "./LeaderboardTable";
import { StickyUserRow } from "./StickyUserRow";
import { LoadMoreButton } from "./LoadMoreButton";
import { useLeaderboard } from "@/components/hooks/useLeaderboard";
import { fetchTournaments } from "@/lib/api/matches.api";
import type { TournamentDTO } from "@/types";
import type { LeaderboardViewProps } from "./types";

export function LeaderboardView({
  initialTournaments = [],
  initialTournamentId = null,
  currentUserId,
}: LeaderboardViewProps) {
  const [tournaments, setTournaments] = useState<TournamentDTO[]>(initialTournaments);
  const [tournamentsLoading, setTournamentsLoading] = useState(initialTournaments.length === 0);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(() => {
    // Use initial tournament ID if provided, otherwise use first tournament
    if (initialTournamentId !== null) return initialTournamentId;
    if (initialTournaments.length > 0) return initialTournaments[0].id;
    return null;
  });
  const [isUserRowVisible, setIsUserRowVisible] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { entries, tournament, userEntry, isLoading, isLoadingMore, error, hasMore, loadMore, refresh } =
    useLeaderboard({
      tournamentId: selectedTournamentId,
      currentUserId,
    });

  // Load tournaments if not provided
  useEffect(() => {
    if (initialTournaments.length === 0) {
      setTournamentsLoading(true);
      fetchTournaments()
        .then((data) => {
          setTournaments(data);
          // Select first tournament if none selected
          if (selectedTournamentId === null && data.length > 0) {
            setSelectedTournamentId(data[0].id);
          }
        })
        .catch(() => {
          toast.error("Nie udało się załadować turniejów");
        })
        .finally(() => {
          setTournamentsLoading(false);
        });
    }
  }, [initialTournaments.length, selectedTournamentId]);

  // Sync selected tournament with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedTournamentId) {
      params.set("tournamentId", selectedTournamentId.toString());
    }

    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;

    window.history.replaceState(null, "", newUrl);
  }, [selectedTournamentId]);

  // Check if user's row is visible in the table
  useEffect(() => {
    if (!userEntry || !tableRef.current) {
      setIsUserRowVisible(false);
      return;
    }

    const userRowElement = tableRef.current.querySelector(`tr[data-user-id="${userEntry.user_id}"]`);
    if (!userRowElement) {
      setIsUserRowVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsUserRowVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(userRowElement);

    return () => {
      observer.disconnect();
    };
  }, [userEntry, entries]);

  const handleTournamentChange = useCallback((id: number | null) => {
    if (id !== null) {
      setSelectedTournamentId(id);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <h1 className="mb-4 text-2xl font-bold">Ranking</h1>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TournamentSelector
              tournaments={tournaments}
              selectedId={selectedTournamentId}
              onSelect={handleTournamentChange}
              disabled={tournamentsLoading || isLoading}
              placeholder="Wybierz turniej"
            />
            {tournament && (
              <span className="text-muted-foreground text-sm">
                {entries.length > 0 && `${entries.length} uczestników`}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto flex-1 px-4 py-6">
        {/* No tournaments state */}
        {!tournamentsLoading && tournaments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Brak dostępnych turniejów</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircleIcon className="text-destructive size-8" />
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button variant="outline" onClick={refresh} className="mt-4">
              <RefreshCwIcon className="mr-2 size-4" />
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {/* Leaderboard table */}
        {!error && tournaments.length > 0 && (
          <div ref={tableRef}>
            <LeaderboardTable entries={entries} currentUserId={currentUserId} isLoading={isLoading} />

            <LoadMoreButton onClick={loadMore} isLoading={isLoadingMore} hasMore={hasMore} />
          </div>
        )}
      </main>

      {/* Sticky user row */}
      <StickyUserRow userEntry={userEntry} isVisible={isUserRowVisible} />
    </div>
  );
}
