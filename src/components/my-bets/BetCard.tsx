import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchInfo } from "./MatchInfo";
import { BetOutcome } from "./BetOutcome";
import { DeleteBetButton } from "./DeleteBetButton";
import type { BetWithDisplayStatus } from "@/types/my-bets.types";

interface BetCardProps {
  bet: BetWithDisplayStatus;
  onDelete: (betId: number) => void;
  isDeleting?: boolean;
}

const borderStyles = {
  pending: "border-l-muted-foreground",
  hit: "border-l-green-500",
  miss: "border-l-red-500",
};

export function BetCard({ bet, onDelete, isDeleting = false }: BetCardProps) {
  const handleDelete = () => {
    onDelete(bet.id);
  };

  return (
    <Card className={cn("border-l-4", borderStyles[bet.displayStatus])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <MatchInfo match={bet.match} />
          </div>
          <div className="flex items-start gap-2">
            <BetOutcome pickedResult={bet.picked_result} status={bet.displayStatus} />
            {bet.canDelete && <DeleteBetButton onDelete={handleDelete} isDeleting={isDeleting} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
