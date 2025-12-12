import { cn } from "@/lib/utils";
import type { LeaderboardRowProps } from "./types";

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  return (
    <tr
      className={cn("border-b transition-colors", isCurrentUser ? "bg-primary/10 font-medium" : "hover:bg-muted/50")}
      data-user-id={entry.user_id}
    >
      <td className="px-4 py-3 text-sm tabular-nums">{entry.rank}</td>
      <td className="px-4 py-3 text-sm">
        {entry.username}
        {isCurrentUser && <span className="text-primary ml-2 text-xs">(Ty)</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{entry.points}</td>
    </tr>
  );
}
