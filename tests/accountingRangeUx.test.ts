import assert from "node:assert/strict";
import { test } from "vitest";

import {
  MAX_ACCOUNTING_RANGE_DAYS,
  accountingRangeDays,
  adaptRangeReportForDisplay,
  resolveAccountingRangePreset,
  validateAccountingRange,
} from "../src/features/accounting/accountingRange";
import type { SubscriptionPaymentRangeReportData } from "../src/features/accounting/accountingRangeTypes";

test("accounting range presets and validation", () => {
  const today = "2026-07-30";
  assert.deepEqual(resolveAccountingRangePreset("today", today), {
    from: "2026-07-30",
    to: "2026-07-30",
  });
  assert.deepEqual(resolveAccountingRangePreset("last7", today), {
    from: "2026-07-24",
    to: "2026-07-30",
  });
  assert.deepEqual(resolveAccountingRangePreset("last30", today), {
    from: "2026-07-01",
    to: "2026-07-30",
  });
  assert.deepEqual(resolveAccountingRangePreset("thisMonth", today), {
    from: "2026-07-01",
    to: "2026-07-30",
  });
  assert.deepEqual(resolveAccountingRangePreset("previousMonth", today), {
    from: "2026-06-01",
    to: "2026-06-30",
  });
  assert.equal(accountingRangeDays("2026-07-24", "2026-07-30"), 7);
  assert.equal(validateAccountingRange({ from: "2026-07-30", to: "2026-07-01" }), "تاريخ البداية يجب أن يسبق تاريخ النهاية.");
  assert.match(
    validateAccountingRange({ from: "2025-01-01", to: "2026-07-30" }) ?? "",
    new RegExp(String(MAX_ACCOUNTING_RANGE_DAYS))
  );
});

test("range reports adapt to the existing monthly presentation contract", () => {
  const report: SubscriptionPaymentRangeReportData = {
    reportType: "range",
    range: {
      from: "2026-07-01",
      to: "2026-07-30",
      days: 30,
      labelAr: "من 1 يوليو إلى 30 يوليو",
    },
    currency: "SAR",
    statistics: {
      totalDays: 30,
      daysWithActivity: 14,
      averageDailyHalala: 45458,
      averageDailyFormattedAr: "454.58 ر.س.",
    },
    summary: {
      grossCollectionHalala: 1363725,
      refundsHalala: 0,
      netCollectionHalala: 1363725,
    },
    dailyBreakdown: [],
    items: [],
  };

  const adapted = adaptRangeReportForDisplay(report);
  assert.equal(adapted.reportType, "monthly");
  assert.equal(adapted.businessMonth, "2026-07-01-to-2026-07-30");
  assert.equal(adapted.businessMonthLabelAr, "من 1 يوليو إلى 30 يوليو");
  assert.equal(adapted.statistics?.daysWithPayments, 14);
  assert.equal(adapted.statistics?.averageDailyHalala, 45458);
});
