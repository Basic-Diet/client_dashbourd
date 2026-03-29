import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useExtendSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { ToastMessage } from "@/components/global/ToastMessage";

const extendSchema = z.object({
  days: z.number().min(1, { message: "يجب أن يكون عدد الأيام 1 على الأقل" }),
});

type ExtendFormValues = z.infer<typeof extendSchema>;

interface ExtendModalProps {
  subscriptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExtendModal({
  subscriptionId,
  isOpen,
  onClose,
}: ExtendModalProps) {
  const { mutateAsync: extendSubscription, isPending } =
    useExtendSubscriptionMutation();

  const form = useForm<ExtendFormValues>({
    resolver: zodResolver(extendSchema),
    defaultValues: {
      days: 1,
    },
  });

  const onSubmit = async (data: ExtendFormValues) => {
    try {
      await extendSubscription({ id: subscriptionId, data });
      ToastMessage("تم تمديد الاشتراك بنجاح", "success");
      onClose();
      form.reset();
    } catch (error) {
      console.error(error);
      ToastMessage("حدث خطأ أثناء تمديد الاشتراك", "error");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>تمديد الاشتراك</DialogTitle>
          <DialogDescription>
            حدد عدد الأيام الإضافية التي تريد إضافتها لهذا الاشتراك.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="days">عدد الأيام الإضافية</Label>
            <Input
              id="days"
              type="number"
              min={1}
              {...form.register("days", { valueAsNumber: true })}
            />
            {form.formState.errors.days && (
              <FieldError
                errors={[{ message: form.formState.errors.days.message }]}
              />
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "تأكيد التمديد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
