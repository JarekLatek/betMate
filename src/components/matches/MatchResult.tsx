import { CheckCircleIcon, XCircleIcon, MinusCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getResultLabel, getResultDescription } from "@/lib/utils/bet-utils";
import type { MatchOutcome } from "@/types";

interface MatchResultProps {
  userPrediction: MatchOutcome | null;
  actualResult: MatchOutcome | null;
  homeScore: number | null;
  awayScore: number | null;
}

export function MatchResult({ userPrediction, actualResult, homeScore, awayScore }: MatchResultProps) {
  const hasResult = actualResult !== null;
  const hasScore = homeScore !== null && awayScore !== null;
  const hasPrediction = userPrediction !== null;
  const isCorrect = hasPrediction && userPrediction === actualResult;

  return (
    <div className="flex flex-col items-center gap-2">
      {hasResult ? (
        <div className="flex flex-col items-center gap-1">
          {hasScore ? (
            <div className="bg-muted flex items-center justify-center rounded-lg px-3 py-1.5 text-xl font-bold tabular-nums">
              {homeScore} : {awayScore}
            </div>
          ) : (
            <div className="bg-muted flex size-10 items-center justify-center rounded-full text-xl font-bold">
              {getResultLabel(actualResult)}
            </div>
          )}
          <span className="text-muted-foreground text-xs">{getResultDescription(actualResult)}</span>
        </div>
      ) : (
        <div className="text-muted-foreground text-sm">Brak wyniku</div>
      )}

      {hasPrediction && hasResult && (
        <div
          className={cn(
            "flex items-center gap-1.5 text-sm",
            isCorrect ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}
        >
          {isCorrect ? (
            <>
              <CheckCircleIcon className="size-4" />
              <span>Trafione!</span>
            </>
          ) : (
            <>
              <XCircleIcon className="size-4" />
              <span>Pudło (typ: {getResultLabel(userPrediction)})</span>
            </>
          )}
        </div>
      )}

      {!hasPrediction && hasResult && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MinusCircleIcon className="size-4" />
          <span>Nie obstawiono</span>
        </div>
      )}
    </div>
  );
}
