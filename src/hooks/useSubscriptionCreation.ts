import {
  createDashboardSubscription,
  fetchDashboardAddonPlans,
  fetchDashboardBuilderPremiumMeals,
  quoteDashboardSubscription,
} from "@/utils/fetchSubscriptionCreation";
import type {
  DashboardSubscriptionCashCreatePayload,
  DashboardSubscriptionSelectionPayload,
} from "@/types/subscriptionCreationTypes";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const dashboardBuilderPremiumMealsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard-builder-premium-meals"],
    queryFn: fetchDashboardBuilderPremiumMeals,
    staleTime: 1000 * 60 * 2,
  });

export const dashboardAddonPlansQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard-addon-plans"],
    queryFn: fetchDashboardAddonPlans,
    staleTime: 1000 * 60 * 5,
  });

export const useDashboardBuilderPremiumMealsQuery = () =>
  useQuery(dashboardBuilderPremiumMealsQueryOptions());

export const useDashboardAddonPlansQuery = () =>
  useQuery(dashboardAddonPlansQueryOptions());

export const useDashboardSubscriptionQuoteMutation = () =>
  useMutation({
    mutationFn: (payload: DashboardSubscriptionSelectionPayload) =>
      quoteDashboardSubscription(payload),
    retry: false,
  });

export const useDashboardSubscriptionCreateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DashboardSubscriptionCashCreatePayload) =>
      createDashboardSubscription(payload),
    retry: false,
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-list"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-details", payload.userId] });
      queryClient.invalidateQueries({
        queryKey: ["user-subscriptions", payload.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
    },
  });
};
