import assert from "node:assert/strict";
import { test } from "vitest";
import {
  countDeliveryByStatusFilter,
  enrichDeliveryOperationItem,
  filterDeliveryOperations,
  getAllDeliveryOperationItems,
  getDeliveryOperationAreaValues,
  getDeliveryOperationZone,
  matchesDeliveryActionFilter,
  matchesDeliverySearch,
  matchesDeliveryStatusFilter,
} from "../src/lib/deliveryOperations";
import type { UnifiedQueueItem } from "../src/types/dashboardOpsTypes";

function queueItem(
  overrides: Partial<UnifiedQueueItem> & Pick<UnifiedQueueItem, "id" | "status">
): UnifiedQueueItem {
  return {
    id: overrides.id,
    entityId: overrides.entityId ?? overrides.id,
    entityType: overrides.entityType ?? "subscription_day",
    source: overrides.source ?? "subscription",
    type: overrides.type ?? "subscription",
    mode: overrides.mode ?? "delivery",
    reference: overrides.reference ?? overrides.id,
    orderNumber: overrides.orderNumber,
    status: overrides.status,
    statusLabel: overrides.statusLabel ?? overrides.status,
    ui: overrides.ui ?? {},
    customer: overrides.customer ?? {
      id: `customer-${overrides.id}`,
      name: "عميل اختبار",
      phone: "+966 55 123 4567",
    },
    fulfillment: overrides.fulfillment ?? { mode: "delivery" },
    delivery: overrides.delivery ?? null,
    kitchen: overrides.kitchen ?? null,
    allowedActions: overrides.allowedActions ?? [],
    timestamps: overrides.timestamps ?? {
      createdAt: null,
      updatedAt: null,
    },
    context: overrides.context ?? { date: "2026-07-30" },
    rawData: overrides.rawData,
  };
}

const readySubscription = enrichDeliveryOperationItem(
  queueItem({
    id: "sub-ready",
    status: "ready_for_delivery",
    reference: "SUB-READY-001",
    delivery: {
      window: "10:00–12:00",
      zone: { id: "zone-salamah", name: "سلامة" },
      address: {
        line1: "شارع الأمير",
        district: "الروضة",
        city: "جدة",
        building: "14",
      },
    },
    allowedActions: [
      {
        id: "pickup",
        label: "استلام للتوصيل",
        endpoint: "/api/courier/deliveries/1/collect",
        method: "PUT",
      },
    ],
  })
);

const oneTimeOnRoad = enrichDeliveryOperationItem(
  queueItem({
    id: "order-road",
    entityType: "order",
    source: "one_time_order",
    type: "order",
    status: "arriving_soon",
    orderNumber: "ORD-7788",
    customer: {
      id: "customer-order",
      name: "أحمد محمد",
      phone: "+966501112233",
    },
    delivery: {
      window: "12:00 - 14:00",
      zone: { id: "zone-north", name: "شمال جدة" },
      address: {
        line1: "طريق المدينة",
        district: "النزهة",
        city: "جدة",
      },
    },
    allowedActions: [
      {
        id: "fulfill",
        label: "تم التسليم",
        endpoint: "/api/courier/orders/2/delivered",
        method: "PUT",
      },
    ],
  })
);

const canceledSubscription = enrichDeliveryOperationItem(
  queueItem({
    id: "sub-canceled",
    status: "delivery_canceled",
    customer: {
      id: "customer-canceled",
      name: "سارة",
      phone: "+966500000000",
    },
    delivery: {
      window: "10:00-12:00",
      address: { district: "الصفا", city: "جدة" },
    },
  })
);

const genericAreaSubscription = enrichDeliveryOperationItem(
  queueItem({
    id: "sub-generic-area",
    status: "preparing",
    customer: {
      id: "customer-generic",
      name: "هناء الشريف",
      phone: "+966544111785",
    },
    delivery: {
      window: "10:00-12:00",
      zone: { id: "other-jeddah", name: "مناطق أخرى داخل جدة" },
      address: {
        district: "مناطق أخرى داخل جدة",
        street: "شارع الدرر الثاني - حي النعيم",
        city: "Jeddah",
      },
    },
  })
);

