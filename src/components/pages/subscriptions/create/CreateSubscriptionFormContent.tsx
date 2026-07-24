import { useCallback, useMemo, useState } from "react";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import {
  buildSubscriptionCreationPayload,
  buildSubscriptionQuotePayload,
} from "@/utils/buildSubscriptionCreationPayload";
import { fetchSubscriptionQuote } from "@/utils/fetchSubscriptionsData";
import { useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  Loader2,
  ReceiptText,
} from "lucide-react";

import { UserSelectionSection } from "./UserSelectionSection";
import { PlanSelectionSection } from "./PlanSelectionSection";
import { PremiumMealsSection } from "./PremiumMealsSection";
import { AddonsSection } from "./AddonsSection";
import { DeliverySection } from "./DeliverySection";

interface CreateSubscriptionFormContentProps {
  /** Pre-set userId (when creating from user page). If provided, user selection is hidden. */
  userId?: string;
}

type ApiRecord = Record<string, unknown>;

type PricePart = {
  halala: number;
  currency?: string;
};

type PaymentMethod = "cash" | "visa";

type PaymentMethodOption = {
  method: PaymentMethod;
  labelAr: string;
  gatewayRequired: false;
};

const FALLBACK_PAYMENT_OPTIONS: PaymentMethodOption[] = [
  { method: "cash", labelAr: "كاش", gatewayRequired: false },
  { method: "visa", labelAr: "فيزا", gatewayRequired: false },
];

function asRecord(value: unknown): ApiRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readSubscriptionId(response: unknown) {
  const data = asRecord(asRecord(response)?.data);
  return readString(data?.id) || readString(data?._id);
}

function readSubscriptionLabel(response: unknown) {
  const data = asRecord(asRecord(response)?.data);
  return (
    readString(data?.displayId) ||
    readSubscriptionId(response)?.slice(-8) ||
    null
  );
}

function readRecordedPaymentMethod(
  response: unknown,
  fallback: PaymentMethod
): PaymentMethod {
  const root = asRecord(response);
  const data = asRecord(root?.data);
  const payment = asRecord(data?.payment);
  const meta = asRecord(root?.meta);
  const candidate =
    readString(data?.paymentMethod) ||
    readString(payment?.method) ||
    readString(meta?.paymentMethod);
  return candidate === "visa" ? "visa" : candidate === "cash" ? "cash" : fallback;
}

function readPaymentMethodOptions(response: unknown): PaymentMethodOption[] {
  const data = asRecord(asRecord(response)?.data);
  const values = Array.isArray(data?.paymentMethodOptions)
    ? data.paymentMethodOptions
    : [];
  const parsed = values.flatMap((value) => {
    const option = asRecord(value);
    const method = readString(option?.method);
    if (method !== "cash" && method !== "visa") return [];
    return [
      {
        method,
        labelAr:
          readString(option?.labelAr) || (method === "cash" ? "كاش" : "فيزا"),
        gatewayRequired: false as const,
      },
    ];
  });
  return parsed.length ? parsed : FALLBACK_PAYMENT_OPTIONS;
}

function formatMoney(halala: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(halala / 100);
  } catch {
    return `${(halala / 100).toFixed(2)} ${currency}`;
  }
}

