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

test("one-time order presentation normalizes Arabic labels and production pricing", () => {
  const item = makeNormalizedProductionOrder();
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.isOneTimeOrder, true);
  assert.equal(presentation.statusLabel, "مؤكد");
  assert.equal(presentation.paymentLabel, "مدفوع");
  assert.equal(presentation.rawStatus, "confirmed");
  assert.equal(presentation.rawPaymentStatus, "paid");
  assert.equal(presentation.customerName, "عميل بدون اسم");
  assert.equal(presentation.customerPhone, "0500000000");
  assert.equal(presentation.itemCount, 1);
  assert.equal(presentation.quantityCount, 1);
  assert.equal(presentation.uniqueSelectionCount, 30);
  assert.equal(presentation.selectionGroupCount, 7);
  assert.equal(presentation.paidSelections.length, 1);
  assert.equal(presentation.paidSelections[0].optionName, "زيادة 50 جرام من الدجاج");
  assert.equal(presentation.paidSelections[0].priceHalala, 500);
  assert.equal(presentation.fulfillment.destination, "Main Branch");
  assert.equal(presentation.fulfillment.window, "18:00-20:00");

  const [presentedItem] = presentation.items;
  assert.equal(presentedItem.basePriceHalala, 2900);
  assert.equal(presentedItem.optionsPriceHalala, 500);
  assert.equal(presentedItem.unitPriceHalala, 3400);
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
  assert.ok(presentation.searchText.includes("paid"));
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

test("kitchen selectedOptions fallback deduplicates exact mirrors and keeps paid prices", () => {
  const item = makeNormalizedProductionOrder({ includeCanonicalItemOptions: false });
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.uniqueSelectionCount, 30);
  assert.equal(presentation.items[0].selectionGroups.length, 7);
  assert.equal(presentation.paidSelections.length, 1);
  assert.equal(presentation.paidSelections[0].priceHalala, 500);
  assert.equal(presentation.paidSelections[0].optionName, "زيادة 50 جرام من الدجاج");
});

test("multi-item one-time order keeps all items and paid selections in presentation", () => {
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
