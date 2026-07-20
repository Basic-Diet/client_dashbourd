// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2",
  () => ({
    MealPlannerCandidatePickerV2: ({
      type,
      onChange,
    }: {
      type: "product" | "option";
      onChange: (ids: string[]) => void;
    }) => (
      <button
        type="button"
        onClick={() =>
          onChange([type === "product" ? "product-1" : "option-1"])
        }
      >
        اختيار عنصر تجريبي
      </button>
    ),
  })
);

import { MealPlannerCardDialogV2 } from "../src/components/pages/menu/meal-builder/MealPlannerCardDialogV2";
import { MealPlannerCardGridV2 } from "../src/components/pages/menu/meal-builder/MealPlannerCardGridV2";
import type {
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
} from "../src/types/mealPlannerDashboardTypes";

afterEach(() => cleanup());

const emptyCatalog: MealPlannerCatalogV2 = {
  products: [],
  optionGroups: [],
  options: [],
  searchFacets: {
    proteinFamilies: ["beef"],
  },
};

describe("Meal Planner V2 components", () => {
  it("shows exactly the two creatable card types and never exposes legacy sandwich or premium", () => {
    render(
      <MealPlannerCardDialogV2
        catalog={emptyCatalog}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    expect(
      screen.getByRole("button", { name: /منتجات كاملة/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    ).toBeInTheDocument();
    expect(screen.queryByText(/^ساندويتش$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/system_premium/i)).not.toBeInTheDocument();
  });

  it("reads creatable card types and option roles from cardContract", () => {
    render(
      <MealPlannerCardDialogV2
        catalog={emptyCatalog}
        cardContract={{
          dynamicCardTypes: [
            {
              cardType: "option_family",
              allowedOptionRoles: ["carbs"],
            },
          ],
        }}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    expect(
      screen.queryByRole("button", { name: /منتجات كاملة/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "نوع الخيارات" })
    ).toHaveTextContent("خيارات كارب");
    expect(screen.queryByText("خيارات بروتين")).not.toBeInTheDocument();
  });

  it("submits a direct card using the canonical full_meal_product payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (payload: MealPlannerCreatePayloadV2) => {
      expect(payload.cardType).toBe("direct_product");
    });
    render(
      <MealPlannerCardDialogV2
        catalog={emptyCatalog}
        pending={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(
      screen.getByPlaceholderText("مثال: وجبات جاهزة"),
      "ساندويتشات"
    );
    await user.type(
      screen.getByPlaceholderText("Example: Ready Meals"),
      "Sandwiches"
    );
    await user.type(screen.getByPlaceholderText("ready_meals"), "sandwiches");
    await user.click(
      screen.getByRole("button", { name: "اختيار عنصر تجريبي" })
    );
    await user.click(screen.getByRole("button", { name: "إنشاء الكارت" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        cardType: "direct_product",
        selectionType: "full_meal_product",
        selectedProductIds: ["product-1"],
      })
    );
    expect(JSON.stringify(onSubmit.mock.calls[0][0])).not.toContain(
      '"sandwich"'
    );
  });

  it("reveals only protein and carbs context when option_family is selected", async () => {
    const user = userEvent.setup();
    render(
      <MealPlannerCardDialogV2
        catalog={emptyCatalog}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    );

    expect(screen.getByText("نوع الخيارات")).toBeInTheDocument();
    expect(screen.getByText("المنتج الأساسي")).toBeInTheDocument();
    expect(screen.getByText("مجموعة الخيارات")).toBeInTheDocument();
    expect(screen.getByText("عائلة البروتين")).toBeInTheDocument();
  });

  it("renders contradictory historical sandwich metadata as a complete direct meal", () => {
    render(
      <MealPlannerCardGridV2
        premiumSection={{ automatic: true, items: [] }}
        sections={[
          {
            key: "sandwich",
            cardType: "option_family",
            sectionType: "product_category",
            selectionType: "full_meal_product",
            optionRole: "protein",
            titleOverride: { ar: "ساندوتشات", en: "Sandwiches" },
            selectedProductIds: ["product-1"],
            selectedOptionIds: [],
            selectedProducts: [{ id: "product-1", label: "برجر لحم" }],
            visible: true,
          },
        ]}
        issues={[]}
        pending={false}
        onEdit={vi.fn()}
        onManageItems={vi.fn()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("وجبة كاملة")).toBeInTheDocument();
    expect(screen.getByText(/يُحتسب كوجبة كاملة/)).toBeInTheDocument();
    expect(screen.queryByText("خيارات بروتين")).not.toBeInTheDocument();
  });

  it("renders Premium first as read-only while dynamic cards keep contextual actions", () => {
    render(
      <MealPlannerCardGridV2
        premiumSection={{
          automatic: true,
          items: [{ id: "premium-1", label: "ترقية بريميوم" }],
        }}
        sections={[
          {
            key: "ready_meals",
            cardType: "direct_product",
            selectionType: "full_meal_product",
            titleOverride: { ar: "وجبات جاهزة", en: "Ready Meals" },
            selectedProductIds: ["product-1"],
            selectedProducts: [{ id: "product-1", label: "وجبة دجاج" }],
            visible: true,
          },
        ]}
        issues={[]}
        pending={false}
        onEdit={vi.fn()}
        onManageItems={vi.fn()}
        onToggleVisibility={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const premiumHeading = screen.getByText("الوجبات المميزة");
    const dynamicHeading = screen.getByText("وجبات جاهزة");
    expect(
      premiumHeading.compareDocumentPosition(dynamicHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText("يُدار من النظام")).toBeInTheDocument();
    expect(screen.getByText(/يُحتسب كوجبة كاملة/)).toBeInTheDocument();
    expect(screen.queryByText(/full_meal_product/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "إدارة العناصر" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "تعديل البيانات" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "حذف الكارت" })
    ).toBeInTheDocument();
  });
});
