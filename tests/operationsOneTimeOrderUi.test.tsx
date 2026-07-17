// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationsQueueTable } from "../src/components/pages/operations-board/OperationsQueueTable";
import type { KitchenCard } from "../src/types/dashboardOpsTypes";
import {
  makeNormalizedProductionOrder,
} from "./operationsOneTimeOrderFixtures";

afterEach(() => {
  cleanup();
});

function renderTable(items = [makeNormalizedProductionOrder()]) {
  return render(
    <OperationsQueueTable
      items={items}
      isPending={false}
      pendingActions={{}}
      onAction={vi.fn()}
    />
  );
}

function fiveKitchenCards(): KitchenCard[] {
  const unavailableWarning = "مكون غير متوفر";

  return Array.from({ length: 5 }, (_, index) => ({
    cardId: `card-${index + 1}`,
    type: index === 4 ? "chef_choice" : "standard_meal",
    title: `Prep card ${index + 1}`,
    quantity: 1,
    lines: [`Line ${index + 1}`],
    components: {
      protein: { name: `Protein ${index + 1}` },
    },
    sections:
      index >= 2
        ? [
            {
              label: "Hidden paid section",
              items: [
                ...(index === 2
                  ? [
                      {
                        name: "Hidden paid chicken",
                        quantity: 1,
                        payableTotalHalala: 500,
                        productUnitPriceHalala: 500,
                      },
                    ]
                  : []),
                ...(index === 3
                  ? [
                      {
                        name: "Hidden paid sauce",
                        quantity: 1,
                        payableTotalHalala: 250,
                        productUnitPriceHalala: 250,
                      },
                    ]
                  : []),
                ...(index === 4
                  ? [
                      {
                        name: "Hidden paid salmon",
                        quantity: 1,
                        grams: 80,
                        payableTotalHalala: 800,
                        productUnitPriceHalala: 800,
                      },
                      {
                        name: "Hidden paid avocado",
                        quantity: 1,
                        payableTotalHalala: 300,
                        productUnitPriceHalala: 300,
                      },
                    ]
                  : []),
              ],
            },
          ]
        : [],
    warnings:
      index === 0
        ? [unavailableWarning]
        : index === 3
          ? ["Important hidden warning", unavailableWarning]
          : index === 4
            ? ["Third warning", "Fourth warning", "Fifth warning"]
            : [],
  }));
}

