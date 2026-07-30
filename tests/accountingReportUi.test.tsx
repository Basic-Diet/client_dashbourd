// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { SubscriptionPaymentsReport } from "../src/features/accounting/components/SubscriptionPaymentsReport";
import type { SubscriptionPaymentDailyReportData } from "../src/features/accounting/accountingTypes";

const baseReport: SubscriptionPaymentDailyReportData = {
  reportType: "daily",
  titleAr: "تحصيل الاشتراكات",
  businessDate: "2026-08-01",
  currency: "SAR",
  summary: {
    totalPaymentsCount: 1,
    uniqueCustomersCount: 1,
    grossCollectionHalala: 11500,
    refundsHalala: 0,
    refundsCount: 0,
    netCollectionHalala: 11500,
    netBeforeVatHalala: 10000,
    salesVatHalala: 1500,
    refundVatHalala: 0,
    netVatHalala: 1500,
    cashCount: 1,
    cashTotalHalala: 11500,
    cardCount: 0,
    cardTotalHalala: 0,
    unknownCount: 0,
    unknownTotalHalala: 0,
  },
  reconciliation: {
    status: "balanced",
    statusLabelAr: "متوازن",
    isBalanced: true,
    differenceHalala: 0,
  },
  items: [
    {
      movementId: "collection:legacy-payment",
      movementType: "collection",
      customerName: "عميل قديم",
      customerPhone: "0500000000",
      subscriptionId: "legacy-subscription",
      paymentMethod: "cash",
      sourceChannel: "dashboard",
      paymentProvider: "none",
      amountHalala: 11500,
      netMovementHalala: 11500,
      vatHalala: 1500,
      countedInTotals: true,
      needsReview: false,
    },
  ],
};

test("accounting report renders RTL fallback cards and legacy customer rows", () => {
  const { container } = render(
    <SubscriptionPaymentsReport
      report={baseReport}
      isLoading={false}
      isError={false}
      error={null}
      onRetry={() => undefined}
      isFetching={false}
    />
  );

  expect(container.querySelector("section[dir='rtl']")).not.toBeNull();
  expect(screen.getAllByText("إجمالي التحصيل").length).toBeGreaterThan(0);
  expect(screen.getAllByText("صافي الحركة").length).toBeGreaterThan(0);
  expect(screen.getByText("عميل قديم")).toBeInTheDocument();
  expect(screen.getByText("لوحة التحكم")).toBeInTheDocument();
  expect(screen.getByText("بدون مزود")).toBeInTheDocument();
});

test("accounting report renders empty summary cards without crashing", () => {
  render(
    <SubscriptionPaymentsReport
      report={{
        ...baseReport,
        summary: null,
        items: [],
        dashboardCards: [],
      }}
      isLoading={false}
      isError={false}
      error={null}
      onRetry={() => undefined}
      isFetching={false}
    />
  );

  expect(screen.getByText("لا توجد مدفوعات اشتراكات مطابقة للفترة والفلاتر المحددة.")).toBeInTheDocument();
  expect(screen.getAllByText("-").length).toBeGreaterThan(0);
});
