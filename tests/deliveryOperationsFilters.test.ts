import assert from "node:assert/strict";
import { test } from "vitest";

import {
  filterDeliveryOperations,
  getAllDeliveryOperationItems,
  getDeliveryOperationWindow,
  getDeliveryOperationZone,
  matchesDeliveryActionFilter,
} from "../src/lib/deliveryOperations";
import { countByFilter, type UnifiedQueueItem } from "../src/types/dashboardOpsTypes";

const makeItem = (overrides: Partial<UnifiedQueueItem>): UnifiedQueueItem =>
  ({
    id: overrides.id ?? overrides.entityId ?? "item",
    entityId: overrides.entityId ?? overrides.id ?? "item",
    entityType: "subscription_day",
    source: "subscription",
    type: "subscription",
    mode: "delivery",
    reference: "REF-1",
    status: "preparing",
    statusLabel: "قيد التحضير",
    ui: { label: "قيد التحضير" },
    customer: { name: "عميل", phone: "0500000000" },
    fulfillment: { type: "delivery", mode: "delivery" },
    context: { date: "2026-07-27", window: "10:00-12:00" },
    delivery: {
      window: "10:00-12:00",
      deliveryWindow: "10:00-12:00",
      zone: { id: "north", name: "الشمال" },
      addressSummary: "حي النخيل",
    },
    allowedActions: [],
    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }) as UnifiedQueueItem;

test("delivery filters use enriched delivery fields consistently", () => {
  const delivery = makeItem({
    id: "delivery-1",
    context: { date: "2026-07-27" },
    delivery: undefined,
    rawData: {
      fulfillment: {
        delivery: {
          window: " 12:00-14:00 ",
          zone: { id: "east", name: "الشرق" },
          address: { district: "الروضة", street: "شارع الأمير" },
        },
      },
    },
  });
  const pickupRequest = makeItem({
    id: "pickup-request",
    source: "subscription_pickup_request",
    entityType: "subscription_pickup_request",
    type: "subscription_pickup_request",
    mode: "delivery",
  });

  const items = getAllDeliveryOperationItems([delivery, pickupRequest]);

  assert.equal(items.length, 1);
  assert.equal(getDeliveryOperationWindow(items[0]), "12:00-14:00");
  assert.equal(getDeliveryOperationZone(items[0]), "الشرق");
  assert.equal(
    filterDeliveryOperations(items, { windowFilter: "12:00-14:00" }).length,
    1
  );
  assert.equal(
    filterDeliveryOperations(items, { zoneFilter: "الشرق" }).length,
    1
  );
  assert.equal(filterDeliveryOperations(items, { search: "الروضة" }).length, 1);
  assert.equal(filterDeliveryOperations(items, { search: "غير موجود" }).length, 0);
});

test("delivery filters cover source, status, and action aliases", () => {
  const subscriptionReady = makeItem({
    id: "subscription-ready",
    source: "subscription",
    status: "ready_for_delivery",
    allowedActions: [
      {
        id: "courier_pickup",
        label: "استلام للتوصيل",
        endpoint: "/api/courier/deliveries/subscription-ready/collect",
        method: "PUT",
      },
    ],
  });
  const oneTimeOut = makeItem({
    id: "order-out",
    entityType: "order",
    source: "one_time_order",
    type: "order",
    status: "arriving_soon",
    allowedActions: [],
  });
  const disabledOnly = makeItem({
    id: "disabled",
    allowedActions: [
      {
        id: "fulfill",
        label: "تم التسليم",
        endpoint: "/api/courier/deliveries/disabled/delivered",
        method: "PUT",
        disabled: true,
      },
    ],
  });

  const items = [subscriptionReady, oneTimeOut, disabledOnly];

  assert.equal(
    filterDeliveryOperations(items, { sourceFilter: "one_time_order" }).map(
      (item) => item.id
    )[0],
    "order-out"
  );
  assert.deepEqual(
    filterDeliveryOperations(items, { statusFilter: "out_for_delivery" }).map(
      (item) => item.id
    ),
    ["order-out"]
  );
  assert.equal(countByFilter(items, "out_for_delivery"), 1);
  assert.equal(matchesDeliveryActionFilter(subscriptionReady, "ready_to_collect"), true);
  assert.equal(matchesDeliveryActionFilter(subscriptionReady, "needs_action"), true);
  assert.equal(matchesDeliveryActionFilter(disabledOnly, "needs_action"), false);
  assert.equal(matchesDeliveryActionFilter(disabledOnly, "no_actions"), true);
});
