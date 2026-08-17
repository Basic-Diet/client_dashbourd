import api from "@/lib/apis";
import type { SubscriptionTrackingResponse } from "@/types/subscriptionTrackingTypes";

export async function fetchSubscriptionTracking(
  subscriptionId: string
): Promise<SubscriptionTrackingResponse> {
  const response = await api.get<unknown>(
    `/api/dashboard/subscriptions/${encodeURIComponent(subscriptionId)}/tracking`
  );
  const payload = response.data;
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    (payload as { status?: unknown }).status !== true ||
    !(payload as { data?: unknown }).data ||
    typeof (payload as { data?: unknown }).data !== "object" ||
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    throw new Error("Subscription tracking response contract mismatch");
  }

  const typedPayload = payload as SubscriptionTrackingResponse;
  return {
    ...typedPayload,
    data: {
      ...typedPayload.data,
      days: Array.isArray(typedPayload.data.days) ? typedPayload.data.days : [],
    },
  };
}
