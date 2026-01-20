import { useMemo } from "react";
import {
  CalendarIcon,
  ClockIcon,
  AlertTriangleIcon,
  BellRing,
  Gamepad2,
  Trophy,
  TimerReset,
  TimerOff,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BettingControls } from "./BettingControls";
import { MatchResult } from "./MatchResult";
import { cn } from "@/lib/utils";
import type { MatchDTO, MatchOutcome } from "@/types";

interface MatchCardProps {
  match: MatchDTO;
  onBet: (matchId: number, prediction: MatchOutcome) => Promise<void>;
  isLoading?: boolean;
  loadingPrediction?: MatchOutcome | null;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function formatMatchDate(dateString: string): { date: string; time: string; isToday: boolean } {
  const matchDate = new Date(dateString);
  const today = new Date();

  const isToday =
    matchDate.getDate() === today.getDate() &&
    matchDate.getMonth() === today.getMonth() &&
    matchDate.getFullYear() === today.getFullYear();

  const date = isToday
    ? "Dziś"
    : matchDate.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "short",
      });

  const time = matchDate.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date, time, isToday };
}

function getStatusIcon(status: MatchDTO["status"]) {
  switch (status) {
    case "SCHEDULED":
      return BellRing;
    case "IN_PLAY":
      return Gamepad2;
    case "FINISHED":
      return Trophy;
    case "POSTPONED":
      return TimerReset;
    case "CANCELED":
      return TimerOff;
    default:
      return BellRing;
  }
}

export function MatchCard({ match, onBet, isLoading = false, loadingPrediction = null }: MatchCardProps) {
  const { date, time, isToday } = formatMatchDate(match.match_datetime);

  const isLocked = useMemo(() => {
    if (match.status !== "SCHEDULED") return true;

    const matchTime = new Date(match.match_datetime).getTime();
    const now = Date.now();
    return now >= matchTime - FIVE_MINUTES_MS;
  }, [match.match_datetime, match.status]);

  const isFinished = match.status === "FINISHED";
  const isCanceledOrPostponed = match.status === "CANCELED" || match.status === "POSTPONED";

  const currentPrediction = match.user_bet?.picked_result ?? null;

  const handleBet = (prediction: MatchOutcome) => {
    onBet(match.id, prediction);
  };

  return (
    <Card
      className={cn("transition-shadow hover:shadow-md", isCanceledOrPostponed && "opacity-60")}
      data-testid={`match-card-${match.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="size-4" />
            <span className={cn(isToday && "font-medium text-foreground")}>{date}</span>
            <ClockIcon className="size-4" />
            <span>{time}</span>
          </div>
          <div
            className={cn(
              "flex items-center",
              match.status === "SCHEDULED" && "text-blue-700 dark:text-blue-400",
              match.status === "IN_PLAY" && "text-green-700 dark:text-green-400",
              match.status === "FINISHED" && "text-gray-700 dark:text-gray-400",
              (match.status === "POSTPONED" || match.status === "CANCELED") && "text-yellow-700 dark:text-yellow-400"
            )}
          >
            {(() => {
              const StatusIcon = getStatusIcon(match.status);
              return <StatusIcon className="size-6" />;
            })()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <span className="font-medium" data-testid="home-team">
              {match.home_team}
            </span>
          </div>
          <div className="text-muted-foreground text-lg font-bold">vs</div>
          <div className="flex-1 text-left">
            <span className="font-medium" data-testid="away-team">
              {match.away_team}
            </span>
          </div>
        </div>

        {isCanceledOrPostponed ? (
          <div
            className="text-muted-foreground flex items-center justify-center gap-2 text-sm"
            data-testid="match-canceled-postponed"
          >
            <AlertTriangleIcon className="size-4" />
            <span>{match.status === "POSTPONED" ? "Mecz przełożony" : "Mecz odwołany"}</span>
          </div>
        ) : isFinished ? (
          <MatchResult
            userPrediction={currentPrediction}
            actualResult={match.result ?? null}
            homeScore={match.home_score ?? null}
            awayScore={match.away_score ?? null}
          />
        ) : (
          <BettingControls
            currentPrediction={currentPrediction}
            isLocked={isLocked}
            isLoading={isLoading}
            loadingPrediction={loadingPrediction}
            onSelect={handleBet}
          />
        )}
      </CardContent>
    </Card>
  );
}
