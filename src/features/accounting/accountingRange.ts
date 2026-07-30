import type { SubscriptionPaymentMonthlyReportData } from "@/features/accounting/accountingTypes";
import type {
  SubscriptionPaymentRangeReportData,
} from "@/features/accounting/accountingRangeTypes";

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_ACCOUNTING_RANGE_DAYS = 366;

export type AccountingRangePresetId =
  | "today"
  | "last7"
  | "last30"
  | "thisMonth"
  | "previousMonth"
  | "last90";

export interface AccountingDateRange {
  from: string;
  to: string;
}

export interface AccountingRangePreset {
  id: AccountingRangePresetId;
  label: string;
  description: string;
}

export const ACCOUNTING_RANGE_PRESETS: AccountingRangePreset[] = [
  { id: "today", label: "اليوم", description: "اليوم المالي الحالي" },
  { id: "last7", label: "آخر 7 أيام", description: "يشمل اليوم" },
  { id: "last30", label: "آخر 30 يوم", description: "يشمل اليوم" },
  { id: "thisMonth", label: "الشهر الحالي", description: "من أول الشهر حتى اليوم" },
  { id: "previousMonth", label: "الشهر السابق", description: "الشهر الميلادي السابق كاملًا" },
  { id: "last90", label: "آخر 90 يوم", description: "تحليل ربع سنوي مرن" },
];

function parseDate(date: string): Date {
  const normalized = String(date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("INVALID_DATE");
  }
  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("INVALID_DATE");
  }
  return parsed;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addAccountingDays(date: string, amount: number): string {
  return toDateString(new Date(parseDate(date).getTime() + amount * DAY_MS));
}

export function accountingRangeDays(from: string, to: string): number {
  return Math.floor((parseDate(to).getTime() - parseDate(from).getTime()) / DAY_MS) + 1;
}

export function validateAccountingRange(range: AccountingDateRange): string | null {
  try {
    const days = accountingRangeDays(range.from, range.to);
    if (days <= 0) return "تاريخ البداية يجب أن يسبق تاريخ النهاية.";
    if (days > MAX_ACCOUNTING_RANGE_DAYS) {
      return `الحد الأقصى للنطاق هو ${MAX_ACCOUNTING_RANGE_DAYS} يومًا.`;
    }
    return null;
  } catch {
    return "أدخل تاريخ بداية ونهاية صحيحين.";
  }
}

function firstDayOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function previousMonthRange(today: string): AccountingDateRange {
  const currentMonthStart = parseDate(firstDayOfMonth(today));
  const previousMonthEnd = new Date(currentMonthStart.getTime() - DAY_MS);
  const previousMonthStart = new Date(Date.UTC(
    previousMonthEnd.getUTCFullYear(),
    previousMonthEnd.getUTCMonth(),
    1
  ));
  return {
    from: toDateString(previousMonthStart),
    to: toDateString(previousMonthEnd),
  };
}

export function resolveAccountingRangePreset(
  preset: AccountingRangePresetId,
  today: string
): AccountingDateRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "last7":
      return { from: addAccountingDays(today, -6), to: today };
    case "last30":
      return { from: addAccountingDays(today, -29), to: today };
    case "thisMonth":
      return { from: firstDayOfMonth(today), to: today };
    case "previousMonth":
      return previousMonthRange(today);
    case "last90":
      return { from: addAccountingDays(today, -89), to: today };
  }
}

export function formatAccountingRangeLabel(range: AccountingDateRange): string {
  const formatter = new Intl.DateTimeFormat("ar-AE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `من ${formatter.format(parseDate(range.from))} إلى ${formatter.format(parseDate(range.to))}`;
}

export function adaptRangeReportForDisplay(
  report: SubscriptionPaymentRangeReportData
): SubscriptionPaymentMonthlyReportData {
  return {
    ...report,
    reportType: "monthly",
    businessMonth: `${report.range.from}-to-${report.range.to}`,
    businessMonthLabelAr:
      report.range.labelAr ?? formatAccountingRangeLabel(report.range),
    statistics: {
      ...report.statistics,
      daysWithPayments:
        report.statistics?.daysWithActivity ??
        report.statistics?.daysWithPayments ??
        0,
      averageDailyHalala: report.statistics?.averageDailyHalala ?? 0,
      averageDailyFormattedAr:
        report.statistics?.averageDailyFormattedAr ?? null,
    },
  };
}
