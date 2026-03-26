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
import { useFreezeSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { toast } from "sonner";

const freezeSchema = z.object({
  startDate: z.string().min(1, { message: "تاريخ البدء مطلوب" }),
  days: z.number().min(1, { message: "يجب أن يكون عدد الأيام 1 على الأقل" }),
});

type FreezeFormValues = z.infer<typeof freezeSchema>;

interface FreezeModalProps {
  subscriptionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FreezeModal({ subscriptionId, isOpen, onClose }: FreezeModalProps) {
  const { mutateAsync: freezeSubscription, isPending } = useFreezeSubscriptionMutation();

  const form = useForm<FreezeFormValues>({
    resolver: zodResolver(freezeSchema),
    defaultValues: {
      startDate: new Date().toISOString().split("T")[0],
      days: 1,
    },
  });

  const onSubmit = async (data: FreezeFormValues) => {
    try {
      await freezeSubscription({ id: subscriptionId, data });
      toast.success("تم تجميد الاشتراك بنجاح");
      onClose();
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تجميد الاشتراك");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>تجميد الاشتراك</DialogTitle>
          <DialogDescription>
            حدد تاريخ بدء التجميد وعدد الأيام. سيتم تعليق الاشتراك وتمديد تاريخ الانتهاء تلقائياً.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">تاريخ البدء</Label>
            <Input id="startDate" type="date" {...form.register("startDate")} />
            {form.formState.errors.startDate && (
              <FieldError errors={[{ message: form.formState.errors.startDate.message }]} />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="days">عدد الأيام</Label>
            <Input id="days" type="number" min={1} {...form.register("days", { valueAsNumber: true })} />
            {form.formState.errors.days && (
              <FieldError errors={[{ message: form.formState.errors.days.message }]} />
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "تأكيد التجميد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
