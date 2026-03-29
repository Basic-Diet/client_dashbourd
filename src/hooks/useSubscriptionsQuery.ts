import {
  fetchSubscriptionsSummary,
  fetchSubscriptionsList,
  fetchSubscriptionDetails,
  freezeSubscription,
  unfreezeSubscription,
  extendSubscription,
  cancelSubscription,
  createSubscription,
} from "@/utils/fetchSubscriptionsData";
import { queryOptions, useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";


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

export const subscriptionDetailsQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["subscription-details", id],
    queryFn: () => fetchSubscriptionDetails(id),
    staleTime: 1000 * 60 * 5,
  });

export const useSubscriptionDetailsQuery = (id: string) => {
  return useQuery(subscriptionDetailsQueryOptions(id));
};

export const useFreezeSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: freezeSubscription,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-details", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
    },
  });
};

export const useUnfreezeSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unfreezeSubscription,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-details", id] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
    },
  });
};

export const useExtendSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: extendSubscription,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-details", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
    },
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-details", id] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
    },
  });
};

export const useCreateSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
