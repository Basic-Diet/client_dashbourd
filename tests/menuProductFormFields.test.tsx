// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";

import { MenuProductFormFields } from "../src/components/pages/menu/products/MenuProductFormFields";
import menuProductSchema, {
  type MenuProductSchemaInput,
  type MenuProductSchemaType,
} from "../src/lib/validations/menuProductSchema";

vi.mock("@/hooks/useMenuQuery", () => ({
  useMenuCategoriesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "category-1",
            key: "category-1",
            name: { ar: "تصنيف", en: "Category" },
            isActive: true,
            isAvailable: true,
            sortOrder: 0,
          },
        ],
      },
    },
  }),
  useMenuCategoryDetailQuery: () => ({ data: undefined }),
}));

const baseValues: MenuProductSchemaInput = {
  categoryId: "category-1",
  key: "",
  itemType: "product",
  name: { ar: "منتج", en: "Product" },
  description: { ar: "", en: "" },
  imageUrl: "",
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
  sortOrder: 0,
};

function ProductFormFixture({
  values,
}: {
  values: MenuProductSchemaInput;
}) {
  const form = useForm<MenuProductSchemaInput, unknown, MenuProductSchemaType>({
    resolver: zodResolver(menuProductSchema),
    defaultValues: values,
  });

  return (
    <form onSubmit={form.handleSubmit(vi.fn())} noValidate>
      <MenuProductFormFields form={form} />
      <button type="submit">submit</button>
    </form>
  );
}

async function expectFieldError(label: string) {
  await userEvent.click(screen.getByRole("button", { name: "submit" }));
  const field = await screen.findByLabelText(label);
  await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
  const errorId = field.getAttribute("aria-describedby");
  expect(errorId).toBeTruthy();
  expect(document.getElementById(errorId || "")?.textContent?.trim()).toBeTruthy();
}

afterEach(() => cleanup());

describe("MenuProductFormFields modern weight validation", () => {
  it("shows the minimum/base mismatch beside minimum field", async () => {
    render(<ProductFormFixture values={{ ...baseValues, minWeightGrams: 150 }} />);
    await expectFieldError("الحد الأدنى");
  });

  it("shows the max/step mismatch beside maximum field", async () => {
    render(<ProductFormFixture values={{ ...baseValues, maxWeightGrams: 275 }} />);
    await expectFieldError("الحد الأقصى");
  });

  it("shows the default/step mismatch beside default field", async () => {
    render(
      <ProductFormFixture values={{ ...baseValues, defaultWeightGrams: 125 }} />
    );
    await expectFieldError("الوزن الافتراضي");
  });

  it("shows the base/step mismatch beside base field", async () => {
    render(<ProductFormFixture values={{ ...baseValues, baseUnitGrams: 120 }} />);
    await expectFieldError("وحدة الوزن (جم)");
  });

  it("shows missing increment price beside increment price field", async () => {
    render(
      <ProductFormFixture
        values={{ ...baseValues, weightStepPriceSar: undefined }}
      />
    );
    await expectFieldError("سعر كل خطوة (ر.س)");
  });
});
