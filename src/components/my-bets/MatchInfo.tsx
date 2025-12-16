import type { MatchSummaryDTO } from "@/types";

interface MatchInfoProps {
  match: MatchSummaryDTO;
}

function formatMatchDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchInfo({ match }: MatchInfoProps) {
  const hasScore = match.home_score !== null && match.away_score !== null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Drużyny */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{match.home_team}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-medium">{match.away_team}</span>
      </div>

      {/* Data */}
      <div className="text-muted-foreground text-sm">
        <span>{formatMatchDate(match.match_datetime)}</span>
      </div>

      {/* Wynik (jeśli jest) */}
      {hasScore && (
        <div className="text-lg font-bold tabular-nums">
          {match.home_score} : {match.away_score}
        </div>
      )}
    </div>
  );
}
