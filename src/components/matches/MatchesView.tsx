import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Loader2Icon, AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { TournamentSelector } from "./TournamentSelector";
import { MatchListFilters } from "./MatchListFilters";
import { MatchCard } from "./MatchCard";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useMatches } from "@/components/hooks/useMatches";
import { useBetting } from "@/components/hooks/useBetting";
import { fetchTournaments, type MatchFilter } from "@/lib/api/matches.api";
import type { TournamentDTO, MatchDTO, MatchOutcome } from "@/types";

interface MatchesViewProps {
  initialTournaments?: TournamentDTO[];
}

export function MatchesView({ initialTournaments = [] }: MatchesViewProps) {
  const [tournaments, setTournaments] = useState<TournamentDTO[]>(initialTournaments);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(
    initialTournaments.length > 0 ? initialTournaments[0].id : null
  );
  const [filter, setFilter] = useState<MatchFilter>("UPCOMING");
  const [tournamentsLoading, setTournamentsLoading] = useState(initialTournaments.length === 0);

  const { matches, isLoading, error, hasMore, loadMore, refresh, updateMatchLocally } = useMatches({
    tournamentId: selectedTournamentId,
    filter,
  });

  const { placeBetOnMatch, loadingState } = useBetting({
    updateMatchLocally,
    onSuccess: () => {
      toast.success("Zakład zapisany!");
    },
    onError: (_matchId, errorMessage) => {
      toast.error(errorMessage || "Nie udało się zapisać zakładu");
    },
  });

  // Load tournaments if not provided
  useEffect(() => {
    if (initialTournaments.length === 0) {
      setTournamentsLoading(true);
      fetchTournaments()
        .then((data) => {
          setTournaments(data);
          if (data.length > 0) {
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
  }, [initialTournaments.length]);

  const handleTournamentChange = useCallback((id: number) => {
    setSelectedTournamentId(id);
  }, []);

  const handleFilterChange = useCallback((newFilter: MatchFilter) => {
    setFilter(newFilter);
  }, []);

  const handleBet = useCallback(
    async (match: MatchDTO, prediction: MatchOutcome) => {
      await placeBetOnMatch(match, prediction);
    },
    [placeBetOnMatch]
  );

  const handleMatchBet = useCallback(
    (matchId: number, prediction: MatchOutcome) => {
      const match = matches.find((m) => m.id === matchId);
      if (match) {
        return handleBet(match, prediction);
      }
      return Promise.resolve();
    },
    [matches, handleBet]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TournamentSelector
              tournaments={tournaments}
              selectedId={selectedTournamentId}
              onSelect={handleTournamentChange}
              disabled={tournamentsLoading || isLoading}
            />
            <MatchListFilters activeFilter={filter} onChange={handleFilterChange} disabled={isLoading} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto flex-1 px-4 py-6">
        {/* Loading state for tournaments */}
        {tournamentsLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2Icon className="text-muted-foreground size-8 animate-spin" />
            <p className="text-muted-foreground mt-2">Ładowanie turniejów...</p>
          </div>
        )}

        {/* No tournament selected */}
        {!tournamentsLoading && !selectedTournamentId && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Wybierz turniej, aby zobaczyć mecze</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircleIcon className="size-8 text-destructive" />
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button variant="outline" onClick={refresh} className="mt-4">
              <RefreshCwIcon className="mr-2 size-4" />
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {/* Matches list */}
        {!error && selectedTournamentId && (
          <>
            {isLoading && matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2Icon className="text-muted-foreground size-8 animate-spin" />
                <p className="text-muted-foreground mt-2">Ładowanie meczów...</p>
              </div>
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  {filter === "UPCOMING" ? "Brak nadchodzących meczów" : "Brak zakończonych meczów"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onBet={handleMatchBet}
                      isLoading={loadingState.matchId === match.id}
                      loadingPrediction={loadingState.matchId === match.id ? loadingState.prediction : null}
                    />
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2Icon className="mr-2 size-4 animate-spin" />
                          Ładowanie...
                        </>
                      ) : (
                        "Załaduj więcej"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
