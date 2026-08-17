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
        اختيار عنصر
      </button>
    ),
  })
);

import { MealPlannerCardDialogV2 } from "../src/components/pages/menu/meal-builder/MealPlannerCardDialogV2";

afterEach(() => cleanup());

describe("Meal Planner V2 required fields", () => {
  it("keeps direct-card submit disabled until names and product are complete", async () => {
    const user = userEvent.setup();
    render(
      <MealPlannerCardDialogV2
        catalog={{ products: [], optionGroups: [], options: [] }}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    const submit = screen.getByRole("button", { name: "إنشاء الكارت" });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByLabelText("الاسم العربي"),
      "وجبات جاهزة"
    );
    await user.type(
      screen.getByLabelText("الاسم الإنجليزي"),
      "Ready Meals"
    );
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "اختيار عنصر" }));
    expect(submit).toBeEnabled();
  });
});
