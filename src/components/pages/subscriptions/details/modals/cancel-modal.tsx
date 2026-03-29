import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCancelSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { TriangleAlertIcon } from "lucide-react";
import { ToastMessage } from "@/components/global/ToastMessage";

interface CancelModalProps {
  subscriptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CancelModal({
  subscriptionId,
  isOpen,
  onClose,
}: CancelModalProps) {
  const { mutateAsync: cancelSubscription, isPending } =
    useCancelSubscriptionMutation();

  const handleCancel = async () => {
    try {
      await cancelSubscription(subscriptionId);
      ToastMessage("تم إلغاء الاشتراك بنجاح", "success");
      onClose();
    } catch (error) {
      console.error(error);
      ToastMessage("حدث خطأ أثناء إلغاء الاشتراك", "error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <TriangleAlertIcon
              className="h-6 w-6 text-red-600"
              aria-hidden="true"
            />
          </div>
          <DialogTitle className="text-xl">إلغاء الاشتراك</DialogTitle>
          <DialogDescription className="pt-2 text-base">
            هل أنت متأكد من رغبتك في إلغاء هذا الاشتراك؟ هذا الإجراء لا يمكن
            التراجع عنه.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row-reverse gap-2 pt-4 sm:flex-row sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            تراجع
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isPending}
            className="mt-2 w-full sm:mt-0 sm:w-auto"
          >
            {isPending ? "جاري الإلغاء..." : "نعم، إلغاء الاشتراك"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
