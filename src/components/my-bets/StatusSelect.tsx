import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BetStatusFilter } from "@/types/my-bets.types";

interface StatusSelectProps {
  value: BetStatusFilter;
  onChange: (status: BetStatusFilter) => void;
  disabled?: boolean;
}

const statusOptions: { value: BetStatusFilter; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "pending", label: "Oczekujące" },
  { value: "resolved", label: "Rozstrzygnięte" },
];

export function StatusSelect({ value, onChange, disabled = false }: StatusSelectProps) {
  const handleValueChange = (newValue: string) => {
    onChange(newValue as BetStatusFilter);
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtruj po statusie">
        <SelectValue placeholder="Status zakładu" />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
