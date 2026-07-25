import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildSubscriptionPaymentsCsv,
  subscriptionPaymentsCsvFileName,
} from "../src/features/accounting/accountingCsv";
import type { SubscriptionPaymentDailyReportData } from "../src/features/accounting/accountingTypes";
import {
  formatMoney,
  formatSarFromHalala,
} from "../src/features/accounting/accountingFormatters";

test("accounting subscription report formatters and csv", () => {
  assert.equal(formatMoney("١١٥٫٠٠ ر.س", 11500), "١١٥٫٠٠ ر.س");
  assert.match(formatSarFromHalala(11500), /115\.00|١١٥٫٠٠/);
  assert.equal(formatMoney(undefined, null), "-");

  const report: SubscriptionPaymentDailyReportData = {
    reportType: "daily",
    businessDate: "2026-07-25",
    currency: "SAR",
    summary: {
      refundsHalala: null,
      refundsTrackingStatus: "not_available",
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
        subscriptionId: "SUB-1",
        customerName: "عميل",
        customerPhone: "0500000000",
        planNameAr: "باقة شهرية",
        paymentTypeLabelAr: "اشتراك جديد",
        paymentMethod: "cash",
        paymentMethodLabelAr: "نقدي",
        providerLabelAr: "النظام",
        statusLabelAr: "مدفوع",
        amountFormattedAr: "١١٥٫٠٠ ر.س",
        amountHalala: 11500,
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
    ],
  };

  const csv = buildSubscriptionPaymentsCsv(report);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("مرجع الدفعة"));
  assert.ok(csv.includes("PAY-1"));
  assert.ok(csv.includes("اشتراك ملغي"));
  assert.equal(csv.includes("[object Object]"), false);
  assert.equal(subscriptionPaymentsCsvFileName(report), "تقرير-تحصيل-الاشتراكات-2026-07-25.csv");
});
