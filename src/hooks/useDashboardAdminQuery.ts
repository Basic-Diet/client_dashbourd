import {
  keepPreviousData,
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { sessionQueryOptions } from "@/lib/authApi";
import type {
  SubscriptionPaymentRangeParams,
} from "@/features/accounting/accountingRangeTypes";
import type {
  AccountingDailyReportParams,
  DashboardLogFilters,
  DashboardNotificationLogFilters,
  DashboardStaffUsersListParams,
  SubscriptionPaymentDailyParams,
  SubscriptionPaymentMonthlyParams,
  SubscriptionTermsPayload,
} from "@/types/dashboardAdminTypes";
import type { DashboardHealthKey } from "@/utils/dashboardApiContract";
import {
  createDashboardStaffUser,
  fetchDashboardStaffUsers,
  isDashboardStaffForbiddenError,
  resetDashboardStaffUserPassword,
  updateDashboardStaffUser,
} from "@/utils/fetchDashboardUsers";
import {
  fetchAccountingDailyReport,
  fetchDashboardHealth,
  fetchDashboardLogs,
  fetchDashboardNotificationsSummary,
  fetchDashboardReportsToday,
  fetchNotificationLogs,
  fetchSubscriptionPaymentDailyReport,
  fetchSubscriptionPaymentMonthlyReport,
  fetchSubscriptionPaymentRangeReport,
  resolveSubscriptionPaymentDailyParams,
  resolveSubscriptionPaymentMonthlyParams,
  resolveSubscriptionPaymentRangeParams,
  fetchSubscriptionTerms,
  updateSubscriptionTerms,
} from "@/utils/fetchDashboardSupportData";

export const dashboardStaffUserKeys = {
  all: ["dashboard-staff-users"] as const,
  lists: () => [...dashboardStaffUserKeys.all, "list"] as const,
  list: (params: DashboardStaffUsersListParams) =>
    [...dashboardStaffUserKeys.lists(), params] as const,
};

export const handleDashboardStaffAccessLoss = (queryClient: QueryClient) => {
  queryClient.removeQueries({ queryKey: dashboardStaffUserKeys.all });
  queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
};

const handleDashboardStaffMutationError = (
  error: unknown,
  queryClient: QueryClient
) => {
  if (isDashboardStaffForbiddenError(error)) {
    handleDashboardStaffAccessLoss(queryClient);
  }
};

export const dashboardStaffUsersQueryOptions = (
  params: DashboardStaffUsersListParams = {}
) =>
  queryOptions({
    queryKey: dashboardStaffUserKeys.list(params),
    queryFn: ({ signal }) => fetchDashboardStaffUsers(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 15,
    retry: false,
  });

export const dashboardNotificationSummaryQueryOptions = (limit?: number) =>
  queryOptions({
    queryKey: ["dashboard-notification-summary", { limit: limit ?? null }],
    queryFn: () => fetchDashboardNotificationsSummary(limit),
    staleTime: 1000 * 60,
  });

export const dashboardTodayReportQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard-today-report"],
    queryFn: fetchDashboardReportsToday,
    staleTime: 1000 * 60,
  });

export const accountingDailyReportQueryOptions = (
  params: AccountingDailyReportParams = {}
) =>
  queryOptions({
    queryKey: ["accounting-daily-report", params],
    queryFn: () => fetchAccountingDailyReport(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });

export const subscriptionPaymentDailyReportQueryOptions = (
  params: SubscriptionPaymentDailyParams = {}
) => {
  const resolvedParams = resolveSubscriptionPaymentDailyParams(params);

  return queryOptions({
    queryKey: ["subscription-payment-report", "daily", resolvedParams],
    queryFn: () => fetchSubscriptionPaymentDailyReport(resolvedParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    retry: false,
  });
};

export const subscriptionPaymentMonthlyReportQueryOptions = (
  params: SubscriptionPaymentMonthlyParams = {}
) => {
  const resolvedParams = resolveSubscriptionPaymentMonthlyParams(params);

  return queryOptions({
    queryKey: ["subscription-payment-report", "monthly", resolvedParams],
    queryFn: () => fetchSubscriptionPaymentMonthlyReport(resolvedParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    retry: false,
  });
};

export const subscriptionPaymentRangeReportQueryOptions = (
  params: SubscriptionPaymentRangeParams = {}
) => {
  const resolvedParams = resolveSubscriptionPaymentRangeParams(params);

  return queryOptions({
    queryKey: ["subscription-payment-report", "range", resolvedParams],
    queryFn: () => fetchSubscriptionPaymentRangeReport(resolvedParams),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
    retry: false,
  });
};

export const dashboardLogsQueryOptions = (params: DashboardLogFilters = {}) =>
  queryOptions({
    queryKey: ["dashboard-logs", params],
    queryFn: () => fetchDashboardLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });

export const dashboardNotificationLogsQueryOptions = (
  params: DashboardNotificationLogFilters = {}
) =>
  queryOptions({
    queryKey: ["dashboard-notification-logs", params],
    queryFn: () => fetchNotificationLogs(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });

export const subscriptionTermsQueryOptions = (locale?: string) =>
  queryOptions({
    queryKey: ["subscription-terms", locale ?? "default"],
    queryFn: () => fetchSubscriptionTerms(locale),
    staleTime: 1000 * 60 * 5,
  });

export const dashboardHealthQueryOptions = (key: DashboardHealthKey) =>
  queryOptions({
    queryKey: ["dashboard-health", key],
    queryFn: () => fetchDashboardHealth(key),
    staleTime: 1000 * 60,
  });

export const useDashboardStaffUsersQuery = (
  params: DashboardStaffUsersListParams = {},
  enabled = false
) =>
  useQuery({
    ...dashboardStaffUsersQueryOptions(params),
    enabled,
  });

export const useAccountingDailyReportQuery = (
  params: AccountingDailyReportParams = {},
  enabled = true
) =>
  useQuery({
    ...accountingDailyReportQueryOptions(params),
    enabled,
  });

export const useSubscriptionPaymentDailyReportQuery = (
  params: SubscriptionPaymentDailyParams = {},
  enabled = true
) =>
  useQuery({
    ...subscriptionPaymentDailyReportQueryOptions(params),
    enabled,
  });

export const useSubscriptionPaymentMonthlyReportQuery = (
  params: SubscriptionPaymentMonthlyParams = {},
  enabled = true
) =>
  useQuery({
    ...subscriptionPaymentMonthlyReportQueryOptions(params),
    enabled,
  });

export const useSubscriptionPaymentRangeReportQuery = (
  params: SubscriptionPaymentRangeParams = {},
  enabled = true
) =>
  useQuery({
    ...subscriptionPaymentRangeReportQueryOptions(params),
    enabled,
  });

export const useCreateDashboardStaffUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDashboardStaffUser,
    retry: false,
    gcTime: 0,
    onError: (error) => {
      handleDashboardStaffMutationError(error, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardStaffUserKeys.all });
    },
  });
};

export const useUpdateDashboardStaffUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDashboardStaffUser,
    retry: false,
    onError: (error) => {
      handleDashboardStaffMutationError(error, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardStaffUserKeys.all });
    },
  });
};

export const useResetDashboardStaffUserPasswordMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetDashboardStaffUserPassword,
    retry: false,
    gcTime: 0,
    onError: (error) => {
      handleDashboardStaffMutationError(error, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardStaffUserKeys.all });
    },
  });
};

export const useUpdateSubscriptionTermsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubscriptionTermsPayload) =>
      updateSubscriptionTerms(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-terms"] });
    },
  });
};
