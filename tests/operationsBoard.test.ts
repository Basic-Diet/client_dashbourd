import assert from "node:assert/strict";
import {
  buildOperationsActionPayload,
  extractOperationsQueueItems,
  getCourierItems,
  getEndpointForAction,
  getItemsByStatuses,
  getPickupItems,
  getPreparationItems,
  getSafeOperationsTab,
  getScreensForRole,
} from "../src/lib/operationsBoard";
import type { UnifiedQueueItem } from "../src/types/dashboardOpsTypes";

const makeItem = (
  overrides: Partial<UnifiedQueueItem>
): UnifiedQueueItem =>
  ({
    id: overrides.entityId,
    entityId: overrides.entityId,
    entityType: "order",
    source: "one_time_order",
    type: "order",
    mode: "pickup",
    reference: overrides.entityId,
    status: "ready",
    statusLabel: "Ready",
    ui: { label: "Ready", color: "blue", icon: "store" },
    customer: { id: "customer-1", name: "Customer", phone: "123" },
    context: { date: null },
    allowedActions: [],
    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }) as UnifiedQueueItem;

assert.deepEqual(getScreensForRole("kitchen").screens, ["kitchen", "pickup"]);
assert.deepEqual(getScreensForRole("courier").screens, ["courier"]);
assert.deepEqual(getScreensForRole("cashier").screens, []);
assert.equal(
  getSafeOperationsTab("pickup", ["kitchen", "pickup", "courier"]),
  "pickup"
);
assert.equal(
  getSafeOperationsTab("courier", ["kitchen", "pickup"]),
  "kitchen"
);
assert.equal(getSafeOperationsTab(undefined, ["courier"]), "courier");
assert.equal(getSafeOperationsTab(undefined, []), "kitchen");

const items = [
  makeItem({ entityId: "confirmed-pickup", status: "confirmed", mode: "pickup" }),
  makeItem({ entityId: "ready-pickup", status: "ready_for_pickup", mode: "pickup" }),
  makeItem({
    entityId: "delivery-order",
    status: "out_for_delivery",
    mode: "delivery",
  }),
  makeItem({
    entityId: "subscription-pickup-request",
    source: "subscription_pickup_request",
    entityType: "subscription_pickup_request",
    type: "subscription_pickup_request",
    status: "ready_for_pickup",
    mode: "pickup",
  }),
];

assert.deepEqual(
  getItemsByStatuses(items, ["ready_for_pickup"]).map((item) => item.entityId),
  ["ready-pickup", "subscription-pickup-request"]
);

assert.deepEqual(
  getPreparationItems(items).map((item) => item.entityId),
  ["confirmed-pickup"]
);

assert.deepEqual(
  getPickupItems(items).map((item) => item.entityId),
  ["ready-pickup", "subscription-pickup-request"]
);

assert.deepEqual(
  getCourierItems(items).map((item) => item.entityId),
  ["delivery-order"]
);

assert.equal(
  getEndpointForAction("fulfill"),
  "/api/dashboard/ops/actions/fulfill"
);

assert.deepEqual(
  buildOperationsActionPayload(items[1], "fulfill", undefined, "note", "1111"),
  {
    entityId: "ready-pickup",
    entityType: "order",
    source: "one_time_order",
    action: "fulfill",
    reason: undefined,
    note: "note",
    payload: {
      reason: undefined,
      notes: "note",
      pickupCode: "1111",
    },
  }
);

const chefChoiceResponse = {
  data: {
    contractVersion: "dashboard_queue.v2",
    items: [
      {
        ids: {
          entityType: "subscription_day",
          entityId: "day-1",
          subscriptionDayId: "day-1",
          deliveryId: null,
          pickupRequestId: null,
        },
        customer: { id: "customer-1", name: "Ahmed", phone: "+966500000000" },
        source: {
          type: "subscription",
          reference: "SUB-1",
          date: "2026-06-21",
          status: "open",
          statusLabel: { ar: "مفتوح" },
        },
        subscription: {
          plan: {
            selectedMealsPerDay: 2,
            remainingMeals: 20,
            deliveryMode: "delivery",
          },
        },
        orderSummary: { mealCount: 2, itemCount: 2, hasPremium: false, hasAddons: false },
        kitchen: {
          meals: [
            {
              slotIndex: 1,
              mealType: "chef_choice",
              mealTypeLabel: { ar: "اختيار الشيف", en: "Chef Choice" },
              product: {
                key: "chef_choice",
                name: { ar: "اختيار الشيف", en: "Chef Choice" },
                displayName: "اختيار الشيف",
              },
              quantity: 1,
              display: { titleAr: "اختيار الشيف" },
            },
            {
              slotIndex: 2,
              mealType: "chef_choice",
              quantity: 1,
              display: { titleAr: "اختيار الشيف" },
            },
          ],
          addons: [],
        },
        fulfillment: {
          type: "home_delivery",
          delivery: {
            date: "2026-06-21",
            window: "09:00-10:00",
            address: {
              displayAddressAr: "الرياض، حي الياسمين",
              notes: "اتصل قبل الوصول",
            },
          },
        },
        payment: {
          paymentRequired: false,
          paymentStatus: "paid",
          paymentApplied: true,
          pendingUnpaid: false,
          superseded: false,
          revisionMismatch: false,
          canPrepare: true,
          canFulfill: true,
        },
        actions: {
          allowed: ["prepare"],
          canPrepare: true,
          canDispatch: false,
          canReadyForPickup: false,
          canFulfill: false,
          canCancel: true,
          canNoShow: false,
          canReopen: false,
        },
        dataQuality: {
          isComplete: true,
          warnings: [{ code: "CHEF_CHOICE_MEALS", severity: "info" }],
        },
        selectionMode: "chef_choice",
        selectionModeLabel: { ar: "اختيار الشيف", en: "Chef Choice" },
        selectionNotice: {
          ar: "العميل لم يحدد الوجبات، سيتم تجهيز وجبات اختيار الشيف",
          en: "The customer did not select meals. Chef Choice meals will be prepared.",
        },
      },
    ],
  },
};

const [chefChoiceItem] = extractOperationsQueueItems(chefChoiceResponse);

assert.equal(chefChoiceItem.entityType, "subscription_day");
assert.equal(chefChoiceItem.mode, "delivery");
assert.equal(chefChoiceItem.selectionMode, "chef_choice");
assert.equal(chefChoiceItem.context.mealCount, 2);
assert.equal(chefChoiceItem.context.addressSummary, "الرياض، حي الياسمين");
assert.equal(chefChoiceItem.context.addressNotes, "اتصل قبل الوصول");
assert.equal(chefChoiceItem.mealSlots?.length, 2);
assert.equal(chefChoiceItem.mealSlots?.[0]?.items[0]?.name, "اختيار الشيف");
assert.deepEqual(
  buildOperationsActionPayload(chefChoiceItem, "prepare"),
  {
    entityId: "day-1",
    entityType: "subscription_day",
    source: "subscription",
    action: "prepare",
    reason: undefined,
    note: undefined,
    payload: {
      reason: undefined,
      notes: undefined,
      pickupCode: undefined,
    },
  }
);
