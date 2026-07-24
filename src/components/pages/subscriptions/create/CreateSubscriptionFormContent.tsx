import { useCallback, useMemo, useState } from "react";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { buildSubscriptionCreationPayload } from "@/utils/buildSubscriptionCreationPayload";
import { fetchSubscriptionQuote } from "@/utils/fetchSubscriptionsData";
import { useNavigate } from "@tanstack/react-router";
import { FileCheck2, Loader2, ReceiptText } from "lucide-react";

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
  const [planPrice, setPlanPrice] = useState<PricePart>({ halala: 0 });
  const [premiumPrice, setPremiumPrice] = useState<PricePart>({ halala: 0 });
  const [addonsPrice, setAddonsPrice] = useState<PricePart>({ halala: 0 });
  const { mutateAsync, isPending } = useCreateSubscriptionMutation();
  const isSubmitting = isPending || isValidatingPrice;

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
    const payload = buildSubscriptionCreationPayload(data);

    try {
      setIsValidatingPrice(true);
      await fetchSubscriptionQuote(payload);
      setIsValidatingPrice(false);

      const response = await mutateAsync(payload);
      const subscriptionId = readSubscriptionId(response);
      const subscriptionLabel = readSubscriptionLabel(response);

      ToastMessage(
        subscriptionLabel
          ? `تم إنشاء الاشتراك بنجاح (${subscriptionLabel})`
          : "تم إنشاء الاشتراك بنجاح",
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

          <div className="space-y-4 p-4 sm:p-6">
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

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
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
