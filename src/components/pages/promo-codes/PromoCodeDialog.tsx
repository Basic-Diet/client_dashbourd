import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Info, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  useCreatePromoCodeMutation,
  useUpdatePromoCodeMutation,
} from "@/hooks/usePromoCodesQuery";
import type {
  PromoCodeAppliesTo,
  PromoCodeDTO,
  PromoCodePayload,
} from "@/types/financeTypes";
import {
  halalaToRiyalInput,
  isValidRiyalInput,
  riyalToHalala,
} from "@/utils/price";

const promoCodeSchema = z.object({
  code: z.string().min(1, "مطلوب"),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.string().min(1, "مطلوب"),
  usageLimitTotal: z.string().optional(),
  usageLimitPerUser: z.string().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  appliesTo: z.enum(["subscription", "addon_plans", "all"]),
  isActive: z.boolean(),
}).superRefine((values, context) => {
  const valid = values.discountType === "fixed"
    ? isValidRiyalInput(values.discountValue) && riyalToHalala(values.discountValue) > 0
    : Number(values.discountValue) > 0;

  if (!valid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "قيمة غير صحيحة",
    });
  }
});

type PromoCodeFormValues = z.infer<typeof promoCodeSchema>;

function readApiErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response
  ) {
    const data = error.response.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error &&
      typeof data.error.message === "string"
    ) {
      return data.error.message;
    }
  }

  return "حدث خطأ أثناء حفظ كود الخصم";
}

