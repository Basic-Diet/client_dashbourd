import { normalizeOperationsQueueItem } from "../src/lib/operationsBoard";
import type { QueueAction } from "../src/types/dashboardOpsTypes";

export const productionGroups = [
  "البروتين",
  "الكارب",
  "الخضار",
  "الصوص",
  "الإضافات",
  "السلطة",
  "التغليف",
];

export function makeCanonicalOptions() {
  return Array.from({ length: 30 }, (_, index) => {
    const groupIndex = index % productionGroups.length;
    return {
      groupId: `group-${groupIndex + 1}`,
      groupName: productionGroups[groupIndex],
      optionId: `option-${index + 1}`,
      optionName:
        index === 4 ? "زيادة 50 جرام من الدجاج" : `اختيار ${index + 1}`,
      quantity: 1,
      totalHalala: index === 4 ? 500 : 0,
      extraWeightUnitGrams: index === 4 ? 50 : null,
    };
  });
}

export function makeKitchenOptions() {
  return makeCanonicalOptions().map((option, index) => ({
    groupId: option.groupId,
    groupName: option.groupName,
    optionId: option.optionId,
    optionName: option.optionName,
    quantity: 1,
    unitPriceHalala: index === 4 ? 500 : 0,
    totalPriceHalala: index === 4 ? 500 : 0,
    extraWeightUnitGrams: index === 4 ? 50 : null,
    extraWeightPriceHalala: index === 4 ? 500 : 0,
  }));
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
} = {}) {
  const canonicalOptions = makeCanonicalOptions();
  const kitchenOptions = makeKitchenOptions();
  const baseActions: QueueAction[] =
    actions ??
    [
      { id: "prepare", label: "بدء التحضير", endpoint: "/ops/prepare", method: "POST" },
      {
        id: "cancel",
        label: "إلغاء",
        color: "red",
        endpoint: "/ops/cancel",
        method: "POST",
        requiresReason: true,
      },
    ];
  const items = Array.from({ length: itemCount }, (_, index) => ({
    id: `line-${index + 1}`,
    productName: index === 0 ? "طبق دجاج مشوي" : `طبق إضافي ${index + 1}`,
    productSnapshot: {
      key: index === 0 ? "basic_salad" : `hidden_product_${index + 1}`,
      priceHalala: 2900 + index * 100,
    },
    quantity: 1,
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
                groupId: `extra-group-${index + 1}`,
                groupName: "إضافات الصنف",
                optionId: `extra-option-${index + 1}`,
                optionName: index === 1 ? "صلصة خاصة" : "جبنة إضافية",
                quantity: 1,
                totalHalala: index * 100,
              },
            ]
          : [],
  }));

  return {
    id: "order-one-time-fixture",
    entityId: "order-one-time-fixture",
    entityType: "order",
    source: {
      type: "one_time_order",
      reference: "OT-SAFE-1",
      status,
      statusLabel: arabicStatusLabel ? { ar: arabicStatusLabel } : statusLabel,
    },
    statusLabel,
    ui: { label: uiLabel },
    mode: "pickup",
    paymentStatus,
    customer: { id: "customer-safe", phone: "0500000000" },
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
      pickup: {
        branchName: { ar: "Main Branch" },
        pickupWindow: "18:00-20:00",
      },
    },
    orderSummary: {
      itemCount,
      mealCount: itemCount,
      addonCount: 0,
      notes: "بدون بصل",
      allergies: "مكسرات",
    },
    kitchenDetails: {
      mealSlots: [
        {
          productName: "طبق دجاج مشوي",
          quantity: 1,
          selectedOptions: kitchenOptions.flatMap((option) => [option, { ...option }]),
        },
      ],
      addons: [],
    },
    actions: { allowed: baseActions },
  };
}

export function makeNormalizedProductionOrder(
  options?: Parameters<typeof makeProductionOneTimeOrder>[0]
) {
  return normalizeOperationsQueueItem(makeProductionOneTimeOrder(options));
}
