import { LockIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MatchOutcome } from "@/types";

interface BettingControlsProps {
  currentPrediction: MatchOutcome | null;
  isLocked: boolean;
  isLoading?: boolean;
  loadingPrediction?: MatchOutcome | null;
  onSelect: (prediction: MatchOutcome) => void;
}

const BETTING_OPTIONS: { value: MatchOutcome; label: string }[] = [
  { value: "HOME_WIN", label: "1" },
  { value: "DRAW", label: "X" },
  { value: "AWAY_WIN", label: "2" },
];

export function BettingControls({
  currentPrediction,
  isLocked,
  isLoading = false,
  loadingPrediction = null,
  onSelect,
}: BettingControlsProps) {
  if (isLocked) {
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <LockIcon className="size-4" />
          <span>Zakłady zamknięte</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {BETTING_OPTIONS.map((option) => {
        const isSelected = currentPrediction === option.value;
        const isButtonLoading = isLoading && loadingPrediction === option.value;

        return (
          <Button
            key={option.value}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={isLoading}
            onClick={() => onSelect(option.value)}
            className={cn("min-w-[48px]", isSelected && "ring-2 ring-offset-2")}
            aria-pressed={isSelected}
            aria-label={`Obstaw ${option.label}`}
          >
            {isButtonLoading ? <Loader2Icon className="size-4 animate-spin" /> : option.label}
          </Button>
        );
      })}
    </div>
  );
}
