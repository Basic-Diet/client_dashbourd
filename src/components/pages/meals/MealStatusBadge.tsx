import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types/mealTypes";

export function MealStatusBadge({ meal }: { meal: Meal }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "select-none",
        meal.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
      )}
    >
      {meal.isActive ? (
        <CheckCircleIcon className="ml-1 size-3.5" />
      ) : (
        <XCircleIcon className="ml-1 size-3.5" />
      )}
      {meal.isActive ? "نشطة" : "غير نشطة"}
    </Badge>
  );
}
