import type {
  SubscriptionPaymentReportData,
  SubscriptionPaymentReportItem,
} from "@/features/accounting/accountingTypes";
import {
  formatBooleanAr,
  formatMoney,
  fulfillmentMethodLabel,
  paymentMethodLabel,
  textOrDash,
} from "@/features/accounting/accountingFormatters";

const CSV_HEADERS = [
  "مرجع الدفعة",
  "رقم الاشتراك",
  "اسم العميل",
  "رقم الهاتف",
  "اسم الخطة",
  "نوع الدفعة",
  "طريقة الدفع",
  "مزود الدفع",
  "الحالة",
  "الإجمالي",
  "الصافي قبل الضريبة",
  "ضريبة القيمة المضافة",
  "نسبة الضريبة",
  "طريقة التنفيذ",
  "حالة الاشتراك",
  "تاريخ العمل",
  "تاريخ الدفع",
  "بوابة الدفع مستخدمة",
  "طريقة التسجيل",
  "تحتاج مراجعة",
  "أسباب المراجعة",
] as const;

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

const csvCell = (value: string | number | boolean | null | undefined) =>
  csvEscape(String(value ?? ""));

const itemToCsvRow = (
  item: SubscriptionPaymentReportItem,
  currency: string
) => [
  textOrDash(item.paymentReference, item.paymentId),
  textOrDash(item.subscriptionId),
  textOrDash(item.customerName),
  textOrDash(item.customerPhone),
  textOrDash(item.planNameAr),
  textOrDash(item.paymentTypeLabelAr, item.paymentType),
  paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr),
  textOrDash(item.providerLabelAr, item.provider),
  textOrDash(item.statusLabelAr, item.status),
  formatMoney(item.amountFormattedAr, item.amountHalala, currency),
  formatMoney(
    item.netBeforeVatFormattedAr,
    item.netBeforeVatHalala,
    currency
  ),
  formatMoney(item.vatFormattedAr, item.vatHalala, currency),
  item.vatPercentage ?? "",
  fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr),
  textOrDash(item.subscriptionStatusLabelAr, item.subscriptionStatus),
  textOrDash(item.businessDateLabelAr, item.businessDate),
  textOrDash(item.paidAtLabelAr, item.paidAt),
  textOrDash(item.gatewayUsedLabelAr, formatBooleanAr(item.gatewayUsed)),
  textOrDash(item.recordingModeLabelAr, item.recordingMode),
  formatBooleanAr(item.needsReview),
  item.reviewReasonsAr?.join("، ") ?? "",
];

export const buildSubscriptionPaymentsCsv = (
  report: SubscriptionPaymentReportData,
  visibleItems: SubscriptionPaymentReportItem[] = report.items ?? []
) => {
  const currency = report.currency ?? "SAR";
  const rows = [
    CSV_HEADERS.map(csvCell).join(","),
    ...visibleItems.map((item) =>
      itemToCsvRow(item, currency).map(csvCell).join(",")
    ),
  ];
  return `\ufeff${rows.join("\r\n")}`;
};

export const subscriptionPaymentsCsvFileName = (
  report: SubscriptionPaymentReportData
) => {
  const period =
    report.reportType === "monthly"
      ? report.businessMonth
      : report.businessDate;
  return `تقرير-تحصيل-الاشتراكات-${period || "الحالي"}.csv`;
};

export const downloadTextFile = (
  contents: string,
  fileName: string,
  mimeType = "text/csv;charset=utf-8"
) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};
