import assert from "node:assert/strict";
import {
  parseOptionalSelectionLimit,
  toCreateMenuCategoryPayload,
  toCreateMenuOptionGroupPayload,
  toCreateMenuOptionPayload,
  toCreateMenuProductPayload,
  toCreateSafeModernWeightProductPayload,
  toUpdateModernWeightProductPayload,
  toUpdateMenuOptionPayload,
  toUpdateSelectionRulesPayload,
  toUpdateMenuProductPayload,
  toUpdateSafeModernWeightProductPayload,
  toWeightPricingPayload,
} from "../src/utils/menuPayloadMappers";
import menuProductSchema from "../src/lib/validations/menuProductSchema";
import { test } from "vitest";

test("menuPayloadMappers.test", () => {
  const localized = { ar: "ar", en: "en" };

  const productPayload = toCreateMenuProductPayload({
    categoryId: "cat-1",
    key: "",
    itemType: "basic_meal",
    name: localized,
    description: localized,
    imageUrl: "",
    pricingModel: "fixed",
    priceSar: 25,
    isActive: true,
    isAvailable: true,
    isVisible: true,
    isCustomizable: false,
    availableFor: ["order", "subscription"],
    ui: { cardSize: "medium" },
    sortOrder: 0,
  });

  assert.equal(productPayload.key, undefined);
  assert.equal("weightStepPriceHalala" in productPayload, false);
  assert.deepEqual(productPayload.availableFor, ["one_time", "subscription"]);
  assert.equal(productPayload.isCustomizable, false);
  assert.deepEqual(productPayload.ui, { cardSize: "medium" });
  assert.equal("key" in productPayload, false);

  const optionPayload = toCreateMenuOptionPayload({
    groupId: "group-1",
    key: "",
    name: localized,
    description: localized,
    imageUrl: "",
    extraPriceSar: 7.5,
    extraWeightUnitGrams: 100,
    extraWeightPriceSar: 3,
    displayCategoryKey: "protein",
    availableFor: ["order", "subscription"],
    availableForSubscription: true,
    isActive: true,
    isAvailable: true,
    isVisible: true,
    sortOrder: 0,
  });

  assert.equal(optionPayload.displayCategoryKey, undefined);
  assert.equal("displayCategory" in optionPayload, false);
  assert.equal(optionPayload.key, undefined);
  assert.equal("key" in optionPayload, false);
  assert.deepEqual(optionPayload.availableFor, ["one_time", "subscription"]);
  assert.equal(optionPayload.availableForSubscription, true);

  const optionUpdatePayload = toUpdateMenuOptionPayload({
    ...optionPayload,
    key: "",
    extraPriceSar: 0,
    extraWeightPriceSar: 0,
    premiumKey: "",
    extraFeeSar: 0,
    ruleTags: "",
    selectionType: "",
  });

  assert.equal(optionUpdatePayload.premiumKey, undefined);
  assert.equal(optionUpdatePayload.selectionType, undefined);
  assert.equal(optionUpdatePayload.extraFeeHalala, 0);
  assert.equal(optionUpdatePayload.ruleTags, undefined);

  const productDefaults = menuProductSchema.parse({
    categoryId: "cat-1",
    itemType: "drink",
    name: localized,
    description: localized,
    pricingModel: "fixed",
    priceSar: 1,
    sortOrder: 0,
  });

  assert.deepEqual(productDefaults.availableFor, ["one_time", "subscription"]);
  assert.equal(productDefaults.ui.cardSize, "medium");

  const weightedValues = menuProductSchema.parse({
    categoryId: "cat-1",
    itemType: "product",
    name: localized,
    description: localized,
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
  });

  const weightPayload = toWeightPricingPayload(weightedValues);
  assert.deepEqual(Object.keys(weightPayload).sort(), [
    "baseUnitGrams",
    "defaultWeightGrams",
    "maxWeightGrams",
    "minWeightGrams",
    "priceHalala",
    "weightStepGrams",
    "weightStepPriceHalala",
  ].sort());
  assert.deepEqual(weightPayload, {
    priceHalala: 1900,
    baseUnitGrams: 100,
    defaultWeightGrams: 100,
    minWeightGrams: 100,
    maxWeightGrams: 300,
    weightStepGrams: 50,
    weightStepPriceHalala: 500,
  });

  const weightedCreatePayload = toCreateMenuProductPayload(weightedValues);
  const weightedUpdatePayload = toUpdateMenuProductPayload(weightedValues);
  assert.equal("weightStepPriceHalala" in weightedCreatePayload, false);
  assert.equal("weightStepPriceHalala" in weightedUpdatePayload, false);
  assert.deepEqual(weightedUpdatePayload.ui, { cardSize: "small" });

  const modernMetadataPayload = toUpdateModernWeightProductPayload(weightedValues);
  const safeModernCreatePayload =
    toCreateSafeModernWeightProductPayload(weightedValues);
  const safeModernUpdatePayload =
    toUpdateSafeModernWeightProductPayload(weightedValues);
  for (const payload of [
    modernMetadataPayload,
    safeModernCreatePayload,
    safeModernUpdatePayload,
  ]) {
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
      assert.equal(key in payload, false);
    }
  }
  assert.equal(safeModernCreatePayload.isVisible, false);
  assert.equal(safeModernCreatePayload.isAvailable, false);
  assert.equal(safeModernCreatePayload.isActive, true);
  assert.equal(safeModernUpdatePayload.isVisible, false);
  assert.equal(safeModernUpdatePayload.isAvailable, false);

  assert.equal(
    menuProductSchema.safeParse({
      ...weightedValues,
      minWeightGrams: 150,
    }).success,
    false
  );
  assert.equal(
    menuProductSchema.safeParse({
      ...weightedValues,
      defaultWeightGrams: 125,
    }).success,
    false
  );
  assert.equal(
    menuProductSchema.safeParse({
      ...weightedValues,
      baseUnitGrams: 120,
    }).success,
    false
  );
  assert.equal(
    menuProductSchema.safeParse({
      ...weightedValues,
      maxWeightGrams: 275,
    }).success,
    false
  );
  assert.equal(
    menuProductSchema.safeParse({
      ...weightedValues,
      pricingModel: "fixed",
      baseUnitGrams: undefined,
      defaultWeightGrams: undefined,
      minWeightGrams: undefined,
      maxWeightGrams: undefined,
      weightStepGrams: undefined,
      weightStepPriceSar: undefined,
      useWeightStepPricing: false,
      isCustomizable: false,
    }).success,
    true
  );

  const categoryPayload = toCreateMenuCategoryPayload({
    key: "",
    name: localized,
    description: localized,
    imageUrl: "",
    isActive: true,
    isAvailable: true,
    isVisible: true,
    ui: { cardVariant: "addon_collection" },
    sortOrder: 0,
  });

  assert.equal(categoryPayload.key, undefined);
  assert.equal("key" in categoryPayload, false);
  assert.equal(categoryPayload.ui, undefined);

  const optionGroupPayload = toCreateMenuOptionGroupPayload({
    key: "",
    name: localized,
    description: localized,
    isActive: true,
    isAvailable: true,
    isVisible: true,
    ui: { displayStyle: "radio_cards" },
    sortOrder: 0,
  });

  assert.equal(optionGroupPayload.key, undefined);
  assert.equal("key" in optionGroupPayload, false);
  assert.equal(optionGroupPayload.ui?.displayStyle, "radio_cards");

  assert.deepEqual(
    toUpdateSelectionRulesPayload({
      minSelections: "1",
      maxSelections: "2",
      isRequired: true,
      sortOrder: "5",
    }),
    {
      minSelections: 1,
      maxSelections: 2,
      isRequired: true,
      sortOrder: 5,
    }
  );

  assert.deepEqual(
    toUpdateSelectionRulesPayload({
      minSelections: "0",
      maxSelections: "0",
      isRequired: false,
      sortOrder: "0",
    }),
    {
      minSelections: 0,
      maxSelections: 0,
      isRequired: false,
      sortOrder: 0,
    }
  );

  assert.equal(parseOptionalSelectionLimit(""), null);
  assert.equal(parseOptionalSelectionLimit("0"), 0);
});
