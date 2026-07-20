import { describe, expect, it } from "vitest";

import type { MealPlannerSectionV2 } from "../src/types/mealPlannerDashboardTypes";
import {
  buildDirectProductPayload,
  buildOptionFamilyPayload,
  ERROR_MESSAGES,
  canonicalSelectionType,
  normalizeCardType,
} from "../src/components/pages/menu/meal-builder/mealPlannerV2Utils";

describe("Meal Planner V2 payload builders", () => {
  it("always sends full_meal_product for a direct card named sandwiches", () => {
    const payload = buildDirectProductPayload({
      cardType: "direct_product",
      key: "sandwiches",
      titleAr: "ساندويتشات",
      titleEn: "Sandwiches",
      visible: true,
      sortOrder: 10,
      selectedIds: ["product-1"],
    });

    expect(payload).toEqual({
      cardType: "direct_product",
      key: "sandwiches",
      titleOverride: { ar: "ساندويتشات", en: "Sandwiches" },
      selectionType: "full_meal_product",
      selectedProductIds: ["product-1"],
      sortOrder: 10,
      visible: true,
    });
    expect(payload).not.toHaveProperty("optionRole");
    expect(payload).not.toHaveProperty("selectedOptionIds");
    expect(JSON.stringify(payload)).not.toContain('"sandwich"');
  });

  it("builds a protein option card with standard_meal and full context", () => {
    const payload = buildOptionFamilyPayload({
      cardType: "option_family",
      key: "beef",
      titleAr: "اللحمة",
      titleEn: "Beef",
      visible: true,
      sortOrder: 30,
      selectedIds: ["option-1", "option-2"],
      optionRole: "protein",
      familyKey: "beef",
      productContextId: "product-1",
      sourceGroupId: "group-1",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      multiSelect: false,
    });

    expect(payload).toMatchObject({
      cardType: "option_family",
      selectionType: "standard_meal",
      optionRole: "protein",
      familyKey: "beef",
      productContextId: "product-1",
      sourceGroupId: "group-1",
      selectedOptionIds: ["option-1", "option-2"],
    });
    expect(payload).not.toHaveProperty("selectedProductIds");
  });

  it("builds a carbs option card without familyKey", () => {
    const payload = buildOptionFamilyPayload({
      cardType: "option_family",
      key: "carbs",
      titleAr: "النشويات",
      titleEn: "Carbs",
      visible: true,
      selectedIds: ["option-3"],
      optionRole: "carbs",
      familyKey: "should-not-be-sent",
      productContextId: "product-1",
      sourceGroupId: "group-2",
      maxSelections: 2,
      multiSelect: true,
    });

    expect(payload.selectionType).toBe("standard_meal");
    expect(payload.optionRole).toBe("carbs");
    expect(payload).not.toHaveProperty("familyKey");
  });

  it("normalizes historical sandwich data for display", () => {
    expect(
      canonicalSelectionType({
        key: "sandwiches",
        sectionType: "product_list",
        selectionType: "sandwich",
      })
    ).toBe("full_meal_product");
  });

  it("keeps a canonical full-meal sandwich direct despite contradictory legacy metadata", () => {
    const section: MealPlannerSectionV2 = {
      key: "sandwich",
      cardType: "option_family",
      sectionType: "product_category",
      selectionType: "full_meal_product",
      selectedProductIds: ["product-1"],
      selectedOptionIds: [],
      optionRole: "protein",
    };

    expect(normalizeCardType(section)).toBe("direct_product");
    expect(canonicalSelectionType(section)).toBe("full_meal_product");
  });

  it("maps core backend errors to Arabic", () => {
    expect(ERROR_MESSAGES.MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED).toBe(
      "المنتج موجود في كارت آخر"
    );
    expect(ERROR_MESSAGES.MEAL_BUILDER_CARBS_CARD_REQUIRED).toBe(
      "كروت البروتين تحتاج كارت كارب لنفس المنتج الأساسي"
    );
    expect(ERROR_MESSAGES.MEAL_BUILDER_SYSTEM_CARD_READ_ONLY).toBe(
      "كارت الوجبات المميزة يُدار من النظام"
    );
  });
});
