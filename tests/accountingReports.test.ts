import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildSubscriptionPaymentsExcel,
  subscriptionPaymentsExcelFileName,
} from "../src/features/accounting/accountingCsv";
import type { SubscriptionPaymentDailyReportData } from "../src/features/accounting/accountingTypes";
import {
  formatDisplayValue,
  formatMoney,
  formatSarFromHalala,
  paymentMethodLabel,
  paymentProviderLabel,
  sourceChannelLabel,
} from "../src/features/accounting/accountingFormatters";

test("accounting subscription report formatters and Excel workbook", () => {
  assert.equal(formatMoney("١١٥٫٠٠ ر.س", 11500), "١١٥٫٠٠ ر.س");
  assert.match(formatSarFromHalala(11500), /115\.00|١١٥٫٠٠/);
  assert.equal(formatMoney(undefined, null), "-");
  assert.equal(formatDisplayValue({ valueFormattedAr: "٨٥٫٠٠ ر.س" }), "٨٥٫٠٠ ر.س");
  assert.equal(formatDisplayValue({ amountFormattedAr: "١١٥٫٠٠ ر.س" }), "١١٥٫٠٠ ر.س");
  assert.equal(paymentMethodLabel("card"), "بطاقة");
  assert.equal(paymentMethodLabel("visa"), "بطاقة");
  assert.equal(sourceChannelLabel("app"), "التطبيق");
  assert.equal(sourceChannelLabel("dashboard"), "لوحة التحكم");
  assert.equal(paymentProviderLabel("moyasar"), "ميسر");
  assert.equal(paymentProviderLabel("manual_gateway"), "بوابة مسجلة يدويًا");

  const report: SubscriptionPaymentDailyReportData = {
    reportType: "daily",
    businessDate: "2026-07-25",
    businessDateLabelAr: "٢٥ يوليو ٢٠٢٦",
    titleAr: "تقرير تحصيل الاشتراكات اليومي",
    currency: "SAR",
    generatedAt: "2026-07-25T12:00:00.000Z",
    summary: {
      totalPaymentsCount: 1,
      uniqueCustomersCount: 1,
      grossCollectionHalala: 11500,
      refundsHalala: 3000,
      refundsCount: 1,
      netCollectionHalala: 8500,
      salesVatHalala: 1500,
      refundVatHalala: 391,
      netVatHalala: 1109,
      netBeforeVatHalala: 7391,
      refundsTrackingStatus: "available",
      cashTotalHalala: 0,
      cardTotalHalala: 11500,
      moyasarTotalHalala: 11500,
      unknownTotalHalala: 0,
    } as SubscriptionPaymentDailyReportData["summary"] & {
      moyasarTotalHalala: number;
    },
    reconciliation: {
      status: "balanced",
      statusLabelAr: "متوازن",
      differenceHalala: 0,
      noteAr: "ميسر ضمن تحصيل البطاقات ولا يُجمع مرتين.",
    },
    dashboardCards: [
      {
        key: "total",
        titleAr: "إجمالي تحصيل الاشتراكات",
        amountFormattedAr: "١١٥٫٠٠ ر.س",
      },
    ],
    byPaymentMethod: [
      { key: "card", labelAr: "بطاقة / بوابة إلكترونية", count: 1, totalHalala: 11500 },
    ],
    bySourceChannel: [
      { key: "app", labelAr: "التطبيق", count: 1, totalHalala: 11500 },
    ],
    byPaymentProvider: [
      { key: "moyasar", labelAr: "ميسر", count: 1, totalHalala: 11500 },
    ],
    warnings: [
      {
        code: "TEST_WARNING",
        messageAr: "حركة تحتاج مراجعة",
        severity: "warning",
      },
    ],
    items: [
      {
        paymentReference: "PAY-1",
        movementId: "collection:PAY-1",
        movementType: "collection",
        movementTypeLabelAr: "تحصيل",
        subscriptionId: "SUB-1",
        customerName: "عميل",
        customerPhone: "0500000000",
        planNameAr: "باقة شهرية",
        paymentTypeLabelAr: "اشتراك جديد",
        paymentMethod: "card",
        paymentMethodLabelAr: "بطاقة",
        sourceChannel: "app",
        sourceChannelLabelAr: "التطبيق",
        paymentProvider: "moyasar",
        paymentProviderLabelAr: "ميسر",
        providerPaymentId: "MOYASAR-PAY-1",
        statusLabelAr: "مدفوع",
        amountFormattedAr: "١١٥٫٠٠ ر.س",
        amountHalala: 11500,
        grossCollectionHalala: 11500,
        refundsHalala: 0,
        netMovementHalala: 11500,
        netBeforeVatHalala: 10000,
        netBeforeVatFormattedAr: "١٠٠٫٠٠ ر.س",
        vatHalala: 1500,
        vatFormattedAr: "١٥٫٠٠ ر.س",
        vatPercentage: 15,
        fulfillmentMethod: "pickup",
        fulfillmentMethodLabelAr: "استلام من الفرع",
        subscriptionStatusLabelAr: "نشط",
        businessDateLabelAr: "٢٥ يوليو ٢٠٢٦",
        paidAtLabelAr: "٢٥ يوليو ٢٠٢٦، ٠٢:٠٠ م",
        gatewayUsed: true,
        gatewayUsedLabelAr: "نعم",
        recordingModeLabelAr: "تحصيل إلكتروني عبر ميسر",
        needsReview: true,
        reviewReasonsAr: ["اشتراك ملغي"],
      },
      {
        movementId: "refund:REF-1",
        movementType: "refund",
        movementTypeLabelAr: "مرتجع",
        paymentReference: "PAY-1",
        subscriptionId: "SUB-1",
        customerName: "عميل",
        paymentMethod: "card",
        sourceChannel: "app",
        paymentProvider: "moyasar",
        status: "confirmed",
        amountHalala: 3000,
        amountFormattedAr: "٣٠٫٠٠ ر.س",
        netBeforeVatHalala: -2609,
        vatHalala: 391,
        refundVatHalala: 391,
        netMovementHalala: -3000,
        refundedAt: "2026-07-25T10:00:00.000Z",
        providerRefundId: "REF-1",
        countedInTotals: true,
        needsReview: false,
      },
    ],
  };

  assert.equal(
    report.summary!.grossCollectionHalala! - report.summary!.refundsHalala!,
    report.summary!.netCollectionHalala
  );
  assert.equal(
    report.summary!.netBeforeVatHalala! + report.summary!.netVatHalala!,
    report.summary!.netCollectionHalala
  );
  assert.equal(
    report.summary!.salesVatHalala! - report.summary!.refundVatHalala!,
    report.summary!.netVatHalala
  );

  const excel = buildSubscriptionPaymentsExcel(report);
  assert.ok(excel.startsWith('<?xml version="1.0"'));
  assert.ok(excel.includes("Excel.Sheet"));
  assert.ok(excel.includes('Worksheet ss:Name="الملخص"'));
  assert.ok(excel.includes('Worksheet ss:Name="المدفوعات"'));
  assert.ok(excel.includes('Worksheet ss:Name="التصنيفات"'));
  assert.ok(excel.includes('Worksheet ss:Name="التحذيرات"'));
  assert.ok(excel.includes("DisplayRightToLeft"));
  assert.ok(excel.includes('ss:StyleID="Money"'));
  assert.ok(excel.includes("مرجع الدفعة"));
  assert.ok(excel.includes("PAY-1"));
  assert.ok(excel.includes("MOYASAR-PAY-1"));
  assert.ok(excel.includes("REF-1"));
  assert.ok(excel.includes("مرتجع"));
  assert.ok(excel.includes("التطبيق"));
  assert.ok(excel.includes("ميسر"));
  assert.ok(excel.includes("صافي الحركة"));
  assert.ok(excel.includes("اشتراك ملغي"));
  assert.equal(excel.includes("[object Object]"), false);
  assert.equal(
    subscriptionPaymentsExcelFileName(report),
    "تقرير-تحصيل-الاشتراكات-2026-07-25.xls"
  );
});
