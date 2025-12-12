import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LoadMoreButtonProps } from "./types";

export function LoadMoreButton({ onClick, isLoading, hasMore }: LoadMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center pt-4">
      <Button variant="outline" onClick={onClick} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2Icon className="mr-2 size-4 animate-spin" />
            Ładowanie...
          </>
        ) : (
          "Załaduj więcej"
        )}
      </Button>
    </div>
  );
}
