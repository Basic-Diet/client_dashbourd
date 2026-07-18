import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  deriveWeightPricingFormMode,
  isWeightPricingModeLocked,
  shouldUseModernWeightPricing,
} from "../src/utils/menuWeightPricingMode";
import type { MenuProduct } from "../src/types/menuTypes";

const product = (overrides: Partial<MenuProduct> = {}): MenuProduct => ({
  id: "product-1",
  categoryId: "category-1",
  key: "product",
  itemType: "product",
  name: { ar: "منتج", en: "Product" },
  pricingModel: "fixed",
  priceHalala: 1900,
  isActive: true,
  isAvailable: true,
  sortOrder: 0,
  ...overrides,
});

describe("weight pricing mode derivation", () => {
  it("locks new, existing modern, and fixed-to-modern products into modern mode", () => {
    assert.equal(
      deriveWeightPricingFormMode({
        pageMode: "create",
        pricingModel: "per_100g",
        useWeightStepPricing: false,
      }),
      "new_modern"
    );
    assert.equal(
      deriveWeightPricingFormMode({
        pageMode: "edit",
        pricingModel: "per_100g",
        initialProduct: product({
          pricingModel: "per_100g",
          weightStepPriceHalala: 500,
        }),
        useWeightStepPricing: false,
      }),
      "existing_modern"
    );
    assert.equal(
      deriveWeightPricingFormMode({
        pageMode: "edit",
        pricingModel: "per_100g",
        initialProduct: product({ pricingModel: "fixed" }),
        useWeightStepPricing: false,
      }),
      "fixed_to_modern"
    );
    assert.equal(isWeightPricingModeLocked("new_modern"), true);
    assert.equal(isWeightPricingModeLocked("existing_modern"), true);
    assert.equal(isWeightPricingModeLocked("fixed_to_modern"), true);
  });

  it("preserves explicit legacy versus migration decisions", () => {
    const legacyProduct = product({
      pricingModel: "per_100g",
      weightStepPriceHalala: null,
      weightPricing: null,
    });

    assert.equal(
      deriveWeightPricingFormMode({
        pageMode: "edit",
        pricingModel: "per_100g",
        initialProduct: legacyProduct,
        useWeightStepPricing: false,
      }),
      "legacy"
    );
    assert.equal(
      deriveWeightPricingFormMode({
        pageMode: "edit",
        pricingModel: "per_100g",
        initialProduct: legacyProduct,
        useWeightStepPricing: true,
      }),
      "legacy_migration"
    );
    assert.equal(
      shouldUseModernWeightPricing({
        mode: "edit",
        values: {
          pricingModel: "per_100g",
          useWeightStepPricing: false,
          weightPricingFormMode: "legacy",
        },
        initialProduct: legacyProduct,
      }),
      false
    );
    assert.equal(
      shouldUseModernWeightPricing({
        mode: "edit",
        values: {
          pricingModel: "per_100g",
          useWeightStepPricing: true,
          weightPricingFormMode: "legacy_migration",
        },
        initialProduct: legacyProduct,
      }),
      true
    );
  });
});
