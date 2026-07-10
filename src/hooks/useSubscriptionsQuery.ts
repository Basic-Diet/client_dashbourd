import {
  fetchSubscriptionsSummary,
  fetchSubscriptionsList,
  fetchSubscriptionDetails,
  freezeSubscription,
  unfreezeSubscription,
  extendSubscription,
  cancelSubscription,
  createSubscription,
  fetchSubscriptionAudit,
  searchSubscriptionsByPhone,
  manualDeductSubscription,
  fetchSubscriptionManualDeductions,
  fetchSubscriptionLifecycle,
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

export const subscriptionAuditQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["subscription-audit", id],
    queryFn: () => fetchSubscriptionAudit(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });

export const useSubscriptionAuditQuery = (id: string) =>
  useQuery(subscriptionAuditQueryOptions(id));

export const subscriptionLifecycleQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["subscription-lifecycle", id],
    queryFn: () => fetchSubscriptionLifecycle(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });

export const useSubscriptionLifecycleQuery = (id: string) =>
  useQuery(subscriptionLifecycleQueryOptions(id));

export const manualDeductionsQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: ["subscription-manual-deductions", id],
    queryFn: () => fetchSubscriptionManualDeductions(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 30,
  });

export const useSubscriptionManualDeductionsQuery = (id: string | null) =>
  useQuery(manualDeductionsQueryOptions(id));

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
    mutationFn: (id: string) => cancelSubscription(id),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      const userId =
        variables && typeof variables.userId === "string"
          ? variables.userId
          : null;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ["user-details", userId] });
        queryClient.invalidateQueries({ queryKey: ["user-subscriptions", userId] });
      }
    },
  });
};

export const useSearchSubscriptionsByPhoneQuery = (phone: string) => {
  return useQuery({
    queryKey: ["subscriptions-search", phone],
    queryFn: () => searchSubscriptionsByPhone(phone),
    enabled: !!phone && phone.length >= 8,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
};

export const useManualDeductSubscriptionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: manualDeductSubscription,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-details", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-search"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-manual-deductions", variables.id] });
    },
  });
};
