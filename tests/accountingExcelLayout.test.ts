import assert from "node:assert/strict";
import { test } from "vitest";

import {
  buildSubscriptionPaymentsExcel,
  subscriptionPaymentsExcelFileName,
} from "../src/features/accounting/accountingCsv";
import type { SubscriptionPaymentDailyReportData } from "../src/features/accounting/accountingTypes";

test("accounting Excel layout stays readable and separates technical details", () => {
  const longReference = "123456789012345678901234567890";
  const report = {
    reportType: "daily",
    businessDate: "2026-08-05",
    businessDateLabelAr: "٥ أغسطس ٢٠٢٦",
    titleAr: "تقرير تحصيل الاشتراكات اليومي",
    currency: "SAR",
    generatedAt: "2026-08-05T00:00:00.000Z",
    generatedAtLabelAr: "٥ أغسطس ٢٠٢٦، ٠٣:٠٠ ص",
    summary: {
      totalPaymentsCount: 1,
      uniqueCustomersCount: 1,
      grossCollectionHalala: 11500,
      refundsHalala: 0,
      netCollectionHalala: 11500,
      netBeforeVatHalala: 10000,
      netVatHalala: 1500,
      cashTotalHalala: 0,
      cardTotalHalala: 11500,
      moyasarTotalHalala: 11500,
      unknownTotalHalala: 0,
      reviewItemsCount: 1,
    },
    reconciliation: {
      status: "balanced",
      statusLabelAr: "متوازن",
      differenceHalala: 0,
      noteAr: "التقرير متوازن.",
    },
    byPaymentMethod: [
      {
        key: "card",
        labelAr: "بطاقة",
        count: 1,
        uniqueCustomersCount: 1,
        totalHalala: 11500,
      },
    ],
    bySourceChannel: [
      {
        key: "app",
        labelAr: "التطبيق",
        count: 1,
        uniqueCustomersCount: 1,
        totalHalala: 11500,
      },
    ],
    byPaymentProvider: [
      {
        key: "moyasar",
        labelAr: "ميسر",
        count: 1,
        uniqueCustomersCount: 1,
        totalHalala: 11500,
      },
    ],
    warnings: [],
    items: [
      {
        paymentReference: longReference,
        paymentId: "PAY-1",
        movementType: "collection",
        movementTypeLabelAr: "تحصيل",
        subscriptionId: "SUB-1",
        customerName: "عميل تجريبي",
        customerPhone: "+966500000000",
        planNameAr: "باقة شهرية طويلة الاسم",
        paymentType: "subscription_activation",
        paymentTypeLabelAr: "اشتراك جديد",
        paymentMethod: "card",
        paymentMethodLabelAr: "بطاقة",
        sourceChannel: "app",
        sourceChannelLabelAr: "التطبيق",
        paymentProvider: "moyasar",
        paymentProviderLabelAr: "ميسر",
        providerPaymentId: "MOYASAR-PAYMENT-REFERENCE-1",
        amountHalala: 11500,
        netBeforeVatHalala: 10000,
        vatHalala: 1500,
        netMovementHalala: 11500,
        fulfillmentMethod: "delivery",
        fulfillmentMethodLabelAr: "توصيل",
        status: "paid",
        statusLabelAr: "مدفوع",
        subscriptionStatus: "active",
        subscriptionStatusLabelAr: "نشط",
        businessDate: "2026-08-05",
        businessDateLabelAr: "٥ أغسطس ٢٠٢٦",
        paidAt: "2026-08-05T00:00:00.000Z",
        paidAtLabelAr: "٥ أغسطس ٢٠٢٦، ٠٣:٠٠ ص",
        countedInTotals: true,
        needsReview: true,
        reviewReasonsAr: ["سبب مراجعة طويل يجب أن يظهر في شيت التفاصيل فقط"],
      },
    ],
  } as unknown as SubscriptionPaymentDailyReportData;

  const excel = buildSubscriptionPaymentsExcel(report);
  const compactSheet = excel
    .split('Worksheet ss:Name="المدفوعات"')[1]
    .split("</Worksheet>")[0];
  const technicalSheet = excel
    .split('Worksheet ss:Name="تفاصيل الدفع"')[1]
    .split("</Worksheet>")[0];

  assert.ok(excel.includes('Worksheet ss:Name="الملخص"'));
  assert.ok(excel.includes('Worksheet ss:Name="المدفوعات"'));
  assert.ok(excel.includes('Worksheet ss:Name="تفاصيل الدفع"'));
  assert.ok(excel.includes('Worksheet ss:Name="التصنيفات"'));
  assert.ok(excel.includes('Worksheet ss:Name="التحذيرات"'));

  assert.ok(excel.includes('ss:MergeAcross="7"'));
  assert.ok(excel.includes('ss:AutoFitHeight="0"'));
  assert.ok(excel.includes("<DoNotDisplayGridlines/>"));
  assert.ok(compactSheet.includes("<SplitVertical>4</SplitVertical>"));
  assert.ok(compactSheet.includes("<AutoFilter"));
  assert.ok(technicalSheet.includes("<SplitVertical>2</SplitVertical>"));

  assert.ok(compactSheet.includes("…678901234567890"));
  assert.equal(compactSheet.includes(longReference), false);
  assert.ok(technicalSheet.includes(longReference));
  assert.equal(compactSheet.includes("أسباب المراجعة"), false);
  assert.ok(technicalSheet.includes("أسباب المراجعة"));
  assert.ok(technicalSheet.includes("سبب مراجعة طويل"));

  assert.equal(excel.includes('ss:Width="280"'), false);
  assert.equal(excel.includes('ss:Width="450"'), false);
  assert.equal(excel.includes("[object Object]"), false);
  assert.equal(
    subscriptionPaymentsExcelFileName(report),
    "تقرير-تحصيل-الاشتراكات-2026-08-05.xls"
  );
});
