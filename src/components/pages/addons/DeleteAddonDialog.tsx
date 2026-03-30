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
import { fetchDeleteAddon } from "@/utils/fetchDeleteAddon";
import { useQueryClient } from "@tanstack/react-query";
import { addonsQueryOptions } from "@/hooks/useAddonsQuery";
import { ToastMessage } from "@/components/global/ToastMessage";

interface DeleteAddonDialogProps {
  addonId: string;
  addonName: string;
}

export function DeleteAddonDialog({ addonId, addonName }: DeleteAddonDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetchDeleteAddon(addonId);
      ToastMessage("تم حذف الإضافة بنجاح", "success");
      await queryClient.invalidateQueries(addonsQueryOptions());
      setOpen(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      ToastMessage(
        err?.response?.data?.message || "حدث خطأ أثناء حذف الإضافة",
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
              سيتم حذف الإضافة "{addonName}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
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
