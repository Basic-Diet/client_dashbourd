import assert from "node:assert/strict";
import { it as test } from "vitest";

import type { MenuCategory, MenuProduct } from "../src/types/menuTypes";
import {
  buildMenuProductCandidates,
  categoryLabel,
  filterMenuProductCandidates,
  UNCATEGORIZED_CATEGORY_ID,
} from "../src/components/pages/menu/meal-builder/mealPlannerMenuProductFlow";

const categories = [
  {
    id: "cat-meals",
    key: "meals",
    name: { ar: "الوجبات", en: "Meals" },
    isActive: true,
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: "cat-drinks",
    key: "drinks",
    name: { ar: "المشروبات", en: "Drinks" },
    isActive: true,
    isAvailable: true,
    sortOrder: 2,
  },
] as MenuCategory[];

const products = [
  {
    id: "meal-1",
    key: "chicken_meal",
    name: { ar: "وجبة دجاج", en: "Chicken Meal" },
    categoryId: "cat-meals",
    itemType: "basic_meal",
    isActive: true,
    isVisible: true,
    isAvailable: true,
  },
  {
    id: "juice-1",
    key: "orange_juice",
    name: { ar: "عصير برتقال", en: "Orange Juice" },
    categoryId: "cat-drinks",
    itemType: "juice",
    isActive: true,
    isVisible: true,
    isAvailable: true,
  },
  {
    id: "ice-cream-1",
    key: "vanilla_ice_cream",
    name: { ar: "آيس كريم فانيليا", en: "Vanilla Ice Cream" },
    categoryId: "missing-category",
    itemType: "ice_cream",
    isActive: false,
    isVisible: false,
    isAvailable: false,
  },
] as MenuProduct[];

const candidates = buildMenuProductCandidates({
  products,
  selectedIds: ["meal-1"],
  currentSectionKey: "current-card",
  assignmentByProductId: new Map([
    ["meal-1", "current-card"],
    ["juice-1", "other-card"],
  ]),
});

test("all menu products remain visible regardless of item type or status", () => {
  assert.deepEqual(
    candidates.map((item) => item.id),
    ["meal-1", "juice-1", "ice-cream-1"]
  );
  assert.equal(candidates[2].isActive, false);
  assert.equal(candidates[2].isVisible, false);
  assert.equal(candidates[2].isAvailable, false);
});

test("assignment state distinguishes current and other cards", () => {
  assert.equal(candidates[0].selected, true);
  assert.equal(candidates[0].assignedToCurrentCard, true);
  assert.equal(candidates[0].assignedToAnotherCard, false);
  assert.equal(candidates[1].assignedToAnotherCard, true);
  assert.equal(candidates[1].assignedSectionKey, "other-card");
});

test("category filter uses categoryId and localized labels", () => {
  assert.equal(categoryLabel(categories[0]), "الوجبات");
  const rows = filterMenuProductCandidates({
    candidates,
    categories,
    selectedCategoryId: "cat-drinks",
    search: "",
  });
  assert.deepEqual(rows.map((item) => item.id), ["juice-1"]);
});

test("uncategorized products remain visible", () => {
  const rows = filterMenuProductCandidates({
    candidates,
    categories,
    selectedCategoryId: UNCATEGORIZED_CATEGORY_ID,
    search: "",
  });
  assert.deepEqual(rows.map((item) => item.id), ["ice-cream-1"]);
});

test("search is local across Arabic, English, key, and category names", () => {
  for (const query of ["عصير", "Orange", "orange_juice", "المشروبات"]) {
    const rows = filterMenuProductCandidates({
      candidates,
      categories,
      selectedCategoryId: "all",
      search: query,
    });
    assert.deepEqual(rows.map((item) => item.id), ["juice-1"]);
  }
});
