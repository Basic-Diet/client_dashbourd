import assert from "node:assert/strict";
import { test } from "vitest";
import { normalizeOperationsQueueItem } from "../src/lib/operationsBoard";
import {
  buildOperationsOrderPresentation,
  formatOperationsSar,
} from "../src/lib/operationsOrderPresentation";

const groupNames = [
  "البروتين",
  "الكارب",
  "الخضار",
  "الصوص",
  "الإضافات",
  "السلطة",
  "التغليف",
];

function makeOptions() {
  return Array.from({ length: 30 }, (_, index) => {
    const groupIndex = index % groupNames.length;
    return {
      groupId: `group-${groupIndex + 1}`,
      groupName: groupNames[groupIndex],
      optionId: `option-${index + 1}`,
      optionName:
        index === 4 ? "زيادة دجاج 50 جرام" : `اختيار ${index + 1}`,
      quantity: 1,
      extraPriceHalala: index === 4 ? 500 : 0,
      extraWeightGrams: index === 4 ? 50 : null,
    };
  });
}

function makeRawOrder(includeCanonicalItemOptions = true) {
  const selectedOptions = makeOptions();
  return {
    id: "order-ops-1",
    entityId: "order-ops-1",
    entityType: "order",
    source: {
      type: "one_time_order",
      reference: "OT-1001",
      status: "confirmed",
      statusLabel: { ar: "مؤكد" },
    },
    mode: "pickup",
    customer: { id: "customer-1", phone: "+966500000000" },
    items: [
      {
        id: "line-1",
        productName: "طبق دجاج مشوي",
        quantity: 1,
        basePriceHalala: 2900,
        optionsPriceHalala: 500,
        lineTotalHalala: 3400,
        selectedOptions: includeCanonicalItemOptions ? selectedOptions : [],
      },
    ],
    pricing: {
      baseItemsHalala: 2900,
      optionsHalala: 500,
      subtotalHalala: 3400,
      deliveryHalala: 0,
      discountHalala: 0,
      vatHalala: 0,
      totalHalala: 3400,
    },
    payment: {
      paymentStatus: "paid",
      paymentStatusLabel: { ar: "مدفوع" },
    },
    fulfillment: {
      type: "pickup",
      pickup: {
        branchName: { ar: "Main Branch" },
        pickupWindow: "18:00-20:00",
      },
    },
    orderSummary: {
      itemCount: 1,
      mealCount: 1,
      addonCount: 0,
      notes: "بدون بصل",
      allergies: "مكسرات",
    },
    kitchen: {
      meals: [
        {
          productName: "طبق دجاج مشوي",
          quantity: 1,
          selectedOptions: selectedOptions.flatMap((option) => [
            option,
            { ...option },
          ]),
        },
      ],
      addons: [],
    },
    actions: {
      allowed: [
        { id: "prepare", label: "تحضير", endpoint: "/ops/prepare" },
        {
          id: "cancel",
          label: "إلغاء",
          color: "red",
          endpoint: "/ops/cancel",
          requiresReason: true,
        },
      ],
    },
  };
}

test("one-time order presentation prefers canonical item options and does not show duplicated kitchen mirrors", () => {
  const item = normalizeOperationsQueueItem(makeRawOrder());
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.isOneTimeOrder, true);
  assert.equal(presentation.customerName, "عميل بدون اسم");
  assert.equal(presentation.customerPhone, "+966500000000");
  assert.equal(presentation.itemCount, 1);
  assert.equal(presentation.quantityCount, 1);
  assert.equal(presentation.uniqueSelectionCount, 30);
  assert.equal(presentation.selectionGroupCount, 7);
  assert.equal(presentation.paidSelections.length, 1);
  assert.equal(presentation.paidSelections[0].priceHalala, 500);
  assert.equal(presentation.fulfillment.destination, "Main Branch");
  assert.equal(presentation.fulfillment.window, "18:00-20:00");
  assert.equal(presentation.pricing.totalHalala, 3400);
  assert.equal(presentation.totalLabel, "34.00 ر.س");
  assert.deepEqual(
    presentation.actions.map((action) => action.id),
    ["prepare", "cancel"]
  );
  assert.equal(formatOperationsSar(500), "5.00 ر.س");
});

test("one-time order presentation deduplicates exact kitchen selectedOptions when used as fallback", () => {
  const item = normalizeOperationsQueueItem(makeRawOrder(false));
  const presentation = buildOperationsOrderPresentation(item);

  assert.equal(presentation.uniqueSelectionCount, 30);
  assert.equal(presentation.items[0].selectionGroups.length, 7);
  assert.equal(presentation.paidSelections.length, 1);
});
