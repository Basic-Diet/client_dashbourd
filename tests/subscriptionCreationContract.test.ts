import { describe, expect, it } from "vitest";

import createSubscriptionSchema from "../src/lib/validations/createSubscriptionSchema";
import {
  buildSubscriptionCreationPayload,
  buildSubscriptionQuotePayload,
} from "../src/utils/buildSubscriptionCreationPayload";
import { isSelectablePremiumMeal } from "../src/components/pages/subscriptions/create/PremiumMealsSection";

const baseData = {
  userId: "USER_ID",
  planId: "PLAN_ID",
  grams: 150,
  mealsPerDay: 2,
  startDate: "2026-07-21",
  premiumItems: [],
  addons: [],
  paymentMethod: "cash" as const,
  delivery: {
    type: "pickup" as const,
    zoneId: "STALE_ZONE",
    pickupLocationId: "PICKUP_LOCATION_ID",
    address: {
      label: "Home",
      city: "Riyadh",
      district: "District",
      street: "Street",
      building: "12",
    },
    slot: {
      type: "pickup",
      window: "12:00-14:00",
      slotId: "PICKUP_SLOT_ID",
    },
  },
};

describe("subscription creation contract", () => {
  it("requires an explicit payment method", () => {
    const { paymentMethod: _paymentMethod, ...withoutPayment } = baseData;
    const result = createSubscriptionSchema.safeParse(withoutPayment);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.paymentMethod).toContain(
        "يرجى اختيار طريقة الدفع"
      );
    }
  });

  it.each(["cash", "visa"] as const)(
    "sends only payment.method for %s and keeps quote unchanged",
    (paymentMethod) => {
      const parsed = createSubscriptionSchema.parse({
        ...baseData,
        paymentMethod,
      });
      const createPayload = buildSubscriptionCreationPayload(parsed);
      const quotePayload = buildSubscriptionQuotePayload(parsed);

      expect(createPayload.payment).toEqual({ method: paymentMethod });
      expect(quotePayload).not.toHaveProperty("payment");
      expect(createPayload).not.toHaveProperty("paymentStatus");
      expect(createPayload).not.toHaveProperty("collectedAmountHalala");
      expect(createPayload).not.toHaveProperty("amountHalala");
      expect(createPayload).not.toHaveProperty("paymentUrl");
      expect(createPayload).not.toHaveProperty("providerInvoiceId");
    }
  );

  it("uses premiumKey and canonical addon fields only", () => {
    const parsed = createSubscriptionSchema.parse({
      ...baseData,
      premiumItems: [
        { premiumKey: " beef_steak ", qty: 2 },
        { premiumKey: "premium_large_salad", qty: 1 },
        { premiumKey: "qa_premium_protein", qty: 1 },
      ],
      addons: [{ addonPlanId: " ADDON_PLAN_ID ", quantityPerDay: 1 }],
    });

    const payload = buildSubscriptionCreationPayload(parsed);

    expect(payload.premiumItems).toEqual([
      { premiumKey: "beef_steak", qty: 2 },
      { premiumKey: "premium_large_salad", qty: 1 },
      { premiumKey: "qa_premium_protein", qty: 1 },
    ]);
    expect(payload.addons).toEqual([
      { addonPlanId: "ADDON_PLAN_ID", quantityPerDay: 1 },
    ]);
    expect(payload.delivery).toEqual({
      type: "pickup",
      pickupLocationId: "PICKUP_LOCATION_ID",
      slot: {
        type: "pickup",
        window: "12:00-14:00",
        slotId: "PICKUP_SLOT_ID",
      },
    });

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("premiumMealId");
    expect(serialized).not.toContain("proteinId");
    expect(serialized).not.toContain("configId");
    expect(serialized).not.toContain("sourceId");
    expect(serialized).not.toContain("addonSubscriptions");
    expect(serialized).not.toContain("STALE_ZONE");
  });

  it("preserves delivery fields and excludes pickup-only fields", () => {
    const parsed = createSubscriptionSchema.parse({
      ...baseData,
      delivery: {
        ...baseData.delivery,
        type: "delivery" as const,
        zoneId: "ZONE_ID",
        pickupLocationId: "STALE_PICKUP",
        slot: {
          type: "delivery",
          window: "12:00-14:00",
          slotId: "DELIVERY_SLOT_ID",
        },
      },
    });

    const payload = buildSubscriptionCreationPayload(parsed);
    expect(payload.delivery).toMatchObject({
      type: "delivery",
      zoneId: "ZONE_ID",
      window: "12:00-14:00",
      slot: {
        type: "delivery",
        window: "12:00-14:00",
        slotId: "DELIVERY_SLOT_ID",
      },
    });
    expect(payload.delivery).not.toHaveProperty("pickupLocationId");
  });

  it("allows empty optional sections", () => {
    const payload = buildSubscriptionCreationPayload(
      createSubscriptionSchema.parse(baseData)
    );
    expect(payload.premiumItems).toEqual([]);
    expect(payload.addons).toEqual([]);
  });

  it.each([1, 2, 10])("accepts positive integer premium quantity %s", (qty) => {
    expect(
      createSubscriptionSchema.safeParse({
        ...baseData,
        premiumItems: [{ premiumKey: "salmon", qty }],
      }).success
    ).toBe(true);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid premium quantity %s", (qty) => {
    expect(
      createSubscriptionSchema.safeParse({
        ...baseData,
        premiumItems: [{ premiumKey: "shrimp", qty }],
      }).success
    ).toBe(false);
  });

  it("filters malformed, inactive, unavailable, and unhealthy premium rows", () => {
    const ready = {
      id: "CONFIG_ID",
      premiumKey: "beef_steak",
      name: "Beef Steak",
      health: "ready",
    };

    expect(isSelectablePremiumMeal(ready)).toBe(true);
    expect(isSelectablePremiumMeal({ ...ready, premiumKey: "" })).toBe(false);
    expect(isSelectablePremiumMeal({ ...ready, isActive: false })).toBe(false);
    expect(
      isSelectablePremiumMeal({ ...ready, availableForSubscription: false })
    ).toBe(false);
    expect(isSelectablePremiumMeal({ ...ready, health: "broken" })).toBe(false);
    expect(
      isSelectablePremiumMeal({
        id: "LEGACY_BUILDER_PROTEIN_ID",
        premiumKey: "qa_premium_protein",
        name: "QA Premium Protein",
        legacy: true,
      })
    ).toBe(true);
  });
});
