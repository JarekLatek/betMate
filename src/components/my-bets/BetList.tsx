import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BetCard } from "./BetCard";
import { EmptyState } from "./EmptyState";
import { LoadMoreButton } from "./LoadMoreButton";
import type { BetWithDisplayStatus } from "@/types/my-bets.types";

interface BetListProps {
  bets: BetWithDisplayStatus[];
  onDeleteBet: (betId: number) => void;
  onLoadMore: () => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore: boolean;
  deletingBetId?: number | null;
  hasFilters: boolean;
}

function BetCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BetListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BetCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BetList({
  bets,
  onDeleteBet,
  onLoadMore,
  isLoading = false,
  isLoadingMore = false,
  hasMore,
  deletingBetId = null,
  hasFilters,
}: BetListProps) {
  // Initial loading state
  if (isLoading && bets.length === 0) {
    return <BetListSkeleton />;
  }

  // Empty state
  if (bets.length === 0) {
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="space-y-4">
      {bets.map((bet) => (
        <BetCard key={bet.id} bet={bet} onDelete={onDeleteBet} isDeleting={deletingBetId === bet.id} />
      ))}
      <LoadMoreButton onLoadMore={onLoadMore} isLoading={isLoadingMore} hasMore={hasMore} />
    </div>
  );
}
