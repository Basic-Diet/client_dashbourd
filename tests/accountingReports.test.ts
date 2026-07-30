import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildSubscriptionPaymentsCsv,
  subscriptionPaymentsCsvFileName,
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

test("accounting subscription report formatters and csv", () => {
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
    currency: "SAR",
    summary: {
      grossCollectionHalala: 11500,
      refundsHalala: 3000,
      netCollectionHalala: 8500,
      salesVatHalala: 1500,
      refundVatHalala: 391,
      netVatHalala: 1109,
      netBeforeVatHalala: 7391,
      refundsTrackingStatus: "available",
    },
    dashboardCards: [
      {
        key: "total",
        titleAr: "إجمالي التحصيل",
        amountFormattedAr: "١١٥٫٠٠ ر.س",
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
        paymentProvider: "moyasar",
        statusLabelAr: "مدفوع",
        amountFormattedAr: "١١٥٫٠٠ ر.س",
        amountHalala: 11500,
        grossCollectionHalala: 11500,
        refundsHalala: 0,
        netMovementHalala: 11500,
        netBeforeVatFormattedAr: "١٠٠٫٠٠ ر.س",
        vatFormattedAr: "١٥٫٠٠ ر.س",
        vatPercentage: 15,
        fulfillmentMethod: "pickup",
        fulfillmentMethodLabelAr: "استلام من الفرع",
        subscriptionStatusLabelAr: "نشط",
        businessDateLabelAr: "٢٥ يوليو ٢٠٢٦",
        paidAtLabelAr: "٢٥ يوليو ٢٠٢٦، ٠٢:٠٠ م",
        gatewayUsed: false,
        gatewayUsedLabelAr: "لا",
        recordingModeLabelAr: "تلقائي",
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

  const csv = buildSubscriptionPaymentsCsv(report);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("مرجع الدفعة"));
  assert.ok(csv.includes("PAY-1"));
  assert.ok(csv.includes("REF-1"));
  assert.ok(csv.includes("مرتجع"));
  assert.ok(csv.includes("التطبيق"));
  assert.ok(csv.includes("ميسر"));
  assert.ok(csv.includes("صافي الحركة"));
  assert.ok(csv.includes("اشتراك ملغي"));
  assert.equal(csv.includes("[object Object]"), false);
  assert.equal(subscriptionPaymentsCsvFileName(report), "تقرير-تحصيل-الاشتراكات-2026-07-25.csv");
});
