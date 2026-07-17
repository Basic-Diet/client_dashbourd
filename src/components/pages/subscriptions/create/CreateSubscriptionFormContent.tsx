import { useEffect, useMemo, useRef, useState } from "react";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import {
  useDashboardSubscriptionCreateMutation,
  useDashboardSubscriptionQuoteMutation,
} from "@/hooks/useSubscriptionCreation";
import {
  buildDashboardSubscriptionSelectionPayload,
  buildCashCreatePayload,
  getQuotePricingTotalHalala,
  isCollectedAmountMismatchError,
} from "@/utils/fetchSubscriptionCreation";
import type {
  DashboardSubscriptionQuoteResponse,
  DashboardSubscriptionSelectionPayload,
  SubscriptionCreationCustomerSummary,
} from "@/types/subscriptionCreationTypes";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, FileCheck2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserRoles } from "@/types/auth";

import { UserSelectionSection } from "./UserSelectionSection";
import { PlanSelectionSection } from "./PlanSelectionSection";
import { PremiumMealsSection } from "./PremiumMealsSection";
import { AddonsSection } from "./AddonsSection";
import { DeliverySection } from "./DeliverySection";
import { SubscriptionQuoteReview } from "./SubscriptionQuoteReview";

interface CreateSubscriptionFormContentProps {
  /** Pre-set userId (when creating from user page). If provided, user selection is hidden. */
  userId?: string;
  customerSummary?: SubscriptionCreationCustomerSummary;
}

type ApiRecord = Record<string, unknown>;

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

