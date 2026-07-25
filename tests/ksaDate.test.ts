import assert from "node:assert/strict";
import { getCurrentKSAMonth, getTodayKSADate } from "../src/utils/ksaDate";
import {
  resolveAccountingDailyReportParams,
  resolveSubscriptionPaymentDailyParams,
  resolveSubscriptionPaymentMonthlyParams,
} from "../src/utils/fetchDashboardSupportData";
import { test } from "vitest";

test("ksaDate.test", () => {
  assert.match(getTodayKSADate(new Date("2026-05-26T12:00:00Z")), /^\d{4}-\d{2}-\d{2}$/);

  const resolved = resolveAccountingDailyReportParams({ includeDetails: true });
  assert.match(resolved.date!, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(resolved.includeDetails, true);

  const withDate = resolveAccountingDailyReportParams({ date: "2026-05-15" });
  assert.equal(withDate.date, "2026-05-15");

  assert.equal(getCurrentKSAMonth(new Date("2026-05-26T12:00:00Z")), "2026-05");

  const daily = resolveSubscriptionPaymentDailyParams({});
  assert.match(daily.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(daily.fulfillmentMethod, "all");
  assert.equal(daily.includeDetails, true);

  const monthly = resolveSubscriptionPaymentMonthlyParams({});
  assert.match(monthly.month, /^\d{4}-\d{2}$/);
  assert.equal(monthly.fulfillmentMethod, "all");
  assert.equal(monthly.includeDetails, true);

  console.log("ksaDate.test.ts passed");
});
