import * as React from "react";
import { Button } from "@/components/ui/button";
import { PowerIcon, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchToggleCategoryStatus } from "@/utils/fetchToggleCategoryStatus";
import { categoriesQueryOptions } from "@/hooks/useCategoriesQuery";
import { ToastMessage } from "@/components/global/ToastMessage";
import type { MealCategory } from "@/types/categoryTypes";

interface ToggleCategoryButtonProps {
  category: MealCategory;
}

export function ToggleCategoryButton({ category }: ToggleCategoryButtonProps) {
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = React.useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await fetchToggleCategoryStatus(category._id);
      ToastMessage(
        `تم ${category.isActive ? "تعطيل" : "تفعيل"} التصنيف بنجاح`,
        "success"
      );
      await queryClient.invalidateQueries(categoriesQueryOptions());
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      ToastMessage(
        err?.response?.data?.message || "حدث خطأ أثناء تغيير حالة التصنيف",
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
      title={category.isActive ? "تعطيل" : "تفعيل"}
    >
      {isToggling ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <PowerIcon
          className={`size-3.5 ${category.isActive ? "text-destructive" : "text-emerald-500"}`}
        />
      )}
    </Button>
  );
}
