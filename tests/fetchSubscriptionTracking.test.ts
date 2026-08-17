import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/apis", () => ({ default: apiMock }));

import { fetchSubscriptionTracking } from "@/utils/fetchSubscriptionTracking";

beforeEach(() => {
  apiMock.get.mockReset();
});

describe("subscription tracking response contract", () => {
  it("encodes the subscription id and normalizes a missing days list", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          contractVersion: "subscription_tracking.v1",
          readOnly: true,
          summary: {},
        },
      },
    });

    const response = await fetchSubscriptionTracking("subscription/unsafe");

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/dashboard/subscriptions/subscription%2Funsafe/tracking"
    );
    expect(response.data.days).toEqual([]);
  });

  it("rejects unsuccessful or malformed envelopes", async () => {
    apiMock.get.mockResolvedValueOnce({ data: { status: false } });

    await expect(fetchSubscriptionTracking("subscription-1")).rejects.toThrow(
      "contract mismatch"
    );
  });
});
