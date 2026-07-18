import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/apis", () => ({
  default: apiMock,
}));

import {
  fetchCreateMenuProduct,
  fetchUpdateMenuProduct,
  fetchUpdateMenuProductWeightPricing,
} from "../src/utils/fetchMenuProducts";

describe("menu product mutation fetchers", () => {
  beforeEach(() => {
    apiMock.post.mockReset();
    apiMock.patch.mockReset();
  });

  it("returns and normalizes the created product id", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          _id: "created-product",
          categoryId: "category-1",
          key: "created",
          itemType: "product",
          name: { ar: "جديد", en: "Created" },
          pricingModel: "fixed",
          priceHalala: 1900,
          isActive: true,
          isAvailable: true,
          ui: { cardSize: "large" },
          sortOrder: 1,
        },
      },
    });

    const response = await fetchCreateMenuProduct({
      categoryId: "category-1",
      itemType: "product",
      name: { ar: "جديد", en: "Created" },
      pricingModel: "fixed",
      priceHalala: 1900,
      ui: { cardSize: "large" },
    });

    assert.equal(apiMock.post.mock.calls[0][0], "/api/dashboard/menu/products");
    assert.equal(response.data.id, "created-product");
    assert.equal(response.data.ui?.cardSize, "large");
  });

  it("returns and normalizes the canonical updated product", async () => {
    apiMock.patch.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          id: "product-1",
          categoryId: "category-1",
          key: "updated",
          itemType: "product",
          name: { ar: "محدث", en: "Updated" },
          pricingModel: "fixed",
          priceHalala: 2500,
          isActive: true,
          isAvailable: true,
          ui: { cardSize: "small" },
          sortOrder: 3,
        },
      },
    });

    const response = await fetchUpdateMenuProduct("product-1", {
      name: { ar: "محدث", en: "Updated" },
      priceHalala: 2500,
      ui: { cardSize: "small" },
    });

    assert.equal(
      apiMock.patch.mock.calls[0][0],
      "/api/dashboard/menu/products/product-1"
    );
    assert.equal(response.data.name.en, "Updated");
    assert.equal(response.data.priceHalala, 2500);
    assert.equal(response.data.ui?.cardSize, "small");
  });

  it("calls the dedicated weight-pricing endpoint and keeps backend choices", async () => {
    apiMock.patch.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          contractVersion: "dashboard_weight_pricing.v1",
          product: {
            id: "product-1",
            categoryId: "category-1",
            key: "spicy_chicken_meal_100g",
            itemType: "product",
            name: { ar: "وجبة", en: "Meal" },
            pricingModel: "per_100g",
            priceHalala: 1900,
            weightStepPriceHalala: 500,
            isActive: true,
            isAvailable: true,
            ui: { cardSize: "medium" },
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
              { weightGrams: 150, priceHalala: 2400 },
            ],
          },
        },
      },
    });

    const response = await fetchUpdateMenuProductWeightPricing("product-1", {
      priceHalala: 1900,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
      weightStepPriceHalala: 500,
    });

    assert.equal(
      apiMock.patch.mock.calls[0][0],
      "/api/dashboard/menu/products/product-1/weight-pricing"
    );
    assert.deepEqual(apiMock.patch.mock.calls[0][1], {
      priceHalala: 1900,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
      weightStepPriceHalala: 500,
    });
    assert.deepEqual(response.data.weightPricing.choices, [
      { weightGrams: 100, priceHalala: 1900 },
      { weightGrams: 150, priceHalala: 2400 },
    ]);
  });

  it("rejects malformed create success without product id", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          key: "missing-id",
          name: { ar: "بدون معرف", en: "Missing ID" },
          pricingModel: "fixed",
          priceHalala: 1000,
          isActive: true,
          isAvailable: true,
          sortOrder: 0,
        },
      },
    });

    await assert.rejects(() =>
      fetchCreateMenuProduct({
        categoryId: "category-1",
        itemType: "product",
        name: { ar: "بدون معرف", en: "Missing ID" },
        pricingModel: "fixed",
        priceHalala: 1000,
      })
    );
  });
});