function formatDateTimeInputValue(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const readPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${readPart("year")}-${readPart("month")}-${readPart("day")}T${readPart("hour")}:${readPart("minute")}`;
}

function riyadhDateTimeInputToIso(value?: string): string | null {
  if (!value) return null;

  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if ([year, month, day, hour, minute].some((part) => !Number.isFinite(part))) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute)).toISOString();
}

function getDefaultValues(editData?: PromoCodeDTO): PromoCodeFormValues {
  const discountType = editData?.discountType === "fixed_amount"
    ? "fixed"
    : editData?.discountType ?? "percentage";

  return {
    code: editData?.code ?? "",
    nameAr: editData?.name?.ar ?? "",
    nameEn: editData?.name?.en ?? "",
    discountType: discountType === "fixed" ? "fixed" : "percentage",
    discountValue:
      discountType === "fixed"
        ? halalaToRiyalInput(editData?.discountValue)
        : editData?.discountValue?.toString() ?? "",
    usageLimitTotal: editData?.usageLimitTotal?.toString() ?? "",
    usageLimitPerUser: editData?.usageLimitPerUser?.toString() ?? "",
    startsAt: formatDateTimeInputValue(editData?.startsAt),
    expiresAt: formatDateTimeInputValue(editData?.expiresAt),
    appliesTo:
      editData?.appliesTo === "addon_plans" || editData?.appliesTo === "all"
        ? editData.appliesTo
        : "subscription",
    isActive: editData?.isActive ?? true,
  };
}

function optionalInteger(value?: string): number | null {
  if (!value) return null;
  return Math.max(0, Math.floor(Number(value)));
}

function toPromoCodePayload(values: PromoCodeFormValues): PromoCodePayload {
  const discountValue = values.discountType === "fixed"
    ? riyalToHalala(values.discountValue)
    : Number(values.discountValue);

  return {
    code: values.code.trim().toUpperCase(),
    name: {
      ar: values.nameAr?.trim() ?? "",
      en: values.nameEn?.trim() ?? "",
    },
    discountType: values.discountType,
    discountValue,
    usageLimitTotal: optionalInteger(values.usageLimitTotal),
    usageLimitPerUser: optionalInteger(values.usageLimitPerUser),
    startsAt: riyadhDateTimeInputToIso(values.startsAt),
    expiresAt: riyadhDateTimeInputToIso(values.expiresAt),
    appliesTo: values.appliesTo as PromoCodeAppliesTo,
    isActive: values.isActive,
  };
}

interface PromoCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: PromoCodeDTO;
}

export function PromoCodeDialog({
  isOpen,
  onClose,
  editData,
}: PromoCodeDialogProps) {
  const isEditing = Boolean(editData);
  const form = useForm<PromoCodeFormValues>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: getDefaultValues(editData),
  });
  const createMutation = useCreatePromoCodeMutation();
  const updateMutation = useUpdatePromoCodeMutation();
  const discountType = form.watch("discountType");
  const appliesTo = form.watch("appliesTo");
  const isLoading = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: PromoCodeFormValues) {
    try {
      const payload = toPromoCodePayload(values);

      if (editData) {
        await updateMutation.mutateAsync({ id: editData.id, data: payload });
        toast.success("تم تحديث كود الخصم بنجاح");
        onClose();
        return;
      }

      await createMutation.mutateAsync(payload);
      toast.success("تم إنشاء كود الخصم بنجاح");
      form.reset(getDefaultValues());
      onClose();
    } catch (error) {
      toast.error(readApiErrorMessage(error));
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto rounded-[2rem] border-muted-foreground/10 bg-background/95 backdrop-blur-xl sm:max-w-2xl"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-black">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ticket className="size-5" />
            </div>
            {isEditing ? "تعديل كود الخصم" : "إضافة كود جديد"}
          </DialogTitle>
          <DialogDescription className="text-right font-medium text-muted-foreground">
            أدخل بيانات الكود الأساسية. الحساب النهائي والقيود المتقدمة يقررها الباك اند.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>
                  المبلغ الثابت يُكتب بالريال، ويتم تحويله إلى هللة فقط عند إرسال البيانات للباك اند.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكود</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        dir="ltr"
                        className="font-mono uppercase"
                        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appliesTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ينطبق على</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="subscription">اشتراك</SelectItem>
                        <SelectItem value="addon_plans">خطط الإضافات</SelectItem>
                        <SelectItem value="all">الكل</SelectItem>
                      </SelectContent>
                    </Select>
                    {appliesTo !== "subscription" ? (
                      <FormDescription>
                        الطلبات العادية غير مدعومة، وخصومات الإضافات تحتاج مستهلك تحقق منفصل من الباك اند.
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالعربية</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالإنجليزية</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الخصم</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">نسبة مئوية</SelectItem>
                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {discountType === "percentage" ? "نسبة الخصم" : "قيمة الخصم بالريال"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="number"
                          min="0"
                          step={discountType === "percentage" ? "1" : "0.01"}
                          inputMode={discountType === "percentage" ? "numeric" : "decimal"}
                          dir="ltr"
                          className="pl-12"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                          {discountType === "percentage" ? "%" : "ر.س"}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {discountType === "percentage"
                        ? "مثال: 10 تعني خصم 10%."
                        : "اكتب المبلغ بالريال السعودي."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usageLimitTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حد الاستخدام الكلي</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="اتركه فارغًا لغير محدود"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="usageLimitPerUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حد الاستخدام لكل مستخدم</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="اتركه فارغًا لغير محدود"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startsAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ ووقت البدء</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="datetime-local"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormDescription>يُعرض ويُرسل حسب توقيت الرياض.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ ووقت الانتهاء</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="datetime-local"
                        dir="ltr"
                      />
                    </FormControl>
                    <FormDescription>اتركه فارغًا إذا لم يكن له تاريخ انتهاء.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-2xl border border-muted-foreground/10 bg-muted/20 p-4">
                  <div>
                    <FormLabel>مفعّل</FormLabel>
                    <FormDescription>
                      عند التعطيل لن يكون الكود صالحًا حتى لو كانت باقي الشروط صحيحة.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-row-reverse gap-2 pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "جاري الحفظ..."
                  : isEditing
                    ? "تحديث كود الخصم"
                    : "إنشاء كود الخصم"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
