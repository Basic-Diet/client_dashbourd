import { describe, expect, it } from "vitest";

import type { MenuOption, MenuOptionGroup } from "../src/types/menuTypes";
import type {
  MealPlannerBuilderGroup,
  MealPlannerCatalogCandidate,
} from "../src/types/mealPlannerDashboardTypes";
import {
  matchingEligibleBuilderGroups,
  mergeMenuOptionsWithPicker,
  optionRoleLabel,
} from "../src/components/pages/menu/meal-builder/mealPlannerOptionGroupFlow";
import { buildOptionFamilyPayload } from "../src/components/pages/menu/meal-builder/mealPlannerV2Utils";

const menuGroup: MenuOptionGroup = {
  id: "group-proteins",
  key: "proteins",
  name: { ar: "البروتين", en: "Proteins" },
  isActive: true,
  isAvailable: true,
  sortOrder: 1,
};

function builderGroup(
  overrides: Partial<MealPlannerBuilderGroup> = {}
): MealPlannerBuilderGroup {
  return {
    id: "builder-1",
    cardType: "option_family",
    selectionType: "standard_meal",
    productContextId: "product-1",
    sourceGroupId: menuGroup.id,
    optionRole: "protein",
    product: {
      id: "product-1",
      key: "basic-meal",
      name: { ar: "وجبة أساسية", en: "Basic Meal" },
      status: {},
    },
    group: {
      id: menuGroup.id,
      _id: menuGroup.id,
      key: menuGroup.key,
      name: menuGroup.name,
      status: {},
    },
    rules: { minSelections: 0, maxSelections: 1, isRequired: false },
    families: ["chicken", "fish"],
    options: [],
    optionCount: 2,
    assignableOptionCount: 2,
    compatible: true,
    eligible: true,
    reasonCodes: [],
    sortOrder: 1,
    ...overrides,
  };
}

const menuOptions: MenuOption[] = [
  {
    id: "option-chicken",
    groupId: menuGroup.id,
    key: "chicken",
    name: { ar: "دجاج", en: "Chicken" },
    extraPriceHalala: 0,
    isActive: true,
    isAvailable: true,
    sortOrder: 1,
    proteinFamilyKey: "chicken",
  },
  {
    id: "option-fish",
    groupId: menuGroup.id,
    key: "fish",
    name: { ar: "سمك", en: "Fish" },
    extraPriceHalala: 100,
    isActive: true,
    isAvailable: true,
    sortOrder: 2,
    proteinFamilyKey: "fish",
  },
];

describe("Meal Builder composed option-group flow", () => {
  it("matches save contexts by sourceGroupId only and rejects unsupported roles", () => {
    const groups = [
      builderGroup(),
      builderGroup({ id: "other", sourceGroupId: "group-carbs", optionRole: "carbs" }),
      builderGroup({ id: "unsupported", optionRole: null }),
      builderGroup({ id: "ineligible", eligible: false }),
    ];

    expect(matchingEligibleBuilderGroups(menuGroup.id, groups).map((group) => group.id)).toEqual([
      "builder-1",
    ]);
  });

  it("does not label a null or unsupported role as protein", () => {
    expect(optionRoleLabel(null)).toBe("دور غير مدعوم");
    expect(optionRoleLabel("vegetables")).toBe("دور غير مدعوم");
    expect(optionRoleLabel("protein")).toBe("بروتين");
    expect(optionRoleLabel("carbs")).toBe("كارب");
  });

  it("merges nested menu options with authoritative picker state by optionId", () => {
    const picker: MealPlannerCatalogCandidate[] = [
      {
        id: "picker-row-1",
        optionId: "option-chicken",
        assignable: true,
        eligible: true,
      },
      {
        id: "picker-row-2",
        optionId: "option-fish",
        assignable: false,
        assigned: true,
        assignedSectionKey: "other-card",
        reasonCodes: ["MEAL_BUILDER_OPTION_ALREADY_ASSIGNED"],
      },
    ];

    const rows = mergeMenuOptionsWithPicker(menuOptions, picker, ["option-chicken"]);
    expect(rows.map((row) => row.optionId)).toEqual([
      "option-chicken",
      "option-fish",
    ]);
    expect(rows[0]).toMatchObject({ selected: true, assignable: true });
    expect(rows[1]).toMatchObject({
      assignable: false,
      assigned: true,
      assignedSectionKey: "other-card",
    });
  });

  it("keeps menu options visible but disabled when the authoritative picker omits them", () => {
    const rows = mergeMenuOptionsWithPicker(menuOptions, [], []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      optionId: "option-chicken",
      assignable: false,
      eligible: false,
      state: "not_in_authoritative_picker",
      reasonCodes: ["NO_AUTHORITATIVE_CANDIDATE"],
    });
  });

  it("builds the canonical option-family create payload without product IDs as options", () => {
    const payload = buildOptionFamilyPayload({
      cardType: "option_family",
      key: "fish",
      titleAr: "سمك",
      titleEn: "Fish",
      visible: true,
      selectedIds: ["option-fish"],
      optionRole: "protein",
      familyKey: "fish",
      productContextId: "product-1",
      sourceGroupId: menuGroup.id,
      required: false,
      minSelections: 0,
      maxSelections: 1,
      multiSelect: false,
      sortOrder: 30,
    });

    expect(payload).toEqual({
      cardType: "option_family",
      key: "fish",
      titleOverride: { ar: "سمك", en: "Fish" },
      optionRole: "protein",
      familyKey: "fish",
      productContextId: "product-1",
      sourceGroupId: menuGroup.id,
      selectedOptionIds: ["option-fish"],
      selectionType: "standard_meal",
      sortOrder: 30,
      visible: true,
      required: false,
      minSelections: 0,
      maxSelections: 1,
      multiSelect: false,
    });
    expect(payload).not.toHaveProperty("selectedProductIds");
  });
});
