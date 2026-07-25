import type { JsonObject } from "@/types/dashboardAdminTypes";

export type ReportRecord = Record<string, unknown>;

export const asRecord = (value: unknown): ReportRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ReportRecord)
    : {};

export const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export const formatInteger = (value: unknown) => {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("ar-SA").format(Number.isFinite(number) ? number : 0);
};

export const formatBooleanAr = (value: boolean | null | undefined) =>
  value === true ? "نعم" : value === false ? "لا" : "-";

export const formatDateTimeAr = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatSarFromHalala = (
  halala: number | null | undefined,
  currency = "SAR"
) => {
  if (halala === null || halala === undefined) return "-";
  const amount = Number(halala);
  if (!Number.isFinite(amount)) return "-";
  try {
    return new Intl.NumberFormat("ar-AE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
};

export const formatMoney = (
  formattedAr: string | null | undefined,
  halala: number | null | undefined,
  currency = "SAR"
) => {
  if (formattedAr?.trim()) return formattedAr.trim();
  return formatSarFromHalala(halala, currency);
};

export const textOrDash = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "-";
};

export const formatDisplayValue = (value: unknown, currency = "SAR"): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return formatBooleanAr(value);
  if (typeof value === "number") return formatInteger(value);
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const formatted = textOrDash(
    record.labelAr,
    record.titleAr,
    record.nameAr,
    record.name,
    record.email,
    record.phone,
    record.valueAr,
    record.amountFormattedAr
  );
  if (formatted !== "-") return formatted;
  if (typeof record.amountHalala === "number") {
    return formatSarFromHalala(record.amountHalala, currency);
  }
  return "-";
};

export const paymentMethodLabel = (
  value: string | null | undefined,
  labelAr?: string | null
) => {
  if (labelAr?.trim()) return labelAr.trim();
  if (value === "visa") return "فيزا";
  if (value === "cash") return "نقدي";
  if (value === "unknown") return "غير مصنف";
  return value?.trim() || "-";
};

export const fulfillmentMethodLabel = (
  value: string | null | undefined,
  labelAr?: string | null
) => {
  if (labelAr?.trim()) return labelAr.trim();
  if (value === "delivery") return "توصيل";
  if (value === "pickup") return "استلام من الفرع";
  if (value === "all") return "الكل";
  return value?.trim() || "-";
};

export const reportErrorMessage = (error: unknown) => {
  const record = asRecord(error);
  const response = asRecord(record.response);
  const data = asRecord(response.data);
  const nestedError = asRecord(data.error);
  return textOrDash(
    data.messageAr,
    nestedError.messageAr,
    data.message,
    record.message,
    "تعذر تحميل التقرير المحاسبي."
  );
};

export const legacyFieldLabels: Record<string, string> = {
  businessDate: "تاريخ العمل",
  generatedAt: "وقت إنشاء التقرير",
  ordersCount: "عدد الطلبات",
  subscriptionsCount: "عدد الاشتراكات",
  grossRevenueHalala: "إجمالي الإيرادات",
  netRevenueHalala: "صافي الإيرادات",
  vatHalala: "ضريبة القيمة المضافة",
  manualDeductions: "الخصومات اليدوية",
  reconciliation: "التسوية",
  totalHalala: "الإجمالي",
  total: "الإجمالي",
  count: "العدد",
  status: "الحالة",
  amountHalala: "المبلغ",
  reason: "السبب",
  reference: "المرجع",
  paymentMethod: "طريقة الدفع",
  fulfillmentMethod: "طريقة التنفيذ",
  source: "المصدر",
  customerName: "اسم العميل",
  customerPhone: "رقم الهاتف",
  createdAt: "تاريخ الإنشاء",
};

export const legacySectionLabels: Record<string, string> = {
  summary: "الملخص",
  money: "القيم المالية",
  reconciliation: "التسوية",
  oneTimeOrders: "الطلبات الفردية",
  subscriptions: "الاشتراكات",
  warnings: "التحذيرات",
};

export const legacyLabelFor = (key: string) => legacyFieldLabels[key] ?? null;

export const isPlainJsonObject = (value: unknown): value is JsonObject =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
