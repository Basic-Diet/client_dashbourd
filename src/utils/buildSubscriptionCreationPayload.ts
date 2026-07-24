import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";

export interface SubscriptionCreationPayload extends Record<string, unknown> {
  userId: string;
  planId: string;
  grams: number;
  mealsPerDay: number;
  startDate: string;
  premiumItems: Array<{
    premiumKey: string;
    qty: number;
  }>;
  addons: Array<{
    addonPlanId: string;
    quantityPerDay: number;
  }>;
  delivery:
    | {
        type: "delivery";
        zoneId: string;
        address: Record<string, unknown>;
        window?: string;
        slot: {
          type: string;
          window: string;
          slotId: string;
        };
      }
    | {
        type: "pickup";
        pickupLocationId: string;
        slot: {
          type: string;
          window: string;
          slotId: string;
        };
      };
  payment: {
    method: "cash" | "visa";
  };
}

export type SubscriptionQuotePayload = Omit<SubscriptionCreationPayload, "payment">;

export function buildSubscriptionCreationPayload(
  data: CreateSubscriptionSchemaType
): SubscriptionCreationPayload {
  const slot = {
    type: data.delivery.slot.type,
    window: data.delivery.slot.window.trim(),
    slotId: data.delivery.slot.slotId,
  };

  const delivery: SubscriptionCreationPayload["delivery"] =
    data.delivery.type === "delivery"
      ? {
          type: "delivery",
          zoneId: data.delivery.zoneId,
          address: data.delivery.address,
          ...(slot.window ? { window: slot.window } : {}),
          slot,
        }
      : {
          type: "pickup",
          pickupLocationId: data.delivery.pickupLocationId || "",
          slot,
        };

  return {
    userId: data.userId,
    planId: data.planId,
    grams: data.grams,
    mealsPerDay: data.mealsPerDay,
    startDate: data.startDate,
    premiumItems: data.premiumItems.map((item) => ({
      premiumKey: item.premiumKey.trim(),
      qty: item.qty,
    })),
    addons: data.addons.map((addon) => ({
      addonPlanId: addon.addonPlanId.trim(),
      quantityPerDay: addon.quantityPerDay,
    })),
    delivery,
    payment: {
      method: data.paymentMethod,
    },
  };
}

export function buildSubscriptionQuotePayload(
  data: CreateSubscriptionSchemaType
): SubscriptionQuotePayload {
  const { payment: _payment, ...quotePayload } =
    buildSubscriptionCreationPayload(data);
  return quotePayload;
}
