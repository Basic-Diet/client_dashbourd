import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2Icon, Loader2 } from "lucide-react";
import { fetchDeleteMeal } from "@/utils/fetchDeleteMeal";
import { useQueryClient } from "@tanstack/react-query";
import { mealsQueryOptions } from "@/hooks/useMealsQuery";
import { ToastMessage } from "@/components/global/ToastMessage";

interface DeleteMealDialogProps {
  mealId: string;
  mealName: string;
}

export function DeleteMealDialog({ mealId, mealName }: DeleteMealDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetchDeleteMeal(mealId);
      ToastMessage("تم حذف الوجبة بنجاح", "success");
      await queryClient.invalidateQueries(mealsQueryOptions());
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      ToastMessage(
        err?.response?.data?.message || "حدث خطأ أثناء حذف الوجبة",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2Icon className="ml-1 size-3.5" />
        حذف
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الوجبة "{mealName}" بشكل نهائي. لا يمكن التراجع عن هذا
              الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                handleDelete();
              }}
              className="text-destructive-foreground! bg-destructive! hover:bg-destructive/90!"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="ml-2 size-4 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                "تأكيد الحذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
