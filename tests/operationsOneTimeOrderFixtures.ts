import { normalizeOperationsQueueItem } from "../src/lib/operationsBoard";
import type { KitchenCard, QueueAction } from "../src/types/dashboardOpsTypes";

export const productionGroups = [
  "البروتين",
  "الكارب",
  "الخضار",
  "الصوص",
  "إضافة بروتين",
  "السلطة",
  "التغليف",
];

export function makeCanonicalOptions() {
  return Array.from({ length: 30 }, (_, index) => {
    const groupIndex = index % productionGroups.length;
    const isPaidProtein = index === 4;
    return {
      groupId: `group-${groupIndex + 1}`,
      groupKey: `group-${groupIndex + 1}`,
      groupName: productionGroups[groupIndex],
      optionId: `option-${index + 1}`,
      optionKey: `option-${index + 1}`,
      optionName:
        isPaidProtein ? "زيادة 50 جرام من الدجاج" : `اختيار ${index + 1}`,
      quantity: 1,
      grams: null,
      unitPriceHalala: isPaidProtein ? 500 : 0,
      totalPriceHalala: isPaidProtein ? 500 : 0,
      extraWeightUnitGrams: isPaidProtein ? 50 : 0,
      extraWeightPriceHalala: isPaidProtein ? 500 : 0,
    };
  });
}

function makeSaladSections(): KitchenCard["sections"] {
  const options = makeCanonicalOptions();
  return productionGroups.map((group, groupIndex) => ({
    label: group,
    items: options
      .filter((_, optionIndex) => optionIndex % productionGroups.length === groupIndex)
      .map((option) => ({
        name: option.optionName,
        quantity: 1,
        grams: option.optionName.includes("50 جرام") ? 50 : undefined,
        productUnitPriceHalala: option.unitPriceHalala,
        payableTotalHalala: option.totalPriceHalala,
      })),
  }));
}

export function makeKitchenCards(
  cards: KitchenCard[] = [
    {
      type: "basic_salad",
      title: "سلطة على مزاجك",
      badge: "Basic",
      quantity: 1,
      lines: ["100 جرام بروتين", "30 مكوناً"],
      components: {
        salad: {
          sectionCount: 7,
          itemCount: 30,
        },
      },
      sections: makeSaladSections(),
      warnings: [],
    },
  ]
) {
  return cards;
}

export function action(
  id: string,
  label: string,
  method: QueueAction["method"] = "POST",
  color?: string
): QueueAction {
  return {
    id,
    label,
    endpoint: `/api/dashboard/ops/actions/${id}`,
    method,
    color,
  };
}

export function makeProductionOneTimeOrder({
  includeCanonicalItemOptions = true,
  status = "confirmed",
  statusLabel = status,
  uiLabel = status,
  paymentStatus = "paid",
  paymentStatusLabel = paymentStatus,
  actions,
  itemCount = 1,
  arabicStatusLabel,
  customerName,
  kitchenCards,
  kitchenAddonGroups = [],
  kitchenWarnings = [],
}: {
  includeCanonicalItemOptions?: boolean;
  status?: string;
  statusLabel?: unknown;
  uiLabel?: string;
  paymentStatus?: string;
  paymentStatusLabel?: unknown;
  actions?: QueueAction[];
  itemCount?: number;
  arabicStatusLabel?: string;
  customerName?: string | null;
  kitchenCards?: KitchenCard[];
  kitchenAddonGroups?: Array<{
    label?: string;
    items: Array<{
      name?: string;
      quantity?: number;
      productUnitPriceHalala?: number;
      payableTotalHalala?: number;
    }>;
  }>;
  kitchenWarnings?: unknown[];
} = {}) {
  const canonicalOptions = makeCanonicalOptions();
  const baseActions: QueueAction[] =
    actions ?? [action("prepare", "بدء التحضير"), action("cancel", "إلغاء", "POST", "red")];
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `line-${index + 1}`,
    productName: index === 0 ? "طبق دجاج مشوي" : `طبق إضافي ${index + 1}`,
    quantity: 1,
    unitPriceHalala: 3400 + index * 200,
    lineTotalHalala: 3400 + index * 200,
    pricingSnapshot: {
      basePriceHalala: 2900 + index * 100,
      optionsTotalHalala: index === 0 ? 500 : index * 100,
      unitPriceHalala: 3400 + index * 200,
      lineTotalHalala: 3400 + index * 200,
      currency: "SAR",
      vatIncluded: true,
    },
    selectedOptions:
      includeCanonicalItemOptions && index === 0
        ? canonicalOptions
        : index > 0
          ? [
              {
                groupName: "إضافات الصنف",
                optionName: index === 1 ? "صلصة خاصة" : "جبنة إضافية",
                quantity: 1,
                grams: null,
                unitPriceHalala: index * 100,
                totalPriceHalala: index * 100,
                extraWeightUnitGrams: 0,
                extraWeightPriceHalala: 0,
              },
            ]
          : [],
  }));

  return {
    id: "order-one-time-fixture",
    entityId: "order-one-time-fixture",
    entityType: "order",
    source: "one_time_order",
    type: "order",
    reference: "OT-SAFE-1",
    orderNumber: "10001",
    status,
    statusLabel: arabicStatusLabel ? { ar: arabicStatusLabel } : statusLabel,
    ui: { label: uiLabel, badge: "blue", icon: "store" },
    mode: "pickup",
    paymentStatus,
    customer: { id: "customer-safe", name: customerName ?? null, phone: "0500000000" },
    items,
    pricing: {
      subtotalHalala: 3400,
      deliveryHalala: 0,
      discountHalala: 0,
      vatHalala: 469,
      totalHalala: 3400,
      currency: "SAR",
      vatIncluded: true,
    },
    payment: {
      paymentStatus,
      paymentStatusLabel,
    },
    fulfillment: {
      type: "pickup",
      mode: "pickup",
      pickup: {
        branchName: { ar: "Main Branch" },
        branchId: "branch-hidden",
        pickupWindow: "18:00-20:00",
        pickupCode: "1234",
        pickupCodeState: "active",
      },
    },
    orderSummary: {
      itemCount,
      mealCount: itemCount,
      addonCount: kitchenAddonGroups.reduce((sum, group) => sum + group.items.length, 0),
      notes: "بدون بصل",
      allergies: "مكسرات",
    },
    kitchen: {
      version: "v2",
      mealCount: kitchenCards?.length ?? 1,
      cards: makeKitchenCards(kitchenCards),
      addonGroups: kitchenAddonGroups,
      warnings: kitchenWarnings,
    },
    allowedActions: baseActions,
  };
}

export function makeNormalizedProductionOrder(
  options?: Parameters<typeof makeProductionOneTimeOrder>[0]
) {
  return normalizeOperationsQueueItem(makeProductionOneTimeOrder(options));
}
