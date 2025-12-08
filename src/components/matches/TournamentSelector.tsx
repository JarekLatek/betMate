import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TournamentDTO } from "@/types";

interface TournamentSelectorProps {
  tournaments: TournamentDTO[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  disabled?: boolean;
}

export function TournamentSelector({ tournaments, selectedId, onSelect, disabled = false }: TournamentSelectorProps) {
  const handleValueChange = (value: string) => {
    onSelect(Number(value));
  };

  return (
    <Select
      value={selectedId?.toString() ?? ""}
      onValueChange={handleValueChange}
      disabled={disabled || tournaments.length === 0}
    >
      <SelectTrigger className="w-full sm:w-[240px]" aria-label="Wybierz turniej">
        <SelectValue placeholder="Wybierz turniej" />
      </SelectTrigger>
      <SelectContent>
        {tournaments.map((tournament) => (
          <SelectItem key={tournament.id} value={tournament.id.toString()}>
            {tournament.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
