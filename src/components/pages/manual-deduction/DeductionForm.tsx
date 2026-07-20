import { useMemo } from "react";
import type { ReactNode } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Minus, Package, PlusCircle } from "lucide-react";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Subscription } from "@/types/subscriptionTypes";

const addonDeductionSchema = z.object({
  addonId: z.string(),
  name: z.string(),
  remainingQty: z.number(),
  qty: z.coerce
    .number()
    .int("الرقم يجب أن يكون صحيحًا")
    .min(0, "الرقم غير صحيح"),
});

const deductionSchema = z.object({
  regularMeals: z.coerce
    .number()
    .int("الرقم يجب أن يكون صحيحًا")
    .min(0, "الرقم غير صحيح"),
  premiumMeals: z.coerce
    .number()
    .int("الرقم يجب أن يكون صحيحًا")
    .min(0, "الرقم غير صحيح"),
  addons: z.array(addonDeductionSchema),
  reason: z.string().min(1, "الرجاء إدخال سبب الخصم"),
  notes: z.string().optional(),
});

export type DeductionFormInputValues = z.input<typeof deductionSchema>;
export type DeductionFormValues = z.output<typeof deductionSchema>;
export type DeductionFormReturn = UseFormReturn<
  DeductionFormInputValues,
  unknown,
  DeductionFormValues
>;

interface DeductionFormProps {
  subscription: Subscription;
  onSubmit: (values: DeductionFormValues, form: DeductionFormReturn) => void;
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
          ? "flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
          : "flex items-center gap-3 rounded-xl border bg-card p-3"
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

const REASONS = [
  ["cashier_walk_in", "استلام يدوي من الكاشير"],
  ["customer_support_correction", "تصحيح من خدمة العملاء"],
  ["balance_correction", "تصحيح رصيد"],
  ["manual_pickup", "استلام يدوي"],
  ["other", "سبب آخر"],
] as const;

function sanitizeWholeNumber(value: string) {
  return value.replace(/\D/g, "");
}

export function DeductionForm({
  subscription,
  onSubmit,
  onCancel,
  isPending,
}: DeductionFormProps) {
  const regularRemaining =
    subscription.remainingRegularMeals ?? subscription.remainingMeals;
  const premiumRemaining =
    subscription.remainingPremiumMeals ?? subscription.premiumRemaining ?? 0;
  const addonBalances = useMemo(
    () => subscription.addonBalances ?? [],
    [subscription.addonBalances]
  );

  const defaultAddons = useMemo(
    () =>
      addonBalances.map((addon) => ({
        addonId: addon.addonId,
        name: addon.name,
        remainingQty: addon.remainingQty,
        qty: 0,
      })),
    [addonBalances]
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
      addons: defaultAddons,
      reason: "cashier_walk_in",
      notes: "",
    },
  });

  const watched = form.watch();
  const selectedAddonTotal =
    watched.addons?.reduce((sum, addon) => sum + Number(addon.qty || 0), 0) ?? 0;
  const selectedTotal =
    Number(watched.regularMeals || 0) +
    Number(watched.premiumMeals || 0) +
    selectedAddonTotal;

  const handleSubmit = (values: DeductionFormValues) => {
    onSubmit(values, form);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Minus className="h-5 w-5" />
          تنفيذ خصم يدوي
        </CardTitle>
        <CardDescription>
          {subscription.userName} — {subscription.planName || subscription.plan?.name}
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
            value={`${regularRemaining} متاح`}
            icon={<Package className="h-4 w-4" />}
          />
          <BalanceCard
            label="وجبات مميزة"
            value={`${premiumRemaining} متاح`}
            icon={<Package className="h-4 w-4" />}
          />
          {subscription.endDate ? (
            <BalanceCard
              label="نهاية الاشتراك"
              value={new Date(subscription.endDate).toLocaleDateString("ar-EG")}
              icon={<Calendar className="h-4 w-4" />}
            />
          ) : (
            <BalanceCard
              label="إضافات متاحة"
              value={addonBalances.length}
              icon={<PlusCircle className="h-4 w-4" />}
            />
          )}
        </div>

        <Separator />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">خصم الوجبات</h3>
                  <p className="text-sm text-muted-foreground">
                    اكتب الكمية المطلوبة. الخادم هو صاحب القرار النهائي عند عدم كفاية الرصيد.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  الإجمالي: {selectedTotal}
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          name={field.name}
                          ref={field.ref}
                          value={field.value == null ? "" : String(field.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => {
                            const digits = sanitizeWholeNumber(event.target.value);
                            field.onChange(digits === "" ? "" : Number(digits));
                          }}
                          onBlur={() => {
                            if (field.value === "" || field.value == null) {
                              field.onChange(0);
                            }
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        المتاح الآن: {regularRemaining}
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          name={field.name}
                          ref={field.ref}
                          value={field.value == null ? "" : String(field.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) => {
                            const digits = sanitizeWholeNumber(event.target.value);
                            field.onChange(digits === "" ? "" : Number(digits));
                          }}
                          onBlur={() => {
                            if (field.value === "" || field.value == null) {
                              field.onChange(0);
                            }
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        المتاح الآن: {premiumRemaining}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {addonBalances.length ? (
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-4">
                  <h3 className="font-semibold">خصم الإضافات</h3>
                  <p className="text-sm text-muted-foreground">
                    الإضافات مستقلة عن الوجبات ولا تقلل رصيد الوجبات الأساسية.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {addonBalances.map((addon, index) => (
                    <FormField
                      key={addon.addonId}
                      control={form.control}
                      name={`addons.${index}.qty` as const}
                      render={({ field }) => (
                        <FormItem className="rounded-xl border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <FormLabel>{addon.name}</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                المتاح: {addon.remainingQty} من {addon.totalQty ?? addon.remainingQty}
                              </p>
                            </div>
                            <FormControl>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                autoComplete="off"
                                className="w-24 text-center"
                                name={field.name}
                                ref={field.ref}
                                value={field.value == null ? "" : String(field.value)}
                                onFocus={(event) => event.currentTarget.select()}
                                onChange={(event) => {
                                  const digits = sanitizeWholeNumber(event.target.value);
                                  field.onChange(digits === "" ? "" : Number(digits));
                                }}
                                onBlur={() => {
                                  if (field.value === "" || field.value == null) {
                                    field.onChange(0);
                                  }
                                  field.onBlur();
                                }}
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
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                      >
                        {REASONS.map(([value, label]) => (
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
                سيتم إرسال العملية كمعاملة واحدة. لو أي رصيد غير كافٍ سيرفض الخادم العملية بالكامل.
              </p>
              <div className="flex gap-3">
                <Button type="submit" disabled={isPending} className="min-w-[120px]">
                  {isPending ? "جاري الخصم..." : "تأكيد الخصم"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  إلغاء
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
