import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import {
  executeCourierDeliveryAction,
  fetchCourierDeliveryList,
} from "../src/utils/fetchCourierDeliveries";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@/lib/apis", () => ({
  default: {
    get: mocks.get,
    request: mocks.request,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("courier actions reject encoded path traversal from backend metadata", async () => {
  await assert.rejects(
    executeCourierDeliveryAction({
      action: "fulfill",
      payload: {
        entityId: "delivery-1",
        entityType: "subscription_day",
        payload: {},
      },
      actionDef: {
        id: "fulfill",
        label: "Fulfill",
        endpoint: "/api/courier/deliveries/%2e%2e/admin/delete",
        method: "PUT",
      },
    }),
    /Unsupported courier action endpoint/
  );
  assert.equal(mocks.request.mock.calls.length, 0);
});

test("courier delivery list renders actions only from backend allowedActions", async () => {
  mocks.get.mockResolvedValue({
    data: {
      status: true,
      meta: { readOnly: true, role: "restaurant" },
      data: [
        {
          id: "delivery-1",
          entityId: "delivery-1",
          type: "subscription",
          status: "out_for_delivery",
          scheduledDate: "2026-07-26",
          deliveryWindow: "10:00-12:00",
          customerName: "Customer",
          customerPhone: "+966500000000",
          canCourierPickup: true,
          canMarkArrivingSoon: true,
          canMarkDelivered: true,
          canCancel: true,
          allowedActions: [],
          allowedActionIds: [],
        },
      ],
    },
  });

  const response = await fetchCourierDeliveryList();
  const [item] = response.data.items;

  assert.equal(mocks.get.mock.calls[0][0], "/api/courier/deliveries/today");
  assert.equal(item.id, "delivery-1");
  assert.deepEqual(item.allowedActions, []);
});
