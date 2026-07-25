import { buildListQuery } from "@/utils/buildListQuery";

type QueryParams = object;

export const dashboardSearchUrl = (q: string) =>
  `/api/dashboard/search${buildListQuery({ q })}`;

export const dashboardNotificationsSummaryUrl = () =>
  "/api/dashboard/notifications/summary";

export const dashboardReportsTodayUrl = () => "/api/dashboard/reports/today";

export const accountingDailyReportUrl = (params: QueryParams = {}) =>
  `/api/dashboard/accounting/daily-report${buildListQuery(params)}`;

export const accountingDailyReportExportUrl = (params: QueryParams = {}) =>
  `/api/dashboard/accounting/daily-report/export${buildListQuery({
    format: "csv",
    ...params,
  })}`;

export const subscriptionPaymentDailyReportUrl = (params: QueryParams = {}) =>
  `/api/dashboard/accounting/subscription-payments/daily${buildListQuery(params)}`;

export const subscriptionPaymentMonthlyReportUrl = (params: QueryParams = {}) =>
  `/api/dashboard/accounting/subscription-payments/monthly${buildListQuery(params)}`;

export const dashboardStaffUsersUrl = (params: QueryParams = {}) =>
  `/api/dashboard/staff-users${buildListQuery(params)}`;

export const dashboardStaffUserUrl = (id: string) =>
  `/api/dashboard/staff-users/${id}`;

export const dashboardStaffResetPasswordUrl = (id: string) =>
  `/api/dashboard/staff-users/${id}/reset-password`;

export const subscriptionTermsUrl = (locale?: string) =>
  `/api/dashboard/content/terms/subscription${buildListQuery({ locale })}`;

export const dashboardLogsUrl = (params: QueryParams = {}) =>
  `/api/dashboard/logs${buildListQuery(params)}`;

export const notificationLogsUrl = (params: QueryParams = {}) =>
  `/api/dashboard/notification-logs${buildListQuery(params)}`;

export type DashboardHealthKey =
  | "catalog"
  | "subscription-menu"
  | "meal-planner"
  | "indexes";

export const dashboardHealthUrl = (key: DashboardHealthKey) =>
  `/api/dashboard/health/${key}`;
