import { StatCard } from "./StatCard";
import type { BetStatsData } from "@/lib/utils/bet-utils";

interface BetStatsProps {
  stats: BetStatsData;
  isLoading?: boolean;
}

export function BetStats({ stats, isLoading = false }: BetStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Trafienia" value={stats.hits} variant="success" isLoading={isLoading} />
      <StatCard label="Pudła" value={stats.misses} variant="error" isLoading={isLoading} />
      <StatCard label="Skuteczność" value={`${stats.hitRate}%`} variant="neutral" isLoading={isLoading} />
    </div>
  );
}
