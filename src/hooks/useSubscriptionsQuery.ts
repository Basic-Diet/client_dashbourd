import { fetchSubscriptionsSummary, fetchSubscriptionsList } from "@/utils/fetchSubscriptionsData";
import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";

export const subscriptionsSummaryQueryOptions = () =>
  queryOptions({
    queryKey: ["subscriptions-summary"],
    queryFn: fetchSubscriptionsSummary,
    staleTime: 1000 * 60 * 5,
  });

export const subscriptionsListQueryOptions = (
  status: string | null = null,
  page: number = 1,
  limit: number = 20,
  q: string = ""
) =>
  queryOptions({
    queryKey: ["subscriptions-list", { status, page, limit, q }],
    queryFn: () => fetchSubscriptionsList({ status, page, limit, q }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  });

export const useSubscriptionsSummaryQuery = () => {
  return useQuery(subscriptionsSummaryQueryOptions());
};

export const useSubscriptionsListQuery = (
  status: string | null = null,
  page: number = 1,
  limit: number = 20,
  q: string = ""
) => {
  return useQuery(subscriptionsListQueryOptions(status, page, limit, q));
};
