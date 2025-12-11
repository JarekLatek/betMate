import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  variant?: "success" | "error" | "neutral";
  isLoading?: boolean;
}

const variantStyles = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  neutral: "text-foreground",
};

export function StatCard({ label, value, variant = "neutral", isLoading = false }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-1">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className={cn("text-2xl font-bold tabular-nums", variantStyles[variant])}>{value}</span>
            <span className="text-muted-foreground text-xs">{label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
