import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";
import {
  buildDashboardSubscriptionSelectionPayload,
  buildCashCreatePayload,
  getQuotePricingTotalHalala,
  quoteDashboardSubscription,
  createDashboardSubscription,
} from "../src/utils/fetchSubscriptionCreation";
import type { CreateSubscriptionSchemaType } from "../src/lib/validations/createSubscriptionSchema";

const apiPostMock = vi.fn();

vi.mock("@/lib/apis", () => ({
  default: {
    post: (...args: unknown[]) => apiPostMock(...args),
    get: vi.fn(),
  },
}));

const baseForm: CreateSubscriptionSchemaType = {
  userId: "user-1",
  planId: "plan-1",
  grams: 200,
  mealsPerDay: 2,
  startDate: "2026-07-20",
  premiumItems: [{ premiumKey: "premium-chicken", qty: 2 }],
  addons: [{ addonId: "addon-juice", qty: 3 }],
  promoCode: "SAVE10",
  delivery: {
    type: "delivery",
    zoneId: "zone-1",
    pickupLocationId: "",
    address: {
      label: "Home",
      line1: "Street 1",
      line2: "",
      city: "Riyadh",
      district: "Al Malqa",
      phone: "",
      notes: "",
    },
    slot: { type: "delivery", window: "18:00-20:00", slotId: "slot-1" },
  },
};

const quote = {
  status: true,
  data: {
    plan: {},
    selectedOptions: {},
    delivery: {},
    premiumItems: [],
    addonPlans: [],
    pricing: { totalHalala: 12345, currency: "SAR" },
    totalHalala: 12345,
  },
} as const;

describe("subscription creation contract", () => {
  it("uses the exact quote endpoint", async () => {
    apiPostMock.mockResolvedValueOnce({ data: quote });
    const payload = buildDashboardSubscriptionSelectionPayload(baseForm);

    await quoteDashboardSubscription(payload);

    assert.equal(apiPostMock.mock.calls[0][0], "/api/dashboard/subscriptions/quote");
    assert.deepEqual(apiPostMock.mock.calls[0][1], payload);
  });

  it("uses the exact create endpoint", async () => {
    apiPostMock.mockResolvedValueOnce({ data: { status: true, data: { id: "sub-1" } } });
    const payload = buildCashCreatePayload({
      quotedSelection: buildDashboardSubscriptionSelectionPayload(baseForm),
      quote,
      paidAt: "2026-07-17T00:00:00.000Z",
    });

    await createDashboardSubscription(payload);

    assert.equal(apiPostMock.mock.calls.at(-1)?.[0], "/api/dashboard/subscriptions");
    assert.deepEqual(apiPostMock.mock.calls.at(-1)?.[1], payload);
  });

  it("builds canonical delivery payload without legacy fields", () => {
    const payload = buildDashboardSubscriptionSelectionPayload(baseForm);

    assert.equal(payload.delivery.type, "delivery");
    assert.equal(payload.delivery.window, "18:00-20:00");
    assert.equal("pickupLocationId" in payload.delivery, false);
    assert.equal("slot" in payload.delivery, false);
    assert.deepEqual(payload.premiumItems, [{ premiumKey: "premium-chicken", qty: 2 }]);
    assert.deepEqual(payload.addons, [{ addonId: "addon-juice", qty: 3 }]);
    assert.equal("addonSubscriptions" in payload, false);
  });

  it("builds canonical pickup payload without delivery fields", () => {
    const payload = buildDashboardSubscriptionSelectionPayload({
      ...baseForm,
      premiumItems: [],
      addons: [],
      promoCode: "",
      delivery: {
        ...baseForm.delivery,
        type: "pickup",
        zoneId: "",
        pickupLocationId: "pickup-1",
        slot: { type: "pickup", window: "", slotId: "" },
      },
    });

    assert.deepEqual(payload, {
      userId: "user-1",
      planId: "plan-1",
      grams: 200,
      mealsPerDay: 2,
      startDate: "2026-07-20",
      delivery: { type: "pickup", pickupLocationId: "pickup-1" },
    });
  });

  it("prefers pricing total and rejects conflicting aliases", () => {
    assert.deepEqual(getQuotePricingTotalHalala(quote).ok, true);
    assert.equal(getQuotePricingTotalHalala(quote).totalHalala, 12345);

    const conflict = {
      ...quote,
      data: { ...quote.data, totalHalala: 999 },
    };
    assert.equal(getQuotePricingTotalHalala(conflict).ok, false);
  });

  it("cashier payment uses exact quote total and source contract", () => {
    const payload = buildCashCreatePayload({
      quotedSelection: buildDashboardSubscriptionSelectionPayload(baseForm),
      quote,
      paidAt: "2026-07-17T00:00:00.000Z",
    });

    assert.deepEqual(payload.payment, {
      method: "cash",
      status: "paid",
      collectedAmountHalala: 12345,
      paidAt: "2026-07-17T00:00:00.000Z",
    });
    assert.equal(payload.source, "dashboard_cashier");
  });
});
