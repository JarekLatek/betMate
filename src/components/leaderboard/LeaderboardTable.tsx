import { LeaderboardHeader } from "./LeaderboardHeader";
import { LeaderboardRow } from "./LeaderboardRow";
import type { LeaderboardTableProps } from "./types";

export function LeaderboardTable({ entries, currentUserId, isLoading = false }: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full" role="table" aria-label="Ranking użytkowników">
          <LeaderboardHeader />
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="animate-pulse border-b">
                <td className="px-4 py-3">
                  <div className="bg-muted h-4 w-8 rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="bg-muted h-4 w-32 rounded" />
                </td>
                <td className="px-4 py-3">
                  <div className="bg-muted ml-auto h-4 w-12 rounded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-12">
        <p className="text-muted-foreground">Brak uczestników w tym turnieju</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full" role="table" aria-label="Ranking użytkowników">
        <LeaderboardHeader />
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow key={entry.user_id} entry={entry} isCurrentUser={entry.user_id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
