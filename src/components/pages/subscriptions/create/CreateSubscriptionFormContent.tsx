import { useEffect, useState } from "react";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { buildSubscriptionCreationPayload } from "@/utils/buildSubscriptionCreationPayload";
import { fetchSubscriptionQuote } from "@/utils/fetchSubscriptionsData";
import { useNavigate } from "@tanstack/react-router";
import { Calculator, FileCheck2, Loader2, ReceiptText } from "lucide-react";

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

type SubscriptionQuoteSummary = {
  totalHalala: number;
  basePlanPriceHalala?: number;
  premiumTotalHalala?: number;
  addonsTotalHalala?: number;
  currency: string;
};

function asRecord(value: unknown): ApiRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function readQuoteSummary(response: unknown): SubscriptionQuoteSummary | null {
  const data = asRecord(asRecord(response)?.data);
  const pricingSummary = asRecord(data?.pricingSummary);
  const breakdown = asRecord(data?.breakdown);

  const totalHalala =
    readFiniteNumber(pricingSummary?.totalPriceHalala) ??
    readFiniteNumber(breakdown?.totalHalala);

  if (totalHalala === null) return null;

  const premiumItems = Array.isArray(data?.premiumItems) ? data.premiumItems : [];
  const addonPlans = Array.isArray(data?.addonPlans) ? data.addonPlans : [];
  const sumItems = (items: unknown[]): number =>
    items.reduce<number>((total, item) => {
      const itemTotal = readFiniteNumber(asRecord(item)?.totalHalala);
      return total + (itemTotal ?? 0);
    }, 0);

  return {
    totalHalala,
    basePlanPriceHalala:
      readFiniteNumber(breakdown?.basePlanPriceHalala) ?? undefined,
    premiumTotalHalala: premiumItems.length ? sumItems(premiumItems) : undefined,
    addonsTotalHalala: addonPlans.length ? sumItems(addonPlans) : undefined,
    currency:
      readString(pricingSummary?.currency) ||
      readString(breakdown?.currency) ||
      "SAR",
  };
}

function formatMoney(halala: number, currency: string) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(halala / 100);
}

export function CreateSubscriptionFormContent({
  userId,
}: CreateSubscriptionFormContentProps) {
  const form = useCreateSubscriptionForm(userId || "");
  const navigate = useNavigate();
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteSummary, setQuoteSummary] =
    useState<SubscriptionQuoteSummary | null>(null);
  const { mutateAsync, isPending } = useCreateSubscriptionMutation();
  const isSubmitting = isPending || isQuoting;

  useEffect(() => {
    const subscription = form.watch(() => {
      setQuoteSummary(null);
    });

    return () => subscription.unsubscribe();
  }, [form]);

  const requestQuote = async (data: CreateSubscriptionSchemaType) => {
    const payload = buildSubscriptionCreationPayload(data);

    try {
      setIsQuoting(true);
      const response = await fetchSubscriptionQuote(payload);
      const summary = readQuoteSummary(response);

      if (!summary) {
        throw new Error("تعذر قراءة إجمالي الاشتراك من استجابة الخادم.");
      }

      setQuoteSummary(summary);
      ToastMessage("تم حساب إجمالي الاشتراك بنجاح", "success");
    } catch (error: unknown) {
      setQuoteSummary(null);
      ToastMessage(
        getApiErrorMessage(error) || "تعذر حساب إجمالي الاشتراك",
        "error"
      );
    } finally {
      setIsQuoting(false);
    }
  };

  const onSubmit = async (data: CreateSubscriptionSchemaType) => {
    if (!quoteSummary) {
      await requestQuote(data);
      return;
    }

    const payload = buildSubscriptionCreationPayload(data);

    try {
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
        <PlanSelectionSection form={form} />
        <PremiumMealsSection form={form} />
        <AddonsSection form={form} />
        <DeliverySection form={form} />

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="flex items-start gap-3 border-b px-4 py-4 sm:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">إجمالي الاشتراك</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                احسب السعر النهائي من الخادم قبل إنشاء الاشتراك.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {quoteSummary ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 rounded-xl bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    الإجمالي النهائي
                  </span>
                  <strong className="text-2xl font-bold text-primary">
                    {formatMoney(
                      quoteSummary.totalHalala,
                      quoteSummary.currency
                    )}
                  </strong>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  {quoteSummary.basePlanPriceHalala !== undefined ? (
                    <QuoteLine
                      label="سعر الباقة"
                      value={formatMoney(
                        quoteSummary.basePlanPriceHalala,
                        quoteSummary.currency
                      )}
                    />
                  ) : null}
                  {quoteSummary.premiumTotalHalala !== undefined ? (
                    <QuoteLine
                      label="الوجبات المميزة"
                      value={formatMoney(
                        quoteSummary.premiumTotalHalala,
                        quoteSummary.currency
                      )}
                    />
                  ) : null}
                  {quoteSummary.addonsTotalHalala !== undefined ? (
                    <QuoteLine
                      label="الإضافات"
                      value={formatMoney(
                        quoteSummary.addonsTotalHalala,
                        quoteSummary.currency
                      )}
                    />
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  السعر محسوب من الـ Backend وهو السعر المعتمد عند إنشاء الاشتراك.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
                أكمل بيانات الاشتراك ثم اضغط على «حساب الإجمالي».
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting}
                className="gap-2 sm:min-w-44"
                onClick={form.handleSubmit(requestQuote)}
              >
                {isQuoting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Calculator className="size-4" />
                )}
                {isQuoting ? "جاري حساب الإجمالي..." : "حساب الإجمالي"}
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !quoteSummary}
                size="lg"
                className="gap-2 sm:min-w-52"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    جاري إنشاء الاشتراك...
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

function QuoteLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
