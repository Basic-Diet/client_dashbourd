import assert from "node:assert/strict";
import { describe, expect, it, vi } from "vitest";
import {
  buildManualDeductionPayload,
  getFulfillmentLabel,
  mapManualDeductionError,
  normalizeManualDeductionSearchResponse,
  type ManualDeductionSearchSuccessResponse,
} from "../src/components/pages/manual-deduction/manualDeductionModel";

const apiGetMock = vi.fn();

vi.mock("@/lib/apis", () => ({
  default: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

const makeSearchResponse = (): ManualDeductionSearchSuccessResponse => ({
  status: true,
  data: {
    customer: { id: "customer-1", name: "Ahmed", phone: "050 123" },
    subscription: {
      id: "sub-default",
      planName: "Default Plan",
      status: "active",
      fulfillmentMethod: "delivery",
      totalMeals: 20,
      consumedMeals: 5,
      remainingMeals: 15,
      remainingRegularMeals: 12,
      remainingPremiumMeals: 3,
      addonBalances: [],
    },
    subscriptions: [
      {
        id: "sub-default",
        planName: "Default Plan",
        status: "active",
        fulfillmentMethod: "delivery",
        totalMeals: 20,
        consumedMeals: 5,
        remainingMeals: 15,
        remainingRegularMeals: 12,
        remainingPremiumMeals: 3,
        addonBalances: [],
      },
      {
        id: "sub-sibling",
        planName: "Sibling Plan",
        status: "active",
        fulfillmentMethod: "delivery",
        totalMeals: 10,
        consumedMeals: 0,
        remainingMeals: 10,
        remainingRegularMeals: 10,
        remainingPremiumMeals: 0,
        addonBalances: [
          {
            addonId: "addon-zero",
            addonPlanId: "addon-zero-plan",
            name: "Water",
            category: "drink",
            purchasedDailyQty: 1,
            includedTotalQty: 2,
            remainingQty: 0,
            totalQty: 2,
            purchasedQty: 2,
            consumedQty: 2,
            reservedQty: 0,
          },
        ],
      },
    ],
    today: {
      businessDate: "2026-07-17",
      hasDeliveryDeductionToday: true,
      lastDeductionAt: "2026-07-17T10:00:00.000Z",
    },
  },
});

describe("manual deduction contract helpers", () => {
  it("search uses the exact encoded endpoint and status envelope", async () => {
    apiGetMock.mockResolvedValueOnce({ status: 200, data: makeSearchResponse() });
    const { searchSubscriptionsByPhone } = await import(
      "../src/utils/fetchSubscriptionsData"
    );

    const response = await searchSubscriptionsByPhone("050 123");

    assert.equal(response.status, true);
    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/dashboard/subscriptions/search?phone=050%20123",
      expect.objectContaining({
        suppressGlobalForbiddenToast: true,
        validateStatus: expect.any(Function),
      })
    );
  });

  it("expected 404s become distinct no-result states and unexpected 404 rejects", async () => {
    const { searchSubscriptionsByPhone } = await import(
      "../src/utils/fetchSubscriptionsData"
    );

    apiGetMock.mockResolvedValueOnce({
      status: 404,
      data: { error: { code: "CUSTOMER_NOT_FOUND", message: "not found" } },
    });
    await expect(searchSubscriptionsByPhone("050")).resolves.toMatchObject({
      status: false,
      noResult: { code: "CUSTOMER_NOT_FOUND" },
    });

    apiGetMock.mockResolvedValueOnce({
      status: 404,
      data: { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "none" } },
    });
    await expect(searchSubscriptionsByPhone("050")).resolves.toMatchObject({
      status: false,
      noResult: { code: "SUBSCRIPTION_NOT_FOUND" },
    });

    apiGetMock.mockResolvedValueOnce({
      status: 404,
      data: { error: { code: "SOMETHING_ELSE", message: "bad" } },
    });
    await expect(searchSubscriptionsByPhone("050")).rejects.toThrow(
      "Unexpected manual deduction search 404"
    );
  });

  it("today applies only to data.subscription and preserves sibling zero balances", () => {
    const normalized = normalizeManualDeductionSearchResponse(makeSearchResponse());
    assert.equal(normalized.kind, "found");
    if (normalized.kind !== "found") return;

    const defaultSub = normalized.subscriptions[0];
    const sibling = normalized.subscriptions[1];

    assert.equal(defaultSub.dailyDeduction.blocked, true);
    assert.equal(defaultSub.dailyDeduction.known, true);
    assert.equal(sibling.dailyDeduction.blocked, false);
    assert.equal(sibling.dailyDeduction.known, false);
    assert.equal(sibling.addonBalances[0].remainingQty, 0);
  });

  it("builds the exact mutation payload and trims free text", () => {
    assert.deepEqual(
      buildManualDeductionPayload({
        regularMeals: 1,
        premiumMeals: 0,
        addons: [
          { addonId: "a1", name: "Water", qty: 0 },
          { addonId: "a2", name: "Juice", qty: 2 },
        ],
        reason: " cashier_walk_in ",
        notes: " needs receipt ",
      }),
      {
        regularMeals: 1,
        premiumMeals: 0,
        addons: [{ addonId: "a2", qty: 2 }],
        reason: "cashier_walk_in",
        notes: "needs receipt",
      }
    );
  });

  it("rejects malformed add-on quantities before filtering zero quantities", () => {
    expect(() =>
      buildManualDeductionPayload({
        regularMeals: 1,
        premiumMeals: 0,
        addons: [
          { addonId: "a1", name: "Water", qty: 0 },
          { addonId: "a2", name: "Juice", qty: Number.NaN },
        ],
        reason: "cashier_walk_in",
      })
    ).toThrow("INVALID_LOCAL_QUANTITY");
  });

  it("labels missing fulfillment as unavailable", () => {
    assert.equal(getFulfillmentLabel("delivery"), "توصيل");
    assert.equal(getFulfillmentLabel("pickup"), "استلام");
    assert.equal(getFulfillmentLabel(null), "غير متاح");
    assert.equal(getFulfillmentLabel(undefined), "غير متاح");
  });

  it("maps backend English/code errors to stable Arabic fallbacks", () => {
    assert.match(
      mapManualDeductionError({
        response: {
          status: 409,
          data: { error: { code: "INSUFFICIENT_REGULAR_MEALS" } },
        },
      }).message,
      /العادية/
    );
    assert.match(
      mapManualDeductionError({
        response: {
          status: 409,
          data: { error: { code: "DELIVERY_ALREADY_DEDUCTED_TODAY" } },
        },
      }).message,
      /توصيل/
    );
  });
});
