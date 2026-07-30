import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionTracking } from "@/utils/fetchSubscriptionTracking";

export const subscriptionTrackingQueryKey = (subscriptionId: string) =>
  ["subscription-tracking", subscriptionId] as const;

export function useSubscriptionTrackingQuery(subscriptionId: string) {
  return useQuery({
    queryKey: subscriptionTrackingQueryKey(subscriptionId),
    queryFn: () => fetchSubscriptionTracking(subscriptionId),
    enabled: Boolean(subscriptionId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
