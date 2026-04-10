import * as React from "react";
import { Button } from "@/components/ui/button";
import { PowerIcon, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchToggleMealStatus } from "@/utils/fetchToggleMealStatus";
import { mealsQueryOptions } from "@/hooks/useMealsQuery";
import { ToastMessage } from "@/components/global/ToastMessage";
import type { Meal } from "@/types/mealTypes";

interface ToggleMealButtonProps {
  meal: Meal;
}

export function ToggleMealButton({ meal }: ToggleMealButtonProps) {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = React.useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await fetchToggleMealStatus(meal._id);
      ToastMessage(
        `تم ${meal.isActive ? "تعطيل" : "تفعيل"} الوجبة بنجاح`,
        "success"
      );
      await queryClient.invalidateQueries(mealsQueryOptions());
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      ToastMessage(
        err?.response?.data?.message || "حدث خطأ أثناء تغيير حالة الوجبة",
        "error"
      );
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isToggling}
      title={meal.isActive ? "تعطيل" : "تفعيل"}
    >
      {isToggling ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <PowerIcon
          className={`size-3.5 ${meal.isActive ? "text-destructive" : "text-emerald-500"}`}
        />
      )}
    </Button>
  );
}
