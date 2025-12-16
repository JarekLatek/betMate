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
  hit: "border-l-green-500",
  miss: "border-l-red-500",
};

const bgStyles = {
  pending: "bg-muted-foreground",
  hit: "bg-green-500",
  miss: "bg-red-500",
};

export function BetCard({ bet, onDelete, isDeleting = false }: BetCardProps) {
  const handleDelete = () => {
    onDelete(bet.id);
  };

  return (
    <Card
      className={cn(
        "py-0 relative overflow-hidden",
        bet.displayStatus !== "pending" && "border-l-4",
        borderStyles[bet.displayStatus as keyof typeof borderStyles]
      )}
    >
      {/* Delete button na kolorowym pasku po lewej */}
      {bet.canDelete && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center",
            bgStyles[bet.displayStatus]
          )}
        >
          <DeleteBetButton onDelete={handleDelete} isDeleting={isDeleting} />
        </div>
      )}

      <CardContent className={cn("p-4", bet.canDelete && "ml-10")}>
        <div className="flex flex-col gap-4">
          {/* Nagłówek: status z lewej, typ z prawej */}
          <div className="flex justify-between items-center">
            <BetOutcome pickedResult={bet.picked_result} status={bet.displayStatus} showOnlyStatus />
            <BetOutcome pickedResult={bet.picked_result} status={bet.displayStatus} showOnlyPrediction />
          </div>

          {/* Wyśrodkowana informacja o meczu */}
          <div className="flex flex-col items-center text-center">
            <MatchInfo match={bet.match} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
