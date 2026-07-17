// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationsQueueTable } from "../src/components/pages/operations-board/OperationsQueueTable";
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

describe("one-time order operations card", () => {
  it("renders normalized Arabic labels, production pricing, and one details button", () => {
    renderTable();
    const bodyText = document.body.textContent || "";

    expect(screen.getByText("مؤكد")).toBeInTheDocument();
    expect(screen.getByText("مدفوع")).toBeInTheDocument();
    expect(screen.getAllByText("عميل بدون اسم").length).toBeGreaterThan(0);
    expect(screen.getAllByText("طبق دجاج مشوي").length).toBeGreaterThan(0);
    expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    expect(screen.getByText("7 مجموعات")).toBeInTheDocument();
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

    expect(screen.getAllByText("طبق دجاج مشوي").length).toBeGreaterThan(0);
    expect(screen.getAllByText("طبق إضافي 2").length).toBeGreaterThan(0);
    expect(screen.getByText("+1 أصناف أخرى")).toBeInTheDocument();
    expect(screen.getByText(/جبنة إضافية/)).toBeInTheDocument();
    expect(screen.getByText(/2.00 ر.س/)).toBeInTheDocument();
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

    expect(within(dialog).getAllByText("مؤكد").length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText("مدفوع").length).toBeGreaterThan(0);
    expect(optionMatches).toHaveLength(29);
    expect(within(dialog).getAllByText(/زيادة 50 جرام من الدجاج/)).toHaveLength(2);
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
