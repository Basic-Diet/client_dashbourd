import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildKitchenV2Presentation,
  formatOperationsSar,
  UNSUPPORTED_KITCHEN_MESSAGE,
} from "../src/lib/operationsKitchenV2Presentation";
import type { KitchenCard } from "../src/types/dashboardOpsTypes";
import {
  makeNormalizedProductionOrder,
} from "./operationsOneTimeOrderFixtures";

function card(type: string, overrides: Partial<KitchenCard> = {}): KitchenCard {
  return {
    type,
    title: overrides.title ?? `${type} title`,
    badge: overrides.badge,
    quantity: overrides.quantity ?? 1,
    lines: overrides.lines ?? [`${type} line`],
    components: overrides.components,
    sections: overrides.sections ?? [],
    notes: overrides.notes,
    warnings: overrides.warnings ?? [],
  };
}

test("basic salad kitchen presentation reads cards, sections, and counters from Kitchen v2", () => {
  const kitchen = buildKitchenV2Presentation(makeNormalizedProductionOrder());

  assert.equal(kitchen.supported, true);
  assert.equal(kitchen.mealCount, 1);
  assert.equal(kitchen.cardCount, 1);
  assert.equal(kitchen.cards[0].type, "basic_salad");
  assert.equal(kitchen.cards[0].title, "سلطة على مزاجك");
  assert.equal(kitchen.cards[0].sectionCount, 7);
  assert.equal(kitchen.cards[0].itemCount, 30);
  assert.equal(kitchen.cards[0].paidExtras.length, 1);
  assert.equal(kitchen.cards[0].paidExtras[0].name, "زيادة 50 جرام من الدجاج");
  assert.equal(kitchen.cards[0].paidExtras[0].label, "5.00 ر.س");
  assert.ok(kitchen.searchText.includes("سلطة على مزاجك"));
  assert.ok(kitchen.searchText.includes("زيادة 50 جرام من الدجاج"));
});

test("SAR formatter preserves zero and lets callers choose null fallback", () => {
  assert.equal(formatOperationsSar(undefined), "");
  assert.equal(formatOperationsSar(null, "غير محدد"), "غير محدد");
  assert.equal(formatOperationsSar(0), "0.00 ر.س");
  assert.equal(formatOperationsSar(500), "5.00 ر.س");
  assert.equal(formatOperationsSar(3400), "34.00 ر.س");
});

test("compact salad counters prefer components.salad while detail rows stay from card.sections", () => {
  const kitchen = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({
      kitchenCards: [
        card("basic_salad", {
          title: "عدادات السلطة",
          components: { salad: { sectionCount: 7, itemCount: 30 } },
          sections: [],
        }),
      ],
    })
  );

  assert.equal(kitchen.cards[0].sectionCount, 7);
  assert.equal(kitchen.cards[0].itemCount, 30);
  assert.equal(kitchen.cards[0].sections.length, 0);
});

test("Kitchen v2 card renderer keeps supported and unknown card types renderable", () => {
  const cards = [
    card("premium_large_salad", {
      badge: "Premium",
      components: {
        protein: { name: "دجاج", grams: 150 },
        salad: { sectionCount: 7, itemCount: 30 },
      },
    }),
    card("standard_meal", {
      components: {
        protein: { name: "لحم", grams: 120 },
        carbs: [{ name: "أرز" }],
      },
    }),
    card("premium_meal", {
      badge: "Premium",
      components: {
        protein: { name: "سلمون", grams: 180 },
        carbs: { name: "بطاطس" },
      },
    }),
    card("sandwich", {
      components: {
        product: { name: "ساندوتش دجاج" },
      },
    }),
    card("chef_choice", {
      lines: [],
      sections: [],
    }),
    card("unknown_backend_card", {
      notes: "ملاحظة عامة",
      warnings: ["تنبيه"],
    }),
  ];
  const kitchen = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({ kitchenCards: cards })
  );

  assert.deepEqual(
    kitchen.cards.map((entry) => entry.type),
    [
      "premium_large_salad",
      "standard_meal",
      "premium_meal",
      "sandwich",
      "chef_choice",
      "unknown_backend_card",
    ]
  );
  assert.ok(kitchen.cards.find((entry) => entry.type === "chef_choice"));
  assert.ok(kitchen.searchText.includes("سلمون"));
  assert.ok(kitchen.searchText.includes("ساندوتش دجاج"));
  assert.ok(kitchen.searchText.includes("تنبيه"));
});

