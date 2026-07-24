import { describe, expect, it } from "vitest";

import createSubscriptionSchema, {
  DELIVERY_SLOT_REQUIRED_MESSAGE,
} from "../src/lib/validations/createSubscriptionSchema";
import {
  buildSubscriptionCreationPayload,
  buildSubscriptionQuotePayload,
} from "../src/utils/buildSubscriptionCreationPayload";
import { isSelectablePremiumMeal } from "../src/components/pages/subscriptions/create/PremiumMealsSection";
import {
  getDeliverySlotSelectionValues,
  getSubscriptionFulfillmentResetValues,
} from "../src/utils/subscriptionFulfillmentState";

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

const deliveryData = {
  ...baseData,
  delivery: {
    ...baseData.delivery,
    type: "delivery" as const,
    zoneId: "ZONE_ID",
    pickupLocationId: "STALE_PICKUP",
    slot: {
      type: "delivery",
      window: "10:00-12:00",
      slotId: "DELIVERY_SLOT_ID",
    },
  },
};

function issuePaths(
  result: ReturnType<typeof createSubscriptionSchema.safeParse>
) {
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

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
          window: "10:00-12:00",
          slotId: "DELIVERY_SLOT_ID",
        },
      },
    });

    const payload = buildSubscriptionCreationPayload(parsed);
    expect(payload.delivery).toMatchObject({
      type: "delivery",
      zoneId: "ZONE_ID",
      window: "10:00-12:00",
      slot: {
        type: "delivery",
        window: "10:00-12:00",
        slotId: "DELIVERY_SLOT_ID",
      },
    });
    expect(payload.delivery).not.toHaveProperty("pickupLocationId");
  });

  it("accepts delivery when both backend slot id and window are selected", () => {
    expect(createSubscriptionSchema.safeParse(deliveryData).success).toBe(true);
  });

  it.each([
    ["empty slotId", "", "10:00-12:00", "delivery.slot.slotId"],
    ["whitespace slotId", "   ", "10:00-12:00", "delivery.slot.slotId"],
    ["empty window", "DELIVERY_SLOT_ID", "", "delivery.slot.window"],
    ["whitespace window", "DELIVERY_SLOT_ID", "   ", "delivery.slot.window"],
  ])("rejects delivery with %s", (_label, slotId, window, expectedPath) => {
    const result = createSubscriptionSchema.safeParse({
      ...deliveryData,
      delivery: {
        ...deliveryData.delivery,
        slot: {
          type: "delivery",
          slotId,
          window,
        },
      },
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContainEqual({
      path: expectedPath,
      message: DELIVERY_SLOT_REQUIRED_MESSAGE,
    });
  });

  it("reports independent slotId and window errors when both delivery fields are empty", () => {
    const result = createSubscriptionSchema.safeParse({
      ...deliveryData,
      delivery: {
        ...deliveryData.delivery,
        slot: {
          type: "delivery",
          window: "",
          slotId: "",
        },
      },
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(
      expect.arrayContaining([
        {
          path: "delivery.slot.slotId",
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
        },
        {
          path: "delivery.slot.window",
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
        },
      ])
    );
  });

  it("does not apply delivery slot validation to pickup subscriptions", () => {
    const result = createSubscriptionSchema.safeParse({
      ...baseData,
      delivery: {
        ...baseData.delivery,
        type: "pickup" as const,
        slot: {
          type: "pickup",
          window: "",
          slotId: "",
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it("preserves the exact selected delivery slot values in the canonical payload", () => {
    const parsed = createSubscriptionSchema.parse(deliveryData);
    const payload = buildSubscriptionCreationPayload(parsed);

    expect(payload.delivery).toEqual({
      type: "delivery",
      zoneId: "ZONE_ID",
      address: deliveryData.delivery.address,
      window: "10:00-12:00",
      slot: {
        type: "delivery",
        window: "10:00-12:00",
        slotId: "DELIVERY_SLOT_ID",
      },
    });
  });

  it.each(["cash", "visa"] as const)(
    "keeps quote payment-free and adds only payment.method to create for %s",
    (paymentMethod) => {
      const parsed = createSubscriptionSchema.parse({
        ...deliveryData,
        paymentMethod,
      });
      const quotePayload = buildSubscriptionQuotePayload(parsed);
      const createPayload = buildSubscriptionCreationPayload(parsed);

      expect(quotePayload).not.toHaveProperty("payment");
      expect(createPayload.payment).toEqual({ method: paymentMethod });
      expect(Object.keys(createPayload.payment)).toEqual(["method"]);
      expect(quotePayload.delivery).toEqual({
        type: "delivery",
        zoneId: "ZONE_ID",
        address: deliveryData.delivery.address,
        window: "10:00-12:00",
        slot: {
          type: "delivery",
          window: "10:00-12:00",
          slotId: "DELIVERY_SLOT_ID",
        },
      });
      expect(createPayload.delivery).toEqual(quotePayload.delivery);

      if (
        quotePayload.delivery.type === "delivery" &&
        createPayload.delivery.type === "delivery"
      ) {
        expect(quotePayload.delivery.slot.slotId).toBe("DELIVERY_SLOT_ID");
        expect(createPayload.delivery.slot.slotId).toBe("DELIVERY_SLOT_ID");
        expect(createPayload.delivery.slot.slotId).toBe(
          quotePayload.delivery.slot.slotId
        );
        expect(quotePayload.delivery.slot.window).toBe("10:00-12:00");
        expect(createPayload.delivery.slot.window).toBe("10:00-12:00");
        expect(createPayload.delivery.slot.window).toBe(
          quotePayload.delivery.slot.window
        );
        expect(createPayload.delivery.window).toBe(
          quotePayload.delivery.window
        );
      }

      const createPayloadWithoutPayment = {
        ...createPayload,
        payment: undefined,
      };
      delete createPayloadWithoutPayment.payment;
      expect(createPayloadWithoutPayment).toEqual(quotePayload);
      expect(JSON.stringify(createPayload)).not.toContain("PICKUP_SLOT_ID");
    }
  );

  it("does not generate or guess a delivery slot id", () => {
    const parsed = createSubscriptionSchema.parse(deliveryData);
    const quotePayload = buildSubscriptionQuotePayload(parsed);
    const createPayload = buildSubscriptionCreationPayload(parsed);

    expect(JSON.stringify(quotePayload)).toContain("DELIVERY_SLOT_ID");
    expect(JSON.stringify(createPayload)).toContain("DELIVERY_SLOT_ID");
    expect(JSON.stringify(quotePayload)).not.toContain("generated");
    expect(JSON.stringify(createPayload)).not.toContain("generated");
  });

  it("does not call quote or create when delivery slot validation fails", async () => {
    const quote = vi.fn().mockResolvedValue({ status: true });
    const create = vi.fn().mockResolvedValue({ status: true });
    const result = createSubscriptionSchema.safeParse({
      ...deliveryData,
      delivery: {
        ...deliveryData.delivery,
        slot: {
          type: "delivery",
          window: "",
          slotId: "",
        },
      },
    });

    if (result.success) {
      const payload = buildSubscriptionCreationPayload(result.data);
      await quote(payload);
      await create(payload);
    }

    expect(quote).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("selecting a backend delivery slot stores the backend id and window with delivery type", () => {
    expect(
      getDeliverySlotSelectionValues({
        id: "DELIVERY_SLOT_ID",
        type: "pickup",
        window: "10:00-12:00",
        label: "10:00-12:00",
      })
    ).toEqual({
      type: "delivery",
      window: "10:00-12:00",
      slotId: "DELIVERY_SLOT_ID",
    });
  });

  it("switching delivery to pickup clears stale delivery slot data", () => {
    expect(
      getSubscriptionFulfillmentResetValues("pickup", "PICKUP_LOCATION_ID")
    ).toEqual({
      type: "pickup",
      zoneId: "",
      pickupLocationId: "PICKUP_LOCATION_ID",
      slot: {
        type: "pickup",
        window: "",
        slotId: "",
      },
    });
  });

  it("switching pickup to delivery clears pickup state and requires a fresh delivery period", () => {
    const resetValues = getSubscriptionFulfillmentResetValues("delivery");
    const result = createSubscriptionSchema.safeParse({
      ...baseData,
      delivery: {
        ...baseData.delivery,
        ...resetValues,
        zoneId: "ZONE_ID",
      },
    });

    expect(resetValues).toEqual({
      type: "delivery",
      pickupLocationId: "",
      slot: {
        type: "delivery",
        window: "",
        slotId: "",
      },
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toEqual(
      expect.arrayContaining([
        {
          path: "delivery.slot.slotId",
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
        },
        {
          path: "delivery.slot.window",
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
        },
      ])
    );
  });

  it("rejects a stale pickup slot submitted under delivery", () => {
    const result = createSubscriptionSchema.safeParse({
      ...deliveryData,
      delivery: {
        ...deliveryData.delivery,
        slot: {
          type: "pickup",
          window: "12:00-14:00",
          slotId: "PICKUP_SLOT_ID",
        },
      },
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContainEqual({
      path: "delivery.slot.slotId",
      message: DELIVERY_SLOT_REQUIRED_MESSAGE,
    });
  });

  it("switching to pickup prevents stale delivery slot values from being submitted as pickup data", () => {
    const resetValues = getSubscriptionFulfillmentResetValues(
      "pickup",
      "PICKUP_LOCATION_ID"
    );
    const payload = buildSubscriptionCreationPayload(
      createSubscriptionSchema.parse({
        ...baseData,
        delivery: {
          ...baseData.delivery,
          ...resetValues,
        },
      })
    );

    expect(payload.delivery).toEqual({
      type: "pickup",
      pickupLocationId: "PICKUP_LOCATION_ID",
      slot: {
        type: "pickup",
        window: "",
        slotId: "",
      },
    });
    expect(JSON.stringify(payload)).not.toContain("DELIVERY_SLOT_ID");
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

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects invalid premium quantity %s",
    (qty) => {
      expect(
        createSubscriptionSchema.safeParse({
          ...baseData,
          premiumItems: [{ premiumKey: "shrimp", qty }],
        }).success
      ).toBe(false);
    }
  );

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
