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
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{match.home_team}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-medium">{match.away_team}</span>
      </div>
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <span>{formatMatchDate(match.match_datetime)}</span>
        {hasScore && (
          <>
            <span>•</span>
            <span className="font-semibold tabular-nums">
              {match.home_score} : {match.away_score}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
