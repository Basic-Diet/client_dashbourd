import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildOperationsOrderPresentation,
  formatOperationsSar,
} from "../src/lib/operationsOrderPresentation";
import {
  makeNormalizedProductionOrder,
  makeProductionOneTimeOrder,
} from "./operationsOneTimeOrderFixtures";
import { normalizeOperationsQueueItem } from "../src/lib/operationsBoard";

test("one-time order presentation uses canonical item pricing and selectedOptions only for details", () => {
  const item = makeNormalizedProductionOrder();
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.isOneTimeOrder, true);
  assert.equal(presentation.statusLabel, "مؤكد");
  assert.equal(presentation.paymentLabel, "مدفوع");
  assert.equal(presentation.rawStatus, "confirmed");
  assert.equal(presentation.rawPaymentStatus, "paid");
  assert.equal(presentation.customerName, "0500000000");
  assert.equal(presentation.customerPhone, "0500000000");
  assert.equal(presentation.itemCount, 1);
  assert.equal(presentation.quantityCount, 1);
  assert.equal(presentation.uniqueSelectionCount, 30);
  assert.equal(presentation.selectionGroupCount, 7);
  assert.equal(presentation.paidSelections.length, 1);
  assert.equal(presentation.paidSelections[0].optionName, "زيادة 50 جرام من الدجاج");
  assert.equal(presentation.paidSelections[0].paidAmountHalala, 500);
  assert.equal(presentation.fulfillment.destination, "Main Branch");
  assert.equal(presentation.fulfillment.window, "18:00-20:00");

  const [presentedItem] = presentation.items;
  assert.equal(presentedItem.basePriceHalala, 2900);
  assert.equal(presentedItem.optionsAmountHalala, 500);
  assert.equal(presentedItem.unitAmountHalala, 3400);
  assert.equal(presentedItem.lineTotalHalala, 3400);
  assert.equal(presentedItem.currency, "SAR");
  assert.equal(presentedItem.vatIncluded, true);

  assert.equal(presentation.pricing.baseItemsHalala, 2900);
  assert.equal(presentation.pricing.optionsHalala, 500);
  assert.equal(presentation.pricing.totalHalala, 3400);
  assert.equal(presentation.pricing.vatHalala, 469);
  assert.equal(presentation.pricing.vatIncluded, true);
  assert.equal(presentation.totalLabel, "34.00 ر.س");
  assert.equal(formatOperationsSar(500), "5.00 ر.س");
  assert.ok(presentation.searchText.includes("confirmed"));
  assert.ok(presentation.searchText.includes("مؤكد"));
  assert.ok(presentation.searchText.includes("مدفوع"));
});

test("genuine Arabic backend status labels win over fallback maps", () => {
  const item = normalizeOperationsQueueItem(
    makeProductionOneTimeOrder({ arabicStatusLabel: "جاهز من الفرع" })
  );
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.statusLabel, "جاهز من الفرع");
});

test("canonical status wins over stale technical status labels", () => {
  const item = makeNormalizedProductionOrder({
    status: "in_preparation",
    statusLabel: "confirmed",
    uiLabel: "confirmed",
  });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.rawStatus, "in_preparation");
  assert.equal(presentation.statusLabel, "قيد التحضير");
});

test("canonical lifecycle statuses render through the Arabic fallback map", () => {
  assert.equal(
    buildOperationsOrderPresentation(
      makeNormalizedProductionOrder({ status: "ready_for_pickup" })
    ).statusLabel,
    "جاهز للاستلام"
  );
  assert.equal(
    buildOperationsOrderPresentation(
      makeNormalizedProductionOrder({ status: "fulfilled" })
    ).statusLabel,
    "مكتمل"
  );
});

test("canonical payment status wins over stale technical payment labels", () => {
  const item = makeNormalizedProductionOrder({
    paymentStatus: "refunded",
    paymentStatusLabel: "paid",
  });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.rawPaymentStatus, "refunded");
  assert.equal(presentation.paymentLabel, "مسترجع");
});

test("genuine Arabic backend payment labels win over fallback maps", () => {
  const item = makeNormalizedProductionOrder({
    paymentStatus: "failed",
    paymentStatusLabel: { ar: "راجع البنك" },
  });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.paymentLabel, "راجع البنك");
});

test("selectedOptions are not reconstructed from kitchen v2 when item details omit them", () => {
  const item = makeNormalizedProductionOrder({ includeCanonicalItemOptions: false });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.uniqueSelectionCount, 0);
  assert.equal(presentation.items[0].selectionGroups.length, 0);
  assert.equal(presentation.paidSelections.length, 0);
});

test("multi-item one-time order keeps all items and paid selections in detail presentation", () => {
  const item = makeNormalizedProductionOrder({ itemCount: 3 });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.items.length, 3);
  assert.equal(presentation.itemCount, 3);
  assert.equal(presentation.quantityCount, 3);
  assert.deepEqual(
    presentation.items.map((entry) => entry.name),
    ["طبق دجاج مشوي", "طبق إضافي 2", "طبق إضافي 3"]
  );
  assert.ok(presentation.paidSelections.length >= 2);
});
