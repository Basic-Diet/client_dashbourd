import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { normalizeDashboardWeightPricingResponse } from "../src/utils/menuResponseNormalizers";

const validResponse = () => ({
  status: true,
  data: {
    contractVersion: "dashboard_weight_pricing.v1",
    product: {
      id: "weighted-product",
      categoryId: "category-1",
      key: "spicy_chicken_meal_100g",
      itemType: "product",
      name: { ar: "منتج", en: "Product" },
      pricingModel: "per_100g",
      priceHalala: 1900,
      weightStepPriceHalala: 500,
      isActive: true,
      isAvailable: true,
      sortOrder: 1,
    },
    weightPricing: {
      contractVersion: "weight_pricing.v1",
      strategy: "base_plus_steps",
      requiresWeightSelection: true,
      basePriceHalala: 1900,
      baseWeightGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      stepGrams: 50,
      stepPriceHalala: 500,
      choices: [
        { weightGrams: 100, priceHalala: 1900 },
        { weightGrams: 175, priceHalala: 2775 },
        { weightGrams: 300, priceHalala: 4100 },
      ],
    },
  },
});

describe("normalizeDashboardWeightPricingResponse", () => {
  it("preserves valid non-linear backend choices exactly", () => {
    const normalized = normalizeDashboardWeightPricingResponse(validResponse());

    assert.deepEqual(normalized.data.weightPricing.choices, [
      { weightGrams: 100, priceHalala: 1900 },
      { weightGrams: 175, priceHalala: 2775 },
      { weightGrams: 300, priceHalala: 4100 },
    ]);
  });

  it("rejects malformed modern pricing descriptors", () => {
    const invalidResponses = [
      { ...validResponse(), status: false },
      {
        ...validResponse(),
        data: { ...validResponse().data, product: { key: "missing-id" } },
      },
      {
        ...validResponse(),
        data: { ...validResponse().data, weightPricing: {} },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            choices: undefined,
          },
        },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            choices: [],
          },
        },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            choices: "not-array",
          },
        },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            basePriceHalala: Number.NaN,
          },
        },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            stepPriceHalala: "500",
          },
        },
      },
      {
        ...validResponse(),
        data: {
          ...validResponse().data,
          weightPricing: {
            ...validResponse().data.weightPricing,
            choices: [{ weightGrams: "100", priceHalala: 1900 }],
          },
        },
      },
    ];

    for (const response of invalidResponses) {
      assert.throws(() => normalizeDashboardWeightPricingResponse(response));
    }
  });
});
