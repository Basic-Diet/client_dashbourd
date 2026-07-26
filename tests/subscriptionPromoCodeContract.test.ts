import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import createSubscriptionSchema from "../src/lib/validations/createSubscriptionSchema";
import {
  buildSubscriptionCreationPayload,
  buildSubscriptionQuotePayload,
  normalizePromoCode,
} from "../src/utils/buildSubscriptionCreationPayload";
import {
  readAppliedPromoQuote,
  shouldClearAppliedPromo,
} from "../src/utils/subscriptionPromoQuote";

const baseData = {
  userId: "user-1",
  planId: "plan-1",
  grams: 150,
  mealsPerDay: 3,
  startDate: "2026-07-26",
  premiumItems: [{ premiumKey: "shrimp", qty: 1 }],
  addons: [{ addonPlanId: "addon-1", quantityPerDay: 1 }],
  delivery: {
    type: "pickup" as const,
    zoneId: "",
    pickupLocationId: "pickup-1",
    address: { label: "", city: "", district: "", street: "", building: "" },
    slot: { type: "pickup", window: "12:00-14:00", slotId: "slot-1" },
  },
  paymentMethod: "cash" as const,
};

describe("subscription promo-code contract", () => {
  it("normalizes promo codes and omits empty values", () => {
    expect(normalizePromoCode("  welcome20  ")).toBe("WELCOME20");
    expect(normalizePromoCode("   ")).toBeUndefined();

    const empty = createSubscriptionSchema.parse({
      ...baseData,
      promoCode: "   ",
    });
    expect(buildSubscriptionQuotePayload(empty)).not.toHaveProperty(
      "promoCode"
    );
    expect(buildSubscriptionCreationPayload(empty)).not.toHaveProperty(
      "promoCode"
    );
  });

  it("sends the same normalized promo in quote and creation payloads", () => {
    const parsed = createSubscriptionSchema.parse({
      ...baseData,
      promoCode: "  welcome20  ",
    });
    const quote = buildSubscriptionQuotePayload(parsed);
    const creation = buildSubscriptionCreationPayload(parsed);

    expect(quote.promoCode).toBe("WELCOME20");
    expect(creation.promoCode).toBe("WELCOME20");
    expect(quote).not.toHaveProperty("payment");
    expect(creation.payment).toEqual({ method: "cash" });
  });

  it("reads authoritative promo totals across supported response shapes", () => {
    expect(
      readAppliedPromoQuote(
        {
          data: {
            promoCode: { code: "WELCOME20", discountAmountHalala: 10000 },
            checkoutSummary: {
              pricing: { totalHalala: 90000, currency: "SAR" },
            },
          },
        },
        "WELCOME20"
      )
    ).toEqual({
      code: "WELCOME20",
      discountHalala: 10000,
      grossTotalHalala: 100000,
      totalHalala: 90000,
      currency: "SAR",
    });
  });

  it("clears applied pricing for subscription and promo changes, but not payment", () => {
    for (const field of [
      "userId",
      "planId",
      "grams",
      "mealsPerDay",
      "startDate",
      "premiumItems.0.qty",
      "addons.0.quantityPerDay",
      "delivery.slot.slotId",
      "promoCode",
    ]) {
      expect(shouldClearAppliedPromo(field)).toBe(true);
    }
    expect(shouldClearAppliedPromo("paymentMethod")).toBe(false);
  });

  it("renders promo before the always-present subscription total", () => {
    const source = readFileSync(
      new URL(
        "../src/components/pages/subscriptions/create/CreateSubscriptionFormContent.tsx",
        import.meta.url
      ),
      "utf8"
    );
    expect(source).toContain("<PromoCodeSection");
    expect(source).toContain('data-testid="subscription-total-section"');
    expect(source.indexOf("<PromoCodeSection")).toBeLessThan(
      source.indexOf('data-testid="subscription-total-section"')
    );
    expect(source).toContain("السعر قبل الخصم");
    expect(source).toContain("قيمة الخصم");
    expect(source).toContain("السعر بعد الخصم");
  });
});