test("Kitchen v2 add-ons render only from addonGroups", () => {
  const kitchen = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({
      kitchenAddonGroups: [
        {
          label: "مشروبات",
          items: [
            {
              name: "ماء",
              quantity: 2,
              payableTotalHalala: 300,
              productUnitPriceHalala: 150,
            },
          ],
        },
      ],
    })
  );

  assert.equal(kitchen.addonGroupCount, 1);
  assert.equal(kitchen.addonItemCount, 2);
  assert.equal(kitchen.addonGroups[0].label, "مشروبات");
  assert.equal(kitchen.addonGroups[0].items[0].name, "ماء");
  assert.equal(kitchen.addonGroups[0].items[0].paidLabel, "3.00 ر.س");
  assert.equal(kitchen.paidAddonItems[0].label, "3.00 ر.س");
});

test("structured warnings prefer Arabic and never render objects", () => {
  const kitchen = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({
      kitchenCards: [
        card("unknown_backend_card", {
          warnings: [
            "تنبيه نصي",
            { messageAr: "مكون غير متوفر" },
            { messageEn: "Ingredient unavailable" },
            { code: "INGREDIENT_UNAVAILABLE" },
          ],
        }),
      ],
      kitchenWarnings: [
        "تنبيه نصي",
        { messageAr: "مكون غير متوفر" },
        { messageEn: "Ingredient unavailable" },
        { code: "INGREDIENT_UNAVAILABLE" },
      ],
    })
  );

  assert.deepEqual(kitchen.cards[0].warnings, [
    "تنبيه نصي",
    "مكون غير متوفر",
    "Ingredient unavailable",
    "INGREDIENT_UNAVAILABLE",
  ]);
  assert.deepEqual(kitchen.warningMessages, [
    "تنبيه نصي",
    "مكون غير متوفر",
    "Ingredient unavailable",
    "INGREDIENT_UNAVAILABLE",
  ]);
  assert.equal(kitchen.searchText.includes("[object Object]"), false);
});

test("Kitchen v2 presentation preserves visible, hidden, and top-level warnings", () => {
  const duplicateWarning = "مكون غير متوفر";
  const kitchen = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({
      kitchenCards: [
        card("standard_meal", {
          title: "Prep card 1",
          warnings: [duplicateWarning],
        }),
        card("standard_meal", {
          title: "Prep card 2",
          warnings: [],
        }),
        card("standard_meal", {
          title: "Prep card 3",
          warnings: ["Important hidden warning", duplicateWarning],
        }),
      ],
      kitchenWarnings: [duplicateWarning],
    })
  );

  assert.deepEqual(kitchen.cards[0].warnings, [duplicateWarning]);
  assert.deepEqual(kitchen.cards[2].warnings, ["Important hidden warning", duplicateWarning]);
  assert.deepEqual(kitchen.warningMessages, [duplicateWarning]);
});

test("unsupported and empty Kitchen v2 states are explicit", () => {
  const unsupported = buildKitchenV2Presentation(
    { ...makeNormalizedProductionOrder(), kitchen: null }
  );
  assert.equal(unsupported.supported, false);
  assert.equal(unsupported.unsupportedMessage, UNSUPPORTED_KITCHEN_MESSAGE);

  const empty = buildKitchenV2Presentation(
    makeNormalizedProductionOrder({ kitchenCards: [], kitchenAddonGroups: [] })
  );
  assert.equal(empty.supported, true);
  assert.equal(empty.isEmptyKitchenDay, true);
  assert.equal(UNSUPPORTED_KITCHEN_MESSAGE.includes("تعذر"), true);
});
