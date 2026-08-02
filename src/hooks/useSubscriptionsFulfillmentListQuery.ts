import api from "@/lib/apis";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type SubscriptionFulfillmentFilter = "all" | "delivery" | "pickup";

type SubscriptionListParams = {
  status?: string | null;
  fulfillmentMethod?: SubscriptionFulfillmentFilter;
  page?: number;
  limit?: number;
  q?: string;
};

async function fetchSubscriptionsFulfillmentList({
  status = null,
  fulfillmentMethod = "all",
  page = 1,
  limit = 20,
  q = "",
}: SubscriptionListParams) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (fulfillmentMethod !== "all") {
    params.set("fulfillmentMethod", fulfillmentMethod);
  }
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (q.trim()) params.set("q", q.trim());

  const response = await api.get(
    `/api/dashboard/subscriptions/list?${params.toString()}`
  );
  return response.data;
}

export function useSubscriptionsFulfillmentListQuery(
  params: SubscriptionListParams
) {
  return useQuery({
    queryKey: ["subscriptions-list", params],
    queryFn: () => fetchSubscriptionsFulfillmentList(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });
}
