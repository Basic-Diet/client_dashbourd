import { ToastMessage } from "@/components/global/ToastMessage";
import { Button } from "@/components/ui/button";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
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

export function CreateSubscriptionFormContent({
  userId,
}: CreateSubscriptionFormContentProps) {
  const form = useCreateSubscriptionForm(userId || "");
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateSubscriptionMutation();

  const onSubmit = (data: CreateSubscriptionSchemaType) => {
    const payload = {
      ...data,
      addons: data.addons.map((a) => a.value),
    };

    mutate(payload as unknown as Record<string, unknown>, {
      onSuccess: () => {
        ToastMessage("تم إنشاء الاشتراك بنجاح", "success");
        if (userId) {
          navigate({ to: "/users/$userId", params: { userId } });
        } else {
          navigate({ to: "/subscriptions" });
        }
      },
      onError: (error: unknown) => {
        const err = error as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          err?.response?.data?.error?.message ||
          "حدث خطأ أثناء إنشاء الاشتراك";
        ToastMessage(message, "error");
      },
    });
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
            disabled={isPending}
            size="lg"
            className="min-w-52 gap-2"
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
      </form>
    </div>
  );
}