describe("one-time order operations card", () => {
  it("renders normalized Arabic labels, production pricing, and one details button", () => {
    renderTable();
    const bodyText = document.body.textContent || "";

    expect(screen.getByText("مؤكد")).toBeInTheDocument();
    expect(screen.getAllByText("0500000000").length).toBeGreaterThan(1);
    expect(screen.getAllByText("سلطة على مزاجك").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/30 مكو/).length).toBeGreaterThan(0);
    expect(screen.getByText("7 أقسام")).toBeInTheDocument();
    expect(screen.getByText(/زيادة 50 جرام من الدجاج/)).toBeInTheDocument();
    expect(screen.getAllByText(/5.00 ر.س/).length).toBeGreaterThan(0);
    expect(screen.getByText("Main Branch")).toBeInTheDocument();
    expect(screen.getByText("18:00-20:00")).toBeInTheDocument();
    expect(screen.getAllByText("34.00 ر.س").length).toBeGreaterThan(0);

    expect(screen.getAllByRole("button", { name: /عرض التفاصيل الكاملة/ })).toHaveLength(1);
    expect(bodyText).not.toContain("confirmed");
    expect(bodyText).not.toContain("paid");
    expect(bodyText).not.toContain("basic_salad");
    expect(bodyText).not.toContain("order-one-time-fixture");
  });

  it("shows multiple item summaries and hidden-item paid extras", () => {
    renderTable([makeNormalizedProductionOrder({ itemCount: 3 })]);

    expect(screen.getAllByText("سلطة على مزاجك").length).toBeGreaterThan(0);
    expect(screen.getByText("34.00 ر.س")).toBeInTheDocument();
  });

  it("bounds compact kitchen cards while preserving hidden paid extras", async () => {
    const unavailableWarning = "مكون غير متوفر";

    renderTable([
      makeNormalizedProductionOrder({
        kitchenCards: fiveKitchenCards(),
        kitchenWarnings: [unavailableWarning],
      }),
    ]);

    expect(screen.getByText("Prep card 1")).toBeInTheDocument();
    expect(screen.getByText("Prep card 2")).toBeInTheDocument();
    expect(screen.queryByText("Prep card 3")).not.toBeInTheDocument();
    expect(screen.getByText("+3 بطاقات تحضير أخرى")).toBeInTheDocument();
    expect(screen.getByText(/Hidden paid chicken - 5.00 ر.س/)).toBeInTheDocument();
    expect(screen.getByText(/Hidden paid sauce - 2.50 ر.س/)).toBeInTheDocument();
    expect(screen.queryByText(/Hidden paid salmon - 8.00 ر.س/)).not.toBeInTheDocument();
    expect(screen.getByText("+2 إضافات مدفوعة أخرى")).toBeInTheDocument();
    expect(screen.getAllByText(unavailableWarning)).toHaveLength(1);
    expect(screen.getByText(/Important hidden warning/)).toBeInTheDocument();
    expect(screen.queryByText("Third warning")).not.toBeInTheDocument();
    expect(screen.getByText("+3 تنبيهات أخرى")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /عرض التفاصيل الكاملة/ }));
    const dialog = screen.getByRole("dialog");

    for (let index = 1; index <= 5; index += 1) {
      expect(within(dialog).getByText(`Prep card ${index}`)).toBeInTheDocument();
    }
    expect(within(dialog).getByText("Hidden paid salmon")).toBeInTheDocument();
    expect(within(dialog).getByText("Hidden paid avocado")).toBeInTheDocument();
    expect(within(dialog).getByText("Third warning")).toBeInTheDocument();
    expect(within(dialog).getByText("Fourth warning")).toBeInTheDocument();
    expect(within(dialog).getByText("Fifth warning")).toBeInTheDocument();
  });

  it("keeps responsive card grid classes", () => {
    renderTable();
    const grid = document.querySelector(".grid.gap-4.xl\\:grid-cols-2");

    expect(grid?.className).toContain("2xl:grid-cols-3");
    expect(document.body.textContent || "").not.toContain("line-clamp-1");
  });
});

describe("one-time order details dialog", () => {
  it("renders all unique options once with pricing and scrollable dialog content", async () => {
    renderTable();
    await userEvent.click(screen.getByRole("button", { name: /عرض التفاصيل الكاملة/ }));

    const dialog = screen.getByRole("dialog");
    const dialogText = dialog.textContent || "";
    const optionMatches = within(dialog).getAllByText(/^اختيار \d+$/);
    const paidOptionMatches = within(dialog).getAllByText(/زيادة 50 جرام من الدجاج/);

    expect(within(dialog).getAllByText("مؤكد").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("مدفوع").length).toBeGreaterThan(0);
    expect(optionMatches.length).toBeGreaterThanOrEqual(29);
    expect(paidOptionMatches.length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getByText("السعر الأساسي")).toBeInTheDocument();
    expect(within(dialog).getAllByText("29.00 ر.س").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("5.00 ر.س").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("سعر الوحدة")).toBeInTheDocument();
    expect(within(dialog).getAllByText("34.00 ر.س").length).toBeGreaterThan(0);
    expect(within(dialog).getByText("4.69 ر.س")).toBeInTheDocument();
    expect(within(dialog).getAllByText("الضريبة مشمولة").length).toBeGreaterThan(0);
    expect(document.querySelector(".custom-scrollbar.overflow-y-auto")).toBeTruthy();
    expect(dialogText).not.toContain("confirmed");
    expect(dialogText).not.toContain("paid");
    expect(dialogText).not.toContain("basic_salad");
    expect(dialogText).not.toContain("order-one-time-fixture");
  });
});
