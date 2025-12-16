import { ClockIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getResultLabel, getResultDescription, type BetDisplayStatus } from "@/lib/utils/bet-utils";
import type { MatchOutcome } from "@/types";

interface BetOutcomeProps {
  pickedResult: MatchOutcome;
  status: BetDisplayStatus;
  showOnlyStatus?: boolean;
  showOnlyPrediction?: boolean;
}

const statusConfig: Record<
  BetDisplayStatus,
  {
    label: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
  }
> = {
  pending: {
    label: "Oczekujący",
    badgeClass: "bg-muted text-muted-foreground",
    icon: ClockIcon,
    iconClass: "text-muted-foreground",
  },
  hit: {
    label: "Trafiony",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    icon: CheckCircleIcon,
    iconClass: "text-green-500",
  },
  miss: {
    label: "Pudło",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    icon: XCircleIcon,
    iconClass: "text-red-500",
  },
};

export function BetOutcome({
  pickedResult,
  status,
  showOnlyStatus = false,
  showOnlyPrediction = false,
}: BetOutcomeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  // Pokaż tylko status (lewa strona)
  if (showOnlyStatus) {
    return (
      <div className="flex items-center gap-1">
        <Icon className={cn("size-4", config.iconClass)} />
        <span className={cn("text-sm", config.iconClass)}>{config.label}</span>
      </div>
    );
  }

  // Pokaż tylko obstawienie (prawa strona)
  if (showOnlyPrediction) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-sm">Twój typ:</span>
        <Badge variant="outline" className="text-base font-bold" title={getResultDescription(pickedResult)}>
          {getResultLabel(pickedResult)}
        </Badge>
      </div>
    );
  }

  // Domyślnie pokaż wszystko (dla kompatybilności wstecznej)
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">Twój typ:</span>
        <Badge variant="outline" className="text-base font-bold" title={getResultDescription(pickedResult)}>
          {getResultLabel(pickedResult)}
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <Icon className={cn("size-4", config.iconClass)} />
        <span className={cn("text-xs", config.iconClass)}>{config.label}</span>
      </div>
    </div>
  );
}
