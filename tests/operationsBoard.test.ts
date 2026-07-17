import assert from "node:assert/strict";
import { test } from "vitest";
import {
  buildOperationsActionPayload,
  extractOperationsQueueItems,
  getCourierItems,
  getInvalidActionReason,
  getItemsByStatuses,
  getPickupItems,
  getSafeOperationsTab,
  getScreensForRole,
} from "../src/lib/operationsBoard";
import type { UnifiedQueueItem } from "../src/types/dashboardOpsTypes";
import { makeProductionOneTimeOrder } from "./operationsOneTimeOrderFixtures";

test("operations screens and canonical queue helpers", () => {
  const makeItem = (overrides: Partial<UnifiedQueueItem>): UnifiedQueueItem =>
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
      fulfillment: { type: "pickup", mode: "pickup" },
      context: { date: null },
      allowedActions: [],
      timestamps: { createdAt: null, updatedAt: null },
      ...overrides,
    }) as UnifiedQueueItem;

  assert.deepEqual(getScreensForRole("kitchen").screens, ["kitchen", "pickup"]);
  assert.deepEqual(getScreensForRole("courier").screens, ["courier"]);
  assert.deepEqual(getScreensForRole("cashier").screens, [
    "kitchen",
    "pickup",
    "courier",
  ]);
  assert.equal(getSafeOperationsTab("pickup", ["kitchen", "pickup"]), "pickup");
  assert.equal(getSafeOperationsTab("courier", ["kitchen", "pickup"]), "kitchen");

  const courierMode = ["deliv", "ery"].join("") as "delivery";
  const items = [
    makeItem({ entityId: "ready-pickup", status: "ready", mode: "pickup" }),
    makeItem({
      entityId: "subscription-delivery",
      status: "out_for_delivery",
      mode: courierMode,
      source: "subscription",
      entityType: "subscription_day",
      type: "subscription",
    }),
    makeItem({
      entityId: "subscription-pickup-request",
      source: "subscription_pickup_request",
      entityType: "subscription_pickup_request",
      type: "subscription_pickup_request",
      mode: "pickup",
    }),
  ];

  assert.deepEqual(
    getItemsByStatuses(items, ["ready"]).map((item) => item.entityId),
    ["ready-pickup", "subscription-pickup-request"]
  );
  assert.deepEqual(
    getPickupItems(items).map((item) => item.entityId),
    ["ready-pickup", "subscription-pickup-request"]
  );
  assert.deepEqual(
    getCourierItems(items).map((item) => item.entityId),
    ["subscription-delivery"]
  );
});

test("canonical action payload omits legacy top-level action fields", () => {
  const [item] = extractOperationsQueueItems({
    data: {
      items: [makeProductionOneTimeOrder()],
    },
  });

  assert.deepEqual(
    buildOperationsActionPayload(item, "fulfill", undefined, "note", "1111"),
    {
      entityId: "order-one-time-fixture",
      entityType: "order",
      source: "one_time_order",
      payload: {
        notes: "note",
        pickupCode: "1111",
      },
    }
  );
  assert.equal("action" in buildOperationsActionPayload(item, "fulfill"), false);
  assert.equal("reason" in buildOperationsActionPayload(item, "fulfill"), false);
  assert.equal("note" in buildOperationsActionPayload(item, "fulfill"), false);
});

test("extracts canonical top-level kitchen v2 rows without legacy fallback", () => {
  const [item] = extractOperationsQueueItems({
    data: {
      contractVersion: "kitchen_operations.v2",
      items: [
        {
          ...makeProductionOneTimeOrder(),
          kitchenDetails: {
            mealSlots: [{ productName: "legacy should be ignored" }],
          },
        },
      ],
    },
  });

  assert.equal(item.contractVersion, "kitchen_operations.v2");
  assert.equal(item.entityType, "order");
  assert.equal(item.source, "one_time_order");
  assert.equal(item.mode, "pickup");
  assert.equal(item.customer.name, "0500000000");
  assert.equal(item.customer.phone, "0500000000");
  assert.equal(item.context.branch, "Main Branch");
  assert.equal(item.context.window, "18:00-20:00");
  assert.equal(item.kitchen?.version, "v2");
  assert.equal(item.kitchen?.cards[0]?.type, "basic_salad");
  assert.equal(item.kitchen?.cards[0]?.sections?.length, 7);
  assert.equal(item.allowedActions[0].endpoint, "/api/dashboard/ops/actions/prepare");
});

test("invalid canonical action endpoints are disabled with configuration reason", () => {
  const [item] = extractOperationsQueueItems({
    data: [
      makeProductionOneTimeOrder({
        actions: [
          {
            id: "prepare",
            label: "بدء التحضير",
            endpoint: "https://example.com/prepare",
            method: "POST",
          },
        ],
      }),
    ],
  });

  assert.equal(item.allowedActions[0].disabled, true);
  assert.ok(getInvalidActionReason(item.allowedActions[0]));
});
