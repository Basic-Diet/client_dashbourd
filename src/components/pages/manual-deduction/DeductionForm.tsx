import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Minus, Package, PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  buildManualDeductionPayload,
  getFulfillmentLabel,
  getReasonLabel,
  REASON_LABELS,
  type DeductionPayloadValues,
  type ManualDeductionCustomer,
  type ManualDeductionPayload,
  type NormalizedManualDeductionSubscription,
} from "./manualDeductionModel";

const integerMessage = "الرقم يجب أن يكون صحيحاً وغير سالب";

const addonDeductionSchema = z.object({
  addonId: z.string(),
  name: z.string(),
  qty: z.coerce.number().int(integerMessage).min(0, integerMessage),
});

const deductionSchema = z
  .object({
    regularMeals: z.coerce.number().int(integerMessage).min(0, integerMessage),
    premiumMeals: z.coerce.number().int(integerMessage).min(0, integerMessage),
    addons: z.array(addonDeductionSchema),
    reason: z.string().trim().min(1, "الرجاء اختيار سبب الخصم"),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const addonsTotal = values.addons.reduce((sum, addon) => sum + addon.qty, 0);
    if (values.regularMeals + values.premiumMeals + addonsTotal <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["regularMeals"],
        message: "أدخل كمية واحدة على الأقل من الوجبات أو الإضافات",
      });
    }
  });

export type DeductionFormInputValues = z.input<typeof deductionSchema>;
export type DeductionFormValues = z.output<typeof deductionSchema>;
export type DeductionFormReturn = UseFormReturn<
  DeductionFormInputValues,
  unknown,
  DeductionFormValues
>;