export function CreateSubscriptionFormContent({
  userId,
  customerSummary,
}: CreateSubscriptionFormContentProps) {
  const form = useCreateSubscriptionForm(userId || "");
  const navigate = useNavigate();
  const { user } = useAuth();
  const quoteMutation = useDashboardSubscriptionQuoteMutation();
  const createMutation = useDashboardSubscriptionCreateMutation();
  const quoteInFlightRef = useRef(false);
  const createInFlightRef = useRef(false);
  const [quote, setQuote] = useState<DashboardSubscriptionQuoteResponse | null>(null);
  const [quotedSelection, setQuotedSelection] =
    useState<DashboardSubscriptionSelectionPayload | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [requoteRequired, setRequoteRequired] = useState(false);
  const [selectedCustomerSummary, setSelectedCustomerSummary] =
    useState<SubscriptionCreationCustomerSummary | null>(
      customerSummary ?? null
    );
  const [quotedCustomerSummary, setQuotedCustomerSummary] =
    useState<SubscriptionCreationCustomerSummary | null>(null);

  const currentSelection = form.watch();
  const currentPayload = useMemo(() => {
    try {
      return buildDashboardSubscriptionSelectionPayload(currentSelection);
    } catch {
      return null;
    }
  }, [currentSelection]);
  const isQuoteStale =
    Boolean(quote && quotedSelection && currentPayload) &&
    JSON.stringify(currentPayload) !== JSON.stringify(quotedSelection);
  const createBlocked = isQuoteStale || requoteRequired || quoteMutation.isPending;
  const isSubmitting = quoteMutation.isPending || createMutation.isPending;

  useEffect(() => {
    if (isQuoteStale) {
      setCashConfirmed(false);
    }
  }, [isQuoteStale]);

  const onSubmit = async (data: CreateSubscriptionSchemaType) => {
    if (quoteInFlightRef.current || createMutation.isPending) return;
    const payload = buildDashboardSubscriptionSelectionPayload(data);
    const matchingCustomer =
      selectedCustomerSummary?.id === payload.userId
        ? selectedCustomerSummary
        : customerSummary?.id === payload.userId
          ? customerSummary
          : null;

    try {
      quoteInFlightRef.current = true;
      setQuoteError(null);
      setCreateError(null);
      setCashConfirmed(false);
      const response = await quoteMutation.mutateAsync(payload);
      setQuote(response);
      setQuotedSelection(payload);
      setQuotedCustomerSummary(matchingCustomer);
      setCashConfirmed(false);
      setRequoteRequired(false);
    } catch (error: unknown) {
      if (!quote) {
        setQuote(null);
        setQuotedSelection(null);
        setQuotedCustomerSummary(null);
      }
      setQuoteError(
        getApiErrorMessage(error) || "تعذر مراجعة السعر. تحقق من البيانات وحاول مرة أخرى."
      );
    } finally {
      quoteInFlightRef.current = false;
    }
  };

  const handleCreate = async () => {
    if (
      !quote ||
      !quotedSelection ||
      createInFlightRef.current ||
      quoteMutation.isPending ||
      createBlocked
    ) {
      return;
    }
    const total = getQuotePricingTotalHalala(quote);
    if (!total.ok) {
      setCreateError(total.message);
      setCashConfirmed(false);
      return;
    }

    try {
      createInFlightRef.current = true;
      setCreateError(null);
      const response = await createMutation.mutateAsync(
        buildCashCreatePayload({ quotedSelection, quote })
      );
      const subscriptionId = readSubscriptionId(response);
      const subscriptionLabel = readSubscriptionLabel(response);

      ToastMessage(
        subscriptionLabel
          ? `تم إنشاء الاشتراك بنجاح (${subscriptionLabel})`
          : "تم إنشاء الاشتراك بنجاح",
        "success"
      );

      if (subscriptionId) {
        if (user?.role === UserRoles.CASHIER) {
          navigate({
            to: "/users/$userId",
            params: { userId: quotedSelection.userId },
          });
        } else {
          navigate({
            to: "/subscriptions/$subscriptionId",
            params: { subscriptionId },
          });
        }
        return;
      }

      if (quotedSelection.userId) {
        navigate({ to: "/users/$userId", params: { userId: quotedSelection.userId } });
      } else {
        navigate({ to: "/subscriptions" });
      }
    } catch (error: unknown) {
      const message =
        getApiErrorMessage(error) ||
        "تعذر إنشاء الاشتراك. احتفظنا بعرض السعر للمراجعة.";
      setCreateError(message);
      if (isCollectedAmountMismatchError(error)) {
        setCashConfirmed(false);
        setRequoteRequired(true);
      }
    } finally {
      createInFlightRef.current = false;
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl" dir="rtl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={createMutation.isPending} className="space-y-6">
          {/* Step 1: User selection (only if no userId provided) */}
          {!userId && (
            <UserSelectionSection
              form={form}
              onCustomerSelect={setSelectedCustomerSummary}
            />
          )}

          {/* Step 2: Plan selection */}
          <PlanSelectionSection form={form} />

          {/* Step 3: Premium meals */}
          <PremiumMealsSection form={form} />

          {/* Step 4: Addons */}
          <AddonsSection form={form} />

          {/* Step 5: Delivery */}
          <DeliverySection form={form} />

          <div className="rounded-lg border bg-card p-4">
            <Label htmlFor="promoCode">كود الخصم</Label>
            <Input
              id="promoCode"
              className="mt-2"
              placeholder="اختياري"
              {...form.register("promoCode")}
            />
          </div>
        </fieldset>

        {quoteError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {quoteError}
          </div>
        ) : null}

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="min-w-52 gap-2"
          >
            {quoteMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جاري مراجعة السعر...
              </>
            ) : (
              <>
                <FileCheck2 className="size-4" />
                مراجعة السعر
              </>
            )}
          </Button>
        </div>

        {quote && quotedSelection ? (
          <SubscriptionQuoteReview
            quote={quote}
            quotedSelection={quotedSelection}
            stale={isQuoteStale}
            requoteRequired={requoteRequired}
            quotePending={quoteMutation.isPending}
            customerSummary={quotedCustomerSummary}
            cashConfirmed={cashConfirmed}
            createPending={createMutation.isPending}
            createError={createError}
            onCashConfirmedChange={setCashConfirmed}
            onCreate={handleCreate}
          />
        ) : null}
      </form>
    </div>
  );
}
