import { BellRing, Trophy } from "lucide-react";
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
        <TabsTrigger value="UPCOMING" disabled={disabled} data-testid="filter-upcoming">
          <BellRing className="mr-2 h-4 w-4" />
          Nadchodzące
        </TabsTrigger>
        <TabsTrigger value="FINISHED" disabled={disabled} data-testid="filter-finished">
          <Trophy className="mr-2 h-4 w-4" />
          Zakończone
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
