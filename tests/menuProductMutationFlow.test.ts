import assert from "node:assert/strict";
import { describe, it, vi } from "vitest";

import {
  saveMenuProductWithWeightPricing,
  type MenuProductSaveDependencies,
} from "../src/utils/menuProductMutationFlow";
import menuProductSchema, {
  type MenuProductSchemaType,
} from "../src/lib/validations/menuProductSchema";
import type { MenuProduct } from "../src/types/menuTypes";

const localized = { ar: "منتج", en: "Product" };

function product(overrides: Partial<MenuProduct> = {}): MenuProduct {
  return {
    id: "product-1",
    categoryId: "category-1",
    key: "spicy_chicken_meal_100g",
    itemType: "product",
    name: localized,
    description: localized,
    imageUrl: "https://cdn.example.com/product.jpg",
    pricingModel: "per_100g",
    priceHalala: 1900,
    isActive: true,
    isAvailable: true,
    isVisible: true,
    isCustomizable: true,
    availableFor: ["one_time", "subscription"],
    ui: { cardSize: "small" },
    sortOrder: 10,
    ...overrides,
  };
}

function values(overrides: Partial<MenuProductSchemaType> = {}) {
  return menuProductSchema.parse({
    categoryId: "category-1",
    key: "spicy_chicken_meal_100g",
    itemType: "product",
    name: localized,
    description: localized,
    imageUrl: "https://cdn.example.com/product.jpg",
    pricingModel: "per_100g",
    priceSar: 19,
    baseUnitGrams: 100,
    defaultWeightGrams: 100,
    minWeightGrams: 100,
    maxWeightGrams: 300,
    weightStepGrams: 50,
    weightStepPriceSar: 5,
    useWeightStepPricing: true,
    isActive: true,
    isAvailable: true,
    isVisible: true,
    isCustomizable: true,
    availableFor: ["one_time", "subscription"],
    ui: { cardSize: "small" },
    sortOrder: 10,
    ...overrides,
  });
}

function dependencies() {
  const calls: string[] = [];
  const deps: Required<MenuProductSaveDependencies> = {
    createProduct: vi.fn(async (payload) => {
      calls.push("create");
      return { status: true, data: product({ id: "created-product", ...payload }) };
    }),
    updateProduct: vi.fn(async (id, payload) => {
      calls.push(`update:${id}`);
      return { status: true, data: product({ id, ...payload }) };
    }),
    updateWeightPricing: vi.fn(async (id, payload) => {
      calls.push(`weight:${id}`);
      return {
        status: true,
        data: {
          contractVersion: "dashboard_weight_pricing.v1",
          product: product({
            id,
            ...payload,
            weightStepPriceHalala: payload.weightStepPriceHalala,
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
                { weightGrams: 200, priceHalala: 2900 },
                { weightGrams: 250, priceHalala: 3400 },
                { weightGrams: 300, priceHalala: 3900 },
              ],
            },
          }),
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
            choices: [{ weightGrams: 100, priceHalala: 1900 }],
          },
        },
      };
    }),
  };
  return { calls, deps };
}

