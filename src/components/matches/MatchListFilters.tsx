import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MatchFilter } from "@/lib/api/matches.api";

interface MatchListFiltersProps {
  activeFilter: MatchFilter;
  onChange: (filter: MatchFilter) => void;
  disabled?: boolean;
}

export function MatchListFilters({ activeFilter, onChange, disabled = false }: MatchListFiltersProps) {
  return (
    <Tabs value={activeFilter} onValueChange={(value) => onChange(value as MatchFilter)}>
      <TabsList>
        <TabsTrigger value="UPCOMING" disabled={disabled}>
          Nadchodzące
        </TabsTrigger>
        <TabsTrigger value="FINISHED" disabled={disabled}>
          Zakończone
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
