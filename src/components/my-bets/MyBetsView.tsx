import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { BetStats } from "./BetStats";
import { BetFilters } from "./BetFilters";
import { BetList } from "./BetList";
import { useMyBets } from "@/components/hooks/useMyBets";
import { fetchTournaments } from "@/lib/api/matches.api";
import type { TournamentDTO } from "@/types";
import type { BetStatusFilter } from "@/types/my-bets.types";

interface MyBetsViewProps {
  initialTournaments?: TournamentDTO[];
  initialTournamentId?: number | null;
  initialStatus?: BetStatusFilter;
}

export function MyBetsView({
  initialTournaments = [],
  initialTournamentId = null,
  initialStatus = "all",
}: MyBetsViewProps) {
  const [tournaments, setTournaments] = useState<TournamentDTO[]>(initialTournaments);
  const [tournamentsLoading, setTournamentsLoading] = useState(initialTournaments.length === 0);

  const {
    bets,
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
  } = useMyBets({
    initialTournamentId,
    initialStatus,
  });

  // Load tournaments if not provided
  useEffect(() => {
    if (initialTournaments.length === 0) {
      setTournamentsLoading(true);
      fetchTournaments()
        .then((data) => {
          setTournaments(data);
        })
        .catch(() => {
          toast.error("Nie udało się załadować turniejów");
        })
        .finally(() => {
          setTournamentsLoading(false);
        });
    }
  }, [initialTournaments.length]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.tournamentId) {
      params.set("tournamentId", filters.tournamentId.toString());
    }
    if (filters.status !== "all") {
      params.set("status", filters.status);
    }

    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;

    window.history.replaceState(null, "", newUrl);
  }, [filters]);

  // Handle bet deletion with toast feedback
  const handleDeleteBet = useCallback(
    async (betId: number) => {
      try {
        await deleteBet(betId);
        toast.success("Zakład został usunięty");
      } catch {
        toast.error("Nie udało się usunąć zakładu");
      }
    },
    [deleteBet]
  );

  const hasActiveFilters = filters.tournamentId !== null || filters.status !== "all";

  return (
    <div className="flex min-h-screen flex-col">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <h1 className="mb-4 text-2xl font-bold">Moje zakłady</h1>
          <BetFilters
            tournaments={tournaments}
            currentFilters={filters}
            onFiltersChange={setFilters}
            isLoading={tournamentsLoading || isLoading}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto flex-1 px-4 py-6">
        {/* Stats section */}
        <div className="mb-6">
          <BetStats stats={stats} isLoading={isLoading && bets.length === 0} />
        </div>

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

        {/* Bets list */}
        {!error && (
          <BetList
            bets={bets}
            onDeleteBet={handleDeleteBet}
            onLoadMore={loadMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            deletingBetId={deletingBetId}
            hasFilters={hasActiveFilters}
          />
        )}
      </main>
    </div>
  );
}
