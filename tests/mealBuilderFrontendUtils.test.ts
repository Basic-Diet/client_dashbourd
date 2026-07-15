import assert from "node:assert/strict";

import {
  canMoveMealBuilderItem,
  explicitProductIdsForSection,
  isMealBuilderCandidateSelectable,
  mealBuilderErrorMessage,
  toEditableMealBuilderSection,
  validateMealBuilderSectionDraft,
} from "../src/components/pages/menu/meal-builder/mealBuilderFrontendUtils";
import type { MealBuilderSection } from "../src/types/mealBuilderTypes";
import type { MealBuilderVisualItem } from "../src/components/pages/menu/meal-builder/mealBuilderVisualModel";

const baseSection: MealBuilderSection = {
  key: "sandwich",
  sectionType: "product_list",
  sourceKind: "product_list",
  productContextId: null,
  sourceGroupId: null,
  sourceCategoryId: null,
  selectedOptionIds: [],
  selectedProductIds: ["product-1"],
  includeMode: "selected",
  selectionType: "sandwich",
  titleOverride: { ar: "ساندوتشات", en: "Sandwiches" },
  sortOrder: 1,
  required: false,
  minSelections: 0,
  maxSelections: 1,
  multiSelect: false,
  visible: true,
  availableFor: ["subscription"],
};

assert.equal(
  mealBuilderErrorMessage({
    response: { data: { error: { message: "Backend contract error" } } },
  }),
  "Backend contract error"
);

assert.equal(
  isMealBuilderCandidateSelectable({
    id: "option-1",
    type: "option",
    eligible: true,
    linked: false,
    available: true,
    active: true,
    visible: true,
    published: true,
    subscriptionEnabled: true,
    catalogItemAvailable: true,
  }),
  true,
  "Backend addable candidates may intentionally be unlinked"
);

assert.equal(
  isMealBuilderCandidateSelectable({
    id: "option-2",
    type: "option",
    eligible: true,
    available: true,
    active: true,
    visible: true,
    published: false,
    subscriptionEnabled: true,
    catalogItemAvailable: true,
  }),
  false,
  "Unpublished candidates must not be added to a publishable draft"
);

assert.equal(validateMealBuilderSectionDraft(baseSection), null);
assert.equal(
  validateMealBuilderSectionDraft({
    ...baseSection,
    minSelections: 2,
    maxSelections: 1,
  }),
  "الحد الأقصى لا يمكن أن يكون أقل من الحد الأدنى."
);
assert.equal(
  validateMealBuilderSectionDraft({
    ...baseSection,
    selectedProductIds: [],
  }),
  "اختر منتجا واحدا على الأقل."
);

const editable = toEditableMealBuilderSection({
  ...baseSection,
  items: [
    {
      id: "product-1",
      productId: "product-1",
      type: "product",
    },
  ],
  hydration: { selectedProductCount: 1 },
});
assert.equal(editable.items, undefined);
assert.equal(editable.hydration, undefined);

assert.deepEqual(
  explicitProductIdsForSection(
    {
      ...baseSection,
      selectedProductIds: [],
      items: [
        {
          id: "product-2",
          productId: "product-2",
          type: "product",
        },
      ],
    },
    []
  ),
  ["product-2"]
);

const visualItems: MealBuilderVisualItem[] = [
  visualOption("option-1", 0),
  visualOption("option-2", 0),
  visualOption("option-3", 1),
];
assert.equal(canMoveMealBuilderItem(visualItems, 0, "down"), true);
assert.equal(canMoveMealBuilderItem(visualItems, 1, "down"), false);

function visualOption(
  id: string,
  sourceSectionIndex: number
): MealBuilderVisualItem {
  return {
    id,
    key: id,
    kind: "option",
    name: id,
    active: true,
    selected: true,
    eligible: true,
    linked: true,
    available: true,
    published: true,
    subscriptionEnabled: true,
    relationExists: true,
    catalogItemAvailable: true,
    state: "selected",
    reasonCodes: [],
    warnings: [],
    errors: [],
    sourceSectionIndex,
    sourceSectionType: "option_group",
  };
}