interface DeductionFormProps {
  customer: ManualDeductionCustomer;
  subscription: NormalizedManualDeductionSubscription;
  onConfirm: (
    payload: ManualDeductionPayload,
    values: DeductionFormValues,
    form: DeductionFormReturn
  ) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

function BalanceCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: "default" | "primary";
}) {
  return (
    <div
      className={
        tone === "primary"
          ? "flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
          : "flex items-center gap-3 rounded-lg border bg-card p-3"
      }
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

const toPayloadValues = (values: DeductionFormValues): DeductionPayloadValues => ({
  regularMeals: values.regularMeals,
  premiumMeals: values.premiumMeals,
  addons: values.addons.map((addon) => ({
    addonId: addon.addonId,
    name: addon.name,
    qty: addon.qty,
  })),
  reason: values.reason,
  notes: values.notes,
});

export function DeductionForm({
  customer,
  subscription,
  onConfirm,
  onCancel,
  isPending,
}: DeductionFormProps) {
  const [pendingValues, setPendingValues] = useState<DeductionFormValues | null>(
    null
  );
  const confirmInFlightRef = useRef(false);

  const addonBalances = useMemo(
    () => subscription.addonBalances ?? [],
    [subscription.addonBalances]
  );

  const form = useForm<
    DeductionFormInputValues,
    unknown,
    DeductionFormValues
  >({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      regularMeals: 0,
      premiumMeals: 0,
      addons: addonBalances.map((addon) => ({
        addonId: addon.addonId,
        name: addon.name,
        qty: 0,
      })),
      reason: "cashier_walk_in",
      notes: "",
    },
  });

  const isBusy = isPending || form.formState.isSubmitting;
  const watched = form.watch();
  const watchedValues = watched as Partial<DeductionFormValues>;
  const selectedAddons =
    pendingValues?.addons.filter((addon) => addon.qty > 0) ??
    watchedValues.addons
      ?.map((addon) => ({
        addonId: addon.addonId,
        name: addon.name,
        qty: Number(addon.qty || 0),
      }))
      .filter((addon) => addon.qty > 0) ??
    [];
  const selectedAddonTotal = selectedAddons.reduce(
    (sum, addon) => sum + Number(addon.qty || 0),
    0
  );
  const selectedMealTotal =
    Number((pendingValues ?? watchedValues).regularMeals || 0) +
    Number((pendingValues ?? watchedValues).premiumMeals || 0);

  const openConfirmation = (values: DeductionFormValues) => {
    setPendingValues(values);
  };

  const handleConfirm = async () => {
    if (!pendingValues || isBusy || confirmInFlightRef.current) return;
    confirmInFlightRef.current = true;
    try {
      const payload = buildManualDeductionPayload(toPayloadValues(pendingValues));
      await onConfirm(payload, pendingValues, form);
      setPendingValues(null);
    } catch {
      // Keep the dialog and entered values visible so the cashier can correct or retry.
    } finally {
      confirmInFlightRef.current = false;
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Minus className="h-5 w-5" />
            تنفيذ خصم يدوي
          </CardTitle>
          <CardDescription>
            {customer.name} - {subscription.planName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BalanceCard
              label="الرصيد الكلي"
              value={`${subscription.remainingMeals} وجبة`}
              icon={<Package className="h-4 w-4" />}
              tone="primary"
            />
            <BalanceCard
              label="وجبات عادية"
              value={`${subscription.remainingRegularMeals} متاح`}
              icon={<Package className="h-4 w-4" />}
            />
            <BalanceCard
              label="وجبات مميزة"
              value={`${subscription.remainingPremiumMeals} متاح`}
              icon={<Package className="h-4 w-4" />}
            />
            <BalanceCard
              label="إضافات ظاهرة"
              value={addonBalances.length}
              icon={<PlusCircle className="h-4 w-4" />}
            />
          </div>

          <Separator />

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(openConfirmation)}
              className="space-y-5"
              aria-busy={isBusy}
            >
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">خصم الوجبات</h3>
                    <p className="text-sm text-muted-foreground">
                      يمكن إدخال كمية أكبر من الرصيد الظاهر، والخادم سيحسم القرار النهائي.
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    الوجبات: {selectedMealTotal} | الإضافات: {selectedAddonTotal}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="regularMeals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وجبات عادية</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step={1}
                            inputMode="numeric"
                            disabled={isBusy}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={Number(field.value ?? 0)}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          المتاح الآن: {subscription.remainingRegularMeals}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="premiumMeals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وجبات مميزة</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step={1}
                            inputMode="numeric"
                            disabled={isBusy}
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={Number(field.value ?? 0)}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          المتاح الآن: {subscription.remainingPremiumMeals}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {addonBalances.length ? (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">خصم الإضافات</h3>
                    <p className="text-sm text-muted-foreground">
                      الإضافات مستقلة عن رصيد الوجبات الأساسية.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {addonBalances.map((addon, index) => (
                      <FormField
                        key={addon.addonId}
                        control={form.control}
                        name={`addons.${index}.qty` as const}
                        render={({ field }) => (
                          <FormItem className="rounded-lg border bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <FormLabel>{addon.name}</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  المتاح: {addon.remainingQty} من {addon.totalQty}
                                </p>
                              </div>
                              <FormControl>
                                <Input
                                  type="number"
                                  step={1}
                                  inputMode="numeric"
                                  disabled={isBusy}
                                  className="w-24 text-center"
                                  name={field.name}
                                  ref={field.ref}
                                  onBlur={field.onBlur}
                                  value={Number(field.value ?? 0)}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سبب الخصم *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={isBusy}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                        >
                          {Object.entries(REASON_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="أي تفاصيل إضافية تساعد في مراجعة العملية..."
                          className="min-h-20"
                          disabled={isBusy}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-6 text-muted-foreground">
                  سيتم تنفيذ الخصم كمعاملة واحدة، وأي رفض من الخادم سيبقي القيم كما هي للتعديل.
                </p>
                <div className="flex gap-3">
                  <Button type="submit" disabled={isBusy} className="min-w-[120px]">
                    {isBusy ? "جاري الخصم..." : "مراجعة الخصم"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    onClick={onCancel}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(pendingValues)}
        onOpenChange={(open) => {
          if (isBusy) return;
          if (!open) setPendingValues(null);
        }}
      >
        <AlertDialogContent dir="rtl" className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-right">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              تأكيد الخصم اليدوي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هذا الإجراء يغيّر رصيد الاشتراك مباشرة بعد تأكيده.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingValues ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">العميل: </span>
                  {customer.name}
                </p>
                <p dir="ltr" className="text-right">
                  <span className="text-muted-foreground">الهاتف: </span>
                  {customer.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">الخطة: </span>
                  {subscription.planName}
                </p>
                <p>
                  <span className="text-muted-foreground">طريقة التنفيذ: </span>
                  {getFulfillmentLabel(subscription.fulfillmentMethod)}
                </p>
                <p>
                  <span className="text-muted-foreground">وجبات عادية: </span>
                  {pendingValues.regularMeals}
                </p>
                <p>
                  <span className="text-muted-foreground">وجبات مميزة: </span>
                  {pendingValues.premiumMeals}
                </p>
                <p>
                  <span className="text-muted-foreground">سبب الخصم: </span>
                  {getReasonLabel(pendingValues.reason)}
                </p>
              </div>
              {selectedAddons.length ? (
                <div>
                  <p className="mb-2 text-muted-foreground">الإضافات المختارة:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAddons.map((addon) => (
                      <span
                        key={addon.addonId}
                        className="rounded-full border bg-background px-3 py-1"
                      >
                        {addon.name}: {addon.qty}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {pendingValues.notes?.trim() ? (
                <p>
                  <span className="text-muted-foreground">ملاحظات: </span>
                  {pendingValues.notes.trim()}
                </p>
              ) : null}
            </div>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>رجوع</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isBusy}>
              {isBusy ? "جاري التنفيذ..." : "تنفيذ الخصم"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
