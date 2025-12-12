import { cn } from "@/lib/utils";
import type { StickyUserRowProps } from "./types";

export function StickyUserRow({ userEntry, isVisible }: StickyUserRowProps) {
  if (!userEntry || !isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur"
      )}
      role="complementary"
      aria-label="Twoja pozycja w rankingu"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
              {userEntry.rank}
            </span>
            <span className="text-sm font-medium">
              {userEntry.username}
              <span className="text-primary ml-2 text-xs">(Ty)</span>
            </span>
          </div>
          <span className="text-sm font-semibold tabular-nums">{userEntry.points} pkt</span>
        </div>
      </div>
    </div>
  );
}
