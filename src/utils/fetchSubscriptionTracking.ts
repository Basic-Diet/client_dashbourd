import api from "@/lib/apis";
import type { SubscriptionTrackingResponse } from "@/types/subscriptionTrackingTypes";

export async function fetchSubscriptionTracking(
  subscriptionId: string
): Promise<SubscriptionTrackingResponse> {
  const response = await api.get<SubscriptionTrackingResponse>(
    `/api/dashboard/subscriptions/${subscriptionId}/tracking`
  );
  return response.data;
}
