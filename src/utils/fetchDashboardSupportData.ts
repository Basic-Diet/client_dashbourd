import api from "@/lib/apis";
import type {
  AccountingDailyReportParams,
  AccountingDailyReportResponse,
  DashboardHealthReportResponse,
  DashboardLogFilters,
  DashboardLogsResponse,
  DashboardNotificationLogFilters,
  DashboardNotificationLogsResponse,
  DashboardNotificationSummaryResponse,
  DashboardTodayReportResponse,
  SubscriptionPaymentDailyReportResponse,
  SubscriptionTermsPayload,
  SubscriptionTermsResponse,
} from "@/types/dashboardAdminTypes";
import { getTodayKSADate } from "@/utils/ksaDate";
import {
  accountingDailyReportExportUrl,
  accountingDailyReportUrl,
  dashboardHealthUrl,
  dashboardLogsUrl,
  dashboardNotificationsSummaryUrl,
  dashboardReportsTodayUrl,
  dashboardSearchUrl,
  notificationLogsUrl,
  subscriptionTermsUrl,
  type DashboardHealthKey,
} from "@/utils/dashboardApiContract";

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

const toQueryParams = (params: object): QueryParams =>
  Object.fromEntries(
    Object.entries(params as Record<string, QueryValue>).filter(
      ([, value]) => value !== undefined
    )
  );

export const resolveAccountingDailyReportParams = (
  params: AccountingDailyReportParams = {}
): AccountingDailyReportParams => ({
  ...params,
  date: params.date ?? getTodayKSADate(),
});

export const fetchDashboardSearch = async (q: string): Promise<unknown> => {
  const response = await api.get(dashboardSearchUrl(q));
  return response.data;
};

export const fetchDashboardNotificationsSummary =
  async (
    limit?: number
  ): Promise<DashboardNotificationSummaryResponse> => {
    const response = await api.get<DashboardNotificationSummaryResponse>(
      dashboardNotificationsSummaryUrl(),
      {
        params: { limit },
      }
    );
    return response.data;
  };

export const fetchDashboardReportsToday =
  async (): Promise<DashboardTodayReportResponse> => {
    const response = await api.get<DashboardTodayReportResponse>(
      dashboardReportsTodayUrl()
    );
    return response.data;
  };

export const fetchAccountingDailyReport = async (
  params: AccountingDailyReportParams = {}
): Promise<AccountingDailyReportResponse> => {
  const resolved = resolveAccountingDailyReportParams(params);
  const response = await api.get<AccountingDailyReportResponse>(
    accountingDailyReportUrl(toQueryParams(resolved))
  );
  return response.data;
};

export const fetchSubscriptionPaymentDailyReport = async (
  params: AccountingDailyReportParams = {}
): Promise<SubscriptionPaymentDailyReportResponse> => {
  const resolved = resolveAccountingDailyReportParams(params);
  const response = await api.get<SubscriptionPaymentDailyReportResponse>(
    "/api/dashboard/accounting/subscription-payments/daily",
    { params: toQueryParams(resolved) }
  );
  return response.data;
};

export const fetchAccountingDailyReportExport = async (
  params: AccountingDailyReportParams = {}
): Promise<Blob> => {
  const resolved = resolveAccountingDailyReportParams(params);
  const response = await api.get(
    accountingDailyReportExportUrl(toQueryParams(resolved)),
    {
      responseType: "blob",
    }
  );
  return response.data;
};

export const fetchSubscriptionTerms = async (
  locale?: string
): Promise<SubscriptionTermsResponse> => {
  const response = await api.get<SubscriptionTermsResponse>(
    subscriptionTermsUrl(locale)
  );
  return response.data;
};

export const updateSubscriptionTerms = async (
  data: SubscriptionTermsPayload
): Promise<SubscriptionTermsResponse> => {
  const response = await api.put<SubscriptionTermsResponse>(
    subscriptionTermsUrl(),
    data
  );
  return response.data;
};

export const fetchDashboardLogs = async (
  params: DashboardLogFilters = {}
): Promise<DashboardLogsResponse> => {
  const response = await api.get<DashboardLogsResponse>(
    dashboardLogsUrl(toQueryParams(params))
  );
  return response.data;
};

export const fetchNotificationLogs = async (
  params: DashboardNotificationLogFilters = {}
): Promise<DashboardNotificationLogsResponse> => {
  const response = await api.get<DashboardNotificationLogsResponse>(
    notificationLogsUrl(toQueryParams(params))
  );
  return response.data;
};

export const fetchDashboardHealth = async (
  key: DashboardHealthKey
): Promise<DashboardHealthReportResponse> => {
  const response = await api.get<DashboardHealthReportResponse>(
    dashboardHealthUrl(key)
  );
  return response.data;
};
