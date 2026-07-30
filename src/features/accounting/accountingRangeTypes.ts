import type { DashboardStatusResponse } from "@/types/dashboardAdminTypes";
import type {
  SubscriptionPaymentBucket,
  SubscriptionPaymentDailyBreakdownItem,
  SubscriptionPaymentMonthlyReportData,
  SubscriptionPaymentMonthlyStatistics,
} from "@/features/accounting/accountingTypes";

export interface SubscriptionPaymentRangeParams {
  from?: string;
  to?: string;
  fulfillmentMethod?: "all" | "pickup" | "delivery";
  includeDetails?: boolean | string;
  comparePrevious?: boolean | string;
}

export interface SubscriptionPaymentRange {
  from: string;
  to: string;
  days: number;
  labelAr?: string | null;
}

export interface SubscriptionPaymentRangeMetricComparison {
  currentHalala?: number | null;
  previousHalala?: number | null;
  deltaHalala?: number | null;
  deltaFormattedAr?: string | null;
  changePercent?: number | null;
  trend?: "positive" | "negative" | "flat" | string | null;
}

export interface SubscriptionPaymentRangeCountComparison {
  current?: number | null;
  previous?: number | null;
  delta?: number | null;
}

export interface SubscriptionPaymentRangeComparison {
  enabled?: boolean | null;
  labelAr?: string | null;
  previousPeriod?: SubscriptionPaymentRange | null;
  grossCollection?: SubscriptionPaymentRangeMetricComparison | null;
  refunds?: SubscriptionPaymentRangeMetricComparison | null;
  netCollection?: SubscriptionPaymentRangeMetricComparison | null;
  averageDailyNet?: SubscriptionPaymentRangeMetricComparison | null;
  paymentsCount?: SubscriptionPaymentRangeCountComparison | null;
  customersCount?: SubscriptionPaymentRangeCountComparison | null;
}

export interface SubscriptionPaymentRangeStatistics
  extends SubscriptionPaymentMonthlyStatistics {
  totalDays?: number | null;
  daysWithActivity?: number | null;
  daysWithoutActivity?: number | null;
  averageActiveDayHalala?: number | null;
  averageActiveDayFormattedAr?: string | null;
  highestDay?: SubscriptionPaymentDailyBreakdownItem | null;
  lowestDay?: SubscriptionPaymentDailyBreakdownItem | null;
}

interface SubscriptionPaymentRangeFields {
  range: SubscriptionPaymentRange;
  comparison?: SubscriptionPaymentRangeComparison | null;
  statistics?: SubscriptionPaymentRangeStatistics | null;
  bySourceChannel?: SubscriptionPaymentBucket[] | null;
  byPaymentProvider?: SubscriptionPaymentBucket[] | null;
}

export interface SubscriptionPaymentRangeApiReportData
  extends Omit<SubscriptionPaymentMonthlyReportData, "reportType" | "statistics">,
    SubscriptionPaymentRangeFields {
  reportType: "range";
}

export interface SubscriptionPaymentRangeReportData
  extends Omit<SubscriptionPaymentMonthlyReportData, "statistics">,
    SubscriptionPaymentRangeFields {
  reportType: "monthly";
  sourceReportType: "range";
}

export type SubscriptionPaymentRangeReportResponse =
  DashboardStatusResponse<SubscriptionPaymentRangeReportData>;
