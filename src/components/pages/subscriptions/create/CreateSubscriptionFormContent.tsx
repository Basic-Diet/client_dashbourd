import { useState } from "react";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { fetchSubscriptionQuote } from "@/utils/fetchSubscriptionsData";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, FileCheck2 } from "lucide-react";

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
  return readString(data?.displayId) || readSubscriptionId(response)?.slice(-8) || null;
}

function buildSubscriptionPayload(data: CreateSubscriptionSchemaType): Record<string, unknown> {
  const isDelivery = data.delivery.type === "delivery";
  const deliveryWindow = data.delivery.slot?.window?.trim();
  const delivery = {
    type: data.delivery.type,
    ...(isDelivery
      ? {
          zoneId: data.delivery.zoneId,
          address: data.delivery.address,
        }
      : {
          pickupLocationId: data.delivery.pickupLocationId,
        }),
    ...(deliveryWindow ? { window: deliveryWindow } : {}),
    slot: data.delivery.slot,
  };

  return {
    ...data,
    addons: data.addons.map((addon) => ({
      addonId: addon.value,
      qty: 1,
    })),
    delivery,
  };
}

export function CreateSubscriptionFormContent({
  userId,
}: CreateSubscriptionFormContentProps) {
  const form = useCreateSubscriptionForm(userId || "");
  const navigate = useNavigate();
  const [isQuoting, setIsQuoting] = useState(false);
  const { mutateAsync, isPending } = useCreateSubscriptionMutation();
  const isSubmitting = isPending || isQuoting;

  const onSubmit = async (data: CreateSubscriptionSchemaType) => {
    const payload = buildSubscriptionPayload(data);

    try {
      setIsQuoting(true);
      await fetchSubscriptionQuote(payload);
      setIsQuoting(false);

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
      setIsQuoting(false);
      ToastMessage(getApiErrorMessage(error) || "حدث خطأ أثناء إنشاء الاشتراك", "error");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl" dir="rtl">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: User selection (only if no userId provided) */}
        {!userId && <UserSelectionSection form={form} />}

        {/* Step 2: Plan selection */}
        <PlanSelectionSection form={form} />

        {/* Step 3: Premium meals */}
        <PremiumMealsSection form={form} />

        {/* Step 4: Addons */}
        <AddonsSection form={form} />

        {/* Step 5: Delivery */}
        <DeliverySection form={form} />

        {/* Submit */}
        <div className="flex justify-end pb-8">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="min-w-52 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {isQuoting ? "جاري مراجعة السعر..." : "جاري إنشاء الاشتراك..."}
              </>
            ) : (
              <>
                <FileCheck2 className="size-4" />
                إنشاء الاشتراك
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