test("delivery list keeps only delivery operations", () => {
  const pickupRequest = queueItem({
    id: "pickup-request",
    status: "ready_for_pickup",
    source: "subscription_pickup_request",
    entityType: "subscription_pickup_request",
    type: "subscription_pickup_request",
  });
  assert.deepEqual(
    getAllDeliveryOperationItems([readySubscription, pickupRequest]).map(
      (item) => item.id
    ),
    ["sub-ready"]
  );
});

test("delivery status tabs include every operational alias", () => {
  assert.equal(matchesDeliveryStatusFilter("open", "preparing"), true);
  assert.equal(matchesDeliveryStatusFilter("locked", "preparing"), true);
  assert.equal(matchesDeliveryStatusFilter("ready_for_delivery", "preparing"), true);
  assert.equal(matchesDeliveryStatusFilter("arriving_soon", "out_for_delivery"), true);
  assert.equal(matchesDeliveryStatusFilter("fulfilled", "delivered"), true);
  assert.equal(matchesDeliveryStatusFilter("delivery_canceled", "canceled"), true);

  assert.equal(
    countDeliveryByStatusFilter(
      [readySubscription, oneTimeOnRoad, canceledSubscription],
      "all"
    ),
    3
  );
  assert.equal(
    countDeliveryByStatusFilter(
      [readySubscription, oneTimeOnRoad, canceledSubscription],
      "preparing"
    ),
    1
  );
});

test("area filter prefers the precise district over a broad delivery zone", () => {
  assert.equal(getDeliveryOperationZone(readySubscription), "الروضة");
  assert.deepEqual(getDeliveryOperationAreaValues(readySubscription), [
    "الروضة",
    "سلامة",
    "zone-salamah",
    "جدة",
  ]);

  assert.deepEqual(
    filterDeliveryOperations(
      [readySubscription, oneTimeOnRoad, canceledSubscription],
      {
        zoneFilter: "الروضة",
        windowFilter: "10:00 - 12:00",
      }
    ).map((item) => item.id),
    ["sub-ready"]
  );

  assert.deepEqual(
    filterDeliveryOperations([readySubscription, oneTimeOnRoad], {
      zoneFilter: "سلامة",
    }).map((item) => item.id),
    ["sub-ready"]
  );
});

test("generic Jeddah area recovers the real neighborhood from the address", () => {
  assert.equal(getDeliveryOperationZone(genericAreaSubscription), "النعيم");
  assert.deepEqual(
    filterDeliveryOperations([genericAreaSubscription, readySubscription], {
      zoneFilter: "النعيم",
    }).map((item) => item.id),
    ["sub-generic-area"]
  );
  assert.equal(matchesDeliverySearch(genericAreaSubscription, "حي النعيم"), true);
});

test("search covers Arabic text, normalized digits, references and complete addresses", () => {
  assert.equal(matchesDeliverySearch(readySubscription, "الروضة مبنى 14"), true);
  assert.equal(matchesDeliverySearch(readySubscription, "سلامة"), true);
  assert.equal(matchesDeliverySearch(readySubscription, "SUB READY 001"), true);
  assert.equal(matchesDeliverySearch(readySubscription, "٩٦٦ ٥٥ ١٢٣ ٤٥٦٧"), true);
  assert.equal(matchesDeliverySearch(oneTimeOnRoad, "أحمد طريق المدينة"), true);
  assert.equal(matchesDeliverySearch(oneTimeOnRoad, "ORD 7788"), true);
});

test("source, status and action filters combine without leaking unrelated rows", () => {
  assert.deepEqual(
    filterDeliveryOperations(
      [readySubscription, oneTimeOnRoad, canceledSubscription],
      {
        sourceFilter: "subscription",
        statusFilter: "preparing",
        actionFilter: "ready_to_collect",
      }
    ).map((item) => item.id),
    ["sub-ready"]
  );

  assert.equal(
    matchesDeliveryActionFilter(oneTimeOnRoad, "out_for_delivery"),
    true
  );
  assert.equal(matchesDeliveryActionFilter(canceledSubscription, "no_actions"), true);
});
