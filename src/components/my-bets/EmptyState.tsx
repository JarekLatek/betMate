import { TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  hasFilters: boolean;
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="empty-state">
      <TicketIcon className="text-muted-foreground size-12" />
      <h3 className="mt-4 text-lg font-semibold">Brak zakładów</h3>
      <p className="text-muted-foreground mt-2 text-center text-sm">
        {hasFilters
          ? "Nie znaleziono zakładów pasujących do wybranych filtrów."
          : "Nie masz jeszcze żadnych zakładów. Przejdź do listy meczów i postaw swój pierwszy typ!"}
      </p>
      {!hasFilters && (
        <Button asChild className="mt-4">
          <a href="/">Przeglądaj mecze</a>
        </Button>
      )}
    </div>
  );
}