describe("saveMenuProductWithWeightPricing", () => {
  it("creates a modern weight product with safe POST, dedicated PATCH, then final metadata PATCH", async () => {
    const { calls, deps } = dependencies();

    const result = await saveMenuProductWithWeightPricing({
      mode: "create",
      values: values(),
      imageUrl: "https://cdn.example.com/product.jpg",
      dependencies: deps,
    });

    assert.deepEqual(calls, [
      "create",
      "weight:created-product",
      "update:created-product",
    ]);
    assert.equal(result.status, "complete");
    assert.equal(deps.createProduct.mock.calls[0][0].isVisible, false);
    assert.equal(deps.createProduct.mock.calls[0][0].isAvailable, false);
    assert.equal(deps.createProduct.mock.calls[0][0].isActive, true);
    assert.equal("priceHalala" in deps.createProduct.mock.calls[0][0], false);
    assert.equal("isCustomizable" in deps.createProduct.mock.calls[0][0], false);
    assert.equal(deps.updateProduct.mock.calls[0][1].isVisible, true);
    assert.equal(deps.updateProduct.mock.calls[0][1].isAvailable, true);
    assert.equal("priceHalala" in deps.updateProduct.mock.calls[0][1], false);
    assert.equal("isCustomizable" in deps.updateProduct.mock.calls[0][1], false);
    assert.deepEqual(deps.updateWeightPricing.mock.calls[0][1], {
      priceHalala: 1900,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
      weightStepPriceHalala: 500,
    });
  });

  it("does not call weight pricing for fixed create or fixed edit", async () => {
    const createDeps = dependencies();
    await saveMenuProductWithWeightPricing({
      mode: "create",
      values: values({
        pricingModel: "fixed",
        isCustomizable: false,
        useWeightStepPricing: false,
      }),
      imageUrl: "",
      dependencies: createDeps.deps,
    });

    const editDeps = dependencies();
    await saveMenuProductWithWeightPricing({
      mode: "edit",
      productId: "product-1",
      values: values({
        pricingModel: "fixed",
        isCustomizable: false,
        useWeightStepPricing: false,
      }),
      imageUrl: "",
      dependencies: editDeps.deps,
    });

    assert.equal(createDeps.deps.updateWeightPricing.mock.calls.length, 0);
    assert.equal(editDeps.deps.updateWeightPricing.mock.calls.length, 0);
  });

  it("edits a weight product with ordinary PATCH then dedicated PATCH", async () => {
    const { calls, deps } = dependencies();

    const result = await saveMenuProductWithWeightPricing({
      mode: "edit",
      productId: "product-1",
      values: values(),
      imageUrl: "https://cdn.example.com/product.jpg",
      initialProduct: product({
        weightStepPriceHalala: 500,
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
          choices: [{ weightGrams: 100, priceHalala: 1900 }],
        },
      }),
      dependencies: deps,
    });

    assert.deepEqual(calls, ["update:product-1", "weight:product-1"]);
    for (const key of [
      "priceHalala",
      "baseUnitGrams",
      "defaultWeightGrams",
      "minWeightGrams",
      "maxWeightGrams",
      "weightStepGrams",
      "weightStepPriceHalala",
      "isCustomizable",
    ]) {
      assert.equal(key in deps.updateProduct.mock.calls[0][1], false);
    }
    assert.equal(result.status, "complete");
    assert.equal(result.product.isCustomizable, true);
  });

  it("returns partial status when weight PATCH fails after product create", async () => {
    const { deps } = dependencies();
    deps.updateWeightPricing.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: {
            code: "INVALID_WEIGHT_PRICING_CONFIGURATION",
            message: "Invalid weight range",
            details: { field: "maxWeightGrams" },
          },
        },
      },
    });

    const result = await saveMenuProductWithWeightPricing({
      mode: "create",
      values: values(),
      imageUrl: "",
      dependencies: deps,
    });

    assert.equal(result.status, "partial_weight_pricing_failed");
    assert.equal(deps.createProduct.mock.calls.length, 1);
    assert.equal(deps.updateWeightPricing.mock.calls.length, 1);
    assert.equal(deps.updateProduct.mock.calls.length, 0);
  });

  it("returns partial status when weight PATCH fails after ordinary edit", async () => {
    const { deps } = dependencies();
    deps.updateWeightPricing.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: {
            code: "INVALID_WEIGHT_PRICING_CONFIGURATION",
            message: "Invalid default weight",
            details: { field: "defaultWeightGrams" },
          },
        },
      },
    });

    const result = await saveMenuProductWithWeightPricing({
      mode: "edit",
      productId: "product-1",
      values: values(),
      imageUrl: "",
      initialProduct: product({
        weightStepPriceHalala: 500,
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
          choices: [{ weightGrams: 100, priceHalala: 1900 }],
        },
      }),
      dependencies: deps,
    });

    assert.equal(result.status, "partial_weight_pricing_failed");
    assert.equal(deps.updateProduct.mock.calls.length, 1);
    assert.equal(deps.updateWeightPricing.mock.calls.length, 1);
  });

  it("does not call weight pricing when the ordinary mutation fails", async () => {
    const { deps } = dependencies();
    deps.updateProduct.mockRejectedValueOnce(new Error("ordinary update failed"));

    await assert.rejects(() =>
      saveMenuProductWithWeightPricing({
        mode: "edit",
      productId: "product-1",
      values: values(),
      imageUrl: "",
      initialProduct: product({ weightStepPriceHalala: 500 }),
      dependencies: deps,
      })
    );

    assert.equal(deps.updateWeightPricing.mock.calls.length, 0);
  });

  it("rejects malformed ordinary success without a product id", async () => {
    const { deps } = dependencies();
    deps.createProduct.mockResolvedValueOnce({
      status: true,
      data: product({ id: "" }),
    });

    await assert.rejects(() =>
      saveMenuProductWithWeightPricing({
        mode: "create",
        values: values(),
        imageUrl: "",
        dependencies: deps,
      })
    );
  });

  it("retries partial create through update without sending another POST", async () => {
    const { calls, deps } = dependencies();

    await saveMenuProductWithWeightPricing({
      mode: "create",
      partialProductId: "created-product",
      values: values({ name: { ar: "معدل", en: "Updated" } }),
      imageUrl: "https://cdn.example.com/uploaded.jpg",
      dependencies: deps,
    });

    assert.deepEqual(calls, [
      "update:created-product",
      "weight:created-product",
      "update:created-product",
    ]);
    assert.equal(deps.createProduct.mock.calls.length, 0);
    assert.equal(deps.updateProduct.mock.calls[0][1].isVisible, false);
    assert.equal(deps.updateProduct.mock.calls[0][1].isAvailable, false);
    assert.equal("isCustomizable" in deps.updateProduct.mock.calls[0][1], false);
    assert.equal(deps.updateProduct.mock.calls[1][1].isVisible, true);
    assert.equal(deps.updateProduct.mock.calls[1][1].isAvailable, true);
    assert.equal("isCustomizable" in deps.updateProduct.mock.calls[1][1], false);
  });

  it("returns a final restore partial without repeating pricing on retry", async () => {
    const { calls, deps } = dependencies();
    deps.updateProduct.mockRejectedValueOnce(new Error("restore failed"));

    const first = await saveMenuProductWithWeightPricing({
      mode: "create",
      values: values(),
      imageUrl: "",
      dependencies: deps,
    });

    assert.equal(first.status, "partial_final_metadata_restore_failed");
    assert.deepEqual(calls, ["create", "weight:created-product"]);
    assert.equal(deps.updateProduct.mock.calls.length, 1);
    assert.equal(first.status === "partial_final_metadata_restore_failed" ? first.weightPricing.choices.length : 0, 1);

    calls.length = 0;
    const retry = await saveMenuProductWithWeightPricing({
      mode: "create",
      partialProductId: "created-product",
      values: values(),
      imageUrl: "",
      retryStage: "final_metadata_restore",
      restoredWeightPricing:
        first.status === "partial_final_metadata_restore_failed"
          ? first.weightPricing
          : null,
      dependencies: deps,
    });

    assert.equal(retry.status, "complete");
    assert.deepEqual(calls, ["update:created-product"]);
    assert.equal(deps.createProduct.mock.calls.length, 1);
    assert.equal(deps.updateWeightPricing.mock.calls.length, 1);
  });

  it("edits a legacy weight product without migration through ordinary PATCH only", async () => {
    const { calls, deps } = dependencies();

    await saveMenuProductWithWeightPricing({
      mode: "edit",
      productId: "legacy-product",
      values: values({
        name: { ar: "Legacy", en: "Legacy" },
        imageUrl: "https://cdn.example.com/new.jpg",
        categoryId: "category-2",
        isVisible: false,
        isAvailable: false,
        ui: { cardSize: "large" },
        sortOrder: 44,
        weightStepPriceSar: undefined,
        useWeightStepPricing: false,
      }),
      imageUrl: "https://cdn.example.com/new.jpg",
      initialProduct: product({
        id: "legacy-product",
        pricingModel: "per_100g",
        weightStepPriceHalala: null,
        weightPricing: null,
      }),
      dependencies: deps,
    });

    assert.deepEqual(calls, ["update:legacy-product"]);
    assert.equal(deps.updateWeightPricing.mock.calls.length, 0);
    assert.equal(deps.updateProduct.mock.calls[0][1].name.en, "Legacy");
    assert.equal(deps.updateProduct.mock.calls[0][1].imageUrl, "https://cdn.example.com/new.jpg");
    assert.equal(deps.updateProduct.mock.calls[0][1].categoryId, "category-2");
    assert.equal(deps.updateProduct.mock.calls[0][1].isVisible, false);
    assert.equal(deps.updateProduct.mock.calls[0][1].isAvailable, false);
    assert.deepEqual(deps.updateProduct.mock.calls[0][1].ui, { cardSize: "large" });
    assert.equal(deps.updateProduct.mock.calls[0][1].sortOrder, 44);
  });

  it("stages fixed-to-modern weight transition hidden until pricing succeeds", async () => {
    const { calls, deps } = dependencies();

    await saveMenuProductWithWeightPricing({
      mode: "edit",
      productId: "fixed-product",
      values: values({ pricingModel: "per_100g", useWeightStepPricing: true }),
      imageUrl: "",
      initialProduct: product({
        id: "fixed-product",
        pricingModel: "fixed",
        weightStepPriceHalala: null,
        weightPricing: null,
      }),
      dependencies: deps,
    });

    assert.deepEqual(calls, [
      "update:fixed-product",
      "weight:fixed-product",
      "update:fixed-product",
    ]);
    assert.equal(deps.updateProduct.mock.calls[0][1].isVisible, false);
    assert.equal(deps.updateProduct.mock.calls[0][1].isAvailable, false);
    assert.equal(deps.updateProduct.mock.calls[1][1].isVisible, true);
    assert.equal(deps.updateProduct.mock.calls[1][1].isAvailable, true);
  });
});