export function CreateSubscriptionFormContent({
  userId,
}: CreateSubscriptionFormContentProps) {
  const form = useCreateSubscriptionForm(userId || "");
  const navigate = useNavigate();
  const [isValidatingPrice, setIsValidatingPrice] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState(FALLBACK_PAYMENT_OPTIONS);
  const [planPrice, setPlanPrice] = useState<PricePart>({ halala: 0 });
  const [premiumPrice, setPremiumPrice] = useState<PricePart>({ halala: 0 });
  const [addonsPrice, setAddonsPrice] = useState<PricePart>({ halala: 0 });
  const { mutateAsync, isPending } = useCreateSubscriptionMutation();
  const isSubmitting = isPending || isValidatingPrice;
  const selectedPaymentMethod = form.watch("paymentMethod");

  const handlePlanPriceChange = useCallback((next: PricePart) => {
    setPlanPrice(next);
  }, []);
  const handlePremiumPriceChange = useCallback((next: PricePart) => {
    setPremiumPrice(next);
  }, []);
  const handleAddonsPriceChange = useCallback((next: PricePart) => {
    setAddonsPrice(next);
  }, []);

  const currency =
    planPrice.currency || premiumPrice.currency || addonsPrice.currency || "SAR";
  const totalHalala = useMemo(
    () => planPrice.halala + premiumPrice.halala + addonsPrice.halala,
    [planPrice.halala, premiumPrice.halala, addonsPrice.halala]
  );
  const hasSelectedPrice =
    planPrice.halala > 0 || premiumPrice.halala > 0 || addonsPrice.halala > 0;

  const onSubmit = async (data: CreateSubscriptionSchemaType) => {
    const quotePayload = buildSubscriptionQuotePayload(data);
    const createPayload = buildSubscriptionCreationPayload(data);

    try {
      setIsValidatingPrice(true);
      const quoteResponse = await fetchSubscriptionQuote(quotePayload);
      setPaymentOptions(readPaymentMethodOptions(quoteResponse));
      setIsValidatingPrice(false);

      const response = await mutateAsync(createPayload);
      const subscriptionId = readSubscriptionId(response);
      const subscriptionLabel = readSubscriptionLabel(response);
      const recordedMethod = readRecordedPaymentMethod(
        response,
        data.paymentMethod
      );
      const methodLabel = recordedMethod === "visa" ? "فيزا" : "كاش";

      ToastMessage(
        subscriptionLabel
          ? `تم إنشاء الاشتراك وتسجيل الدفع ${methodLabel} بنجاح (${subscriptionLabel})`
          : `تم إنشاء الاشتراك وتسجيل الدفع ${methodLabel} بنجاح`,
        "success"
      );

      if (subscriptionId) {
        navigate({
          to: "/subscriptions/$subscriptionId",
          params: { subscriptionId },
        });
        return;
      }

      if (userId) {
        navigate({ to: "/users/$userId", params: { userId } });
      } else {
        navigate({ to: "/subscriptions" });
      }
    } catch (error: unknown) {
      setIsValidatingPrice(false);
      ToastMessage(
        getApiErrorMessage(error) || "حدث خطأ أثناء إنشاء الاشتراك",
        "error"
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl" dir="rtl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!userId && <UserSelectionSection form={form} />}
        <PlanSelectionSection
          form={form}
          onPriceChange={handlePlanPriceChange}
        />
        <PremiumMealsSection
          form={form}
          onPriceChange={handlePremiumPriceChange}
        />
        <AddonsSection
          form={form}
          onPriceChange={handleAddonsPriceChange}
        />
        <DeliverySection form={form} />

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">إجمالي الاشتراك</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                إجمالي أسعار الخيارات المحددة في النموذج.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-2 rounded-xl bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                الإجمالي الحالي
              </span>
              <strong className="text-2xl font-bold text-primary" aria-live="polite">
                {formatMoney(totalHalala, currency)}
              </strong>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <PriceLine
                label="سعر الباقة"
                value={formatMoney(planPrice.halala, currency)}
              />
              <PriceLine
                label="الوجبات المميزة"
                value={formatMoney(premiumPrice.halala, currency)}
              />
              <PriceLine
                label="الإضافات"
                value={formatMoney(addonsPrice.halala, currency)}
              />
            </div>

            {!hasSelectedPrice ? (
              <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                اختر الباقة والخيارات ليظهر الإجمالي تلقائياً هنا.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                هذا ملخص مباشر للأسعار الظاهرة في الخيارات المحددة. يقوم الخادم
                بمراجعة السعر والبيانات مرة أخيرة عند إنشاء الاشتراك.
              </p>
            )}

            <div className="border-t pt-5">
              <div className="mb-3">
                <h3 className="font-semibold">طريقة الدفع</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  يتم تسجيل كاش أو فيزا يدويًا بدون بوابة دفع أو إعادة توجيه.
                </p>
              </div>

              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="طريقة الدفع"
              >
                {paymentOptions.map((option) => {
                  const selected = selectedPaymentMethod === option.method;
                  const Icon = option.method === "cash" ? Banknote : CreditCard;
                  return (
                    <button
                      key={option.method}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`flex min-h-24 items-center gap-3 rounded-xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "hover:border-primary/40 hover:bg-muted/30"
                      }`}
                      onClick={() => {
                        form.setValue("paymentMethod", option.method, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{option.labelAr}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {option.method === "cash"
                            ? "تسجيل دفع نقدي كامل"
                            : "تسجيل دفع بطاقة / جهاز نقاط بيع"}
                        </span>
                      </span>
                      {selected ? (
                        <CheckCircle2 className="size-5 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {form.formState.errors.paymentMethod?.message ? (
                <p className="mt-2 text-sm font-medium text-destructive" role="alert">
                  {form.formState.errors.paymentMethod.message}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end border-t pt-5">
              <Button
                type="submit"
                disabled={isSubmitting || !selectedPaymentMethod}
                size="lg"
                className="w-full gap-2 sm:w-auto sm:min-w-52"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {isValidatingPrice
                      ? "جاري مراجعة البيانات..."
                      : "جاري إنشاء الاشتراك..."}
                  </>
                ) : (
                  <>
                    <FileCheck2 className="size-4" />
                    إنشاء الاشتراك
                  </>
                )}
              </Button>
            </div>
          </div>
        </section>

        <div className="pb-8" />
      </form>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
