import { TournamentSelector } from "@/components/matches/TournamentSelector";
import { StatusSelect } from "./StatusSelect";
import type { TournamentDTO } from "@/types";
import type { BetFilterState } from "@/types/my-bets.types";

interface BetFiltersProps {
  tournaments: TournamentDTO[];
  currentFilters: BetFilterState;
  onFiltersChange: (filters: Partial<BetFilterState>) => void;
  isLoading?: boolean;
}

export function BetFilters({ tournaments, currentFilters, onFiltersChange, isLoading = false }: BetFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <TournamentSelector
        tournaments={tournaments}
        selectedId={currentFilters.tournamentId}
        onSelect={(id) => onFiltersChange({ tournamentId: id })}
        disabled={isLoading}
        allowAll
        placeholder="Wszystkie turnieje"
      />
      <StatusSelect
        value={currentFilters.status}
        onChange={(status) => onFiltersChange({ status })}
        disabled={isLoading}
      />
    </div>
  );
}
