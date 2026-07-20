// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MealPlannerCardGridV2 } from "../src/components/pages/menu/meal-builder/MealPlannerCardGridV2";
import type { MealPlannerCatalogV2, MealPlannerSectionV2 } from "../src/types/mealPlannerDashboardTypes";
afterEach(cleanup);
describe("Meal Planner card data visibility", () => {
  it("shows authoritative Product, Group, and selected Option without opening actions", () => {
    const catalog = { products: [], optionGroups: [], options: [], builderGroups: [{ id: "basic:proteins", cardType: "option_family", selectionType: "standard_meal", productContextId: "basic", sourceGroupId: "proteins", optionRole: "protein", product: { id: "basic", key: "basic_meal", name: { ar: "وجبة بيسك", en: "Basic Meal" }, status: { customerReady: true } }, group: { id: "proteins", _id: "proteins", key: "proteins", name: { ar: "البروتين", en: "Proteins" }, status: { customerReady: true } }, rules: { minSelections: 1, maxSelections: 1, isRequired: true }, families: ["fish"], options: [{ id: "fish-fillet", _id: "fish-fillet", optionId: "fish-fillet", type: "option", key: "fish_fillet", name: { ar: "فيليه سمك", en: "Fish Fillet" }, imageUrl: "https://example.com/fish.png", familyKey: "fish", proteinFamilyKey: "fish", displayCategoryKey: "fish", selectionType: "standard_meal", isPremium: false, linked: true, relationExists: true, assignable: true, eligible: true, relationStatus: { effective: true }, effectiveStatus: { customerReady: true } }], optionCount: 1, assignableOptionCount: 1, compatible: true, eligible: true, reasonCodes: [], sortOrder: 10 }] } as MealPlannerCatalogV2;
    const section = { key: "fish_options", sectionType: "option_group", cardType: "option_family", titleOverride: { ar: "اختيارات السمك", en: "Fish Options" }, productContextId: "basic", sourceGroupId: "proteins", selectedOptionIds: ["fish-fillet"], selectedProductIds: [], selectionType: "standard_meal", includeMode: "selected", required: true, minSelections: 1, maxSelections: 1, multiSelect: false, visible: true, sortOrder: 10, availableFor: ["subscription"], metadata: { cardType: "option_family", optionRole: "protein", familyKey: "fish" } } as MealPlannerSectionV2;
    render(<MealPlannerCardGridV2 catalog={catalog} sections={[section]} issues={[]} pending={false} onEdit={vi.fn()} onManageItems={vi.fn()} onToggleVisibility={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("وجبة بيسك ← البروتين")).toBeInTheDocument();
    expect(screen.getByText("فيليه سمك")).toBeInTheDocument();
    expect(screen.getByText("العائلة: fish")).toBeInTheDocument();
    expect(screen.queryByText(/افتح إدارة العناصر/)).not.toBeInTheDocument();
  });
});
