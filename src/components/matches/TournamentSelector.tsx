import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TournamentDTO } from "@/types";

interface TournamentSelectorProps {
  tournaments: TournamentDTO[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  disabled?: boolean;
  /** If true, adds "Wszystkie turnieje" option at the top */
  allowAll?: boolean;
  /** Placeholder text when no tournament is selected */
  placeholder?: string;
}

const ALL_TOURNAMENTS_VALUE = "__all__";

export function TournamentSelector({
  tournaments,
  selectedId,
  onSelect,
  disabled = false,
  allowAll = false,
  placeholder = "Wybierz turniej",
}: TournamentSelectorProps) {
  const handleValueChange = (value: string) => {
    if (value === ALL_TOURNAMENTS_VALUE) {
      onSelect(null);
    } else {
      onSelect(Number(value));
    }
  };

  const selectValue = selectedId === null ? (allowAll ? ALL_TOURNAMENTS_VALUE : "") : selectedId.toString();

  return (
    <Select value={selectValue} onValueChange={handleValueChange} disabled={disabled || tournaments.length === 0}>
      <SelectTrigger className="w-full sm:w-[240px]" aria-label="Wybierz turniej">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value={ALL_TOURNAMENTS_VALUE}>Wszystkie turnieje</SelectItem>}
        {tournaments.map((tournament) => (
          <SelectItem key={tournament.id} value={tournament.id.toString()}>
            {tournament.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
