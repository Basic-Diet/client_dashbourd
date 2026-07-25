import assert from "node:assert/strict";
import {
  accountingDailyReportExportUrl,
  accountingDailyReportUrl,
  dashboardHealthUrl,
  dashboardLogsUrl,
  dashboardNotificationsSummaryUrl,
  dashboardReportsTodayUrl,
  dashboardSearchUrl,
  dashboardStaffResetPasswordUrl,
  dashboardStaffUserUrl,
  dashboardStaffUsersUrl,
  notificationLogsUrl,
  subscriptionPaymentDailyReportUrl,
  subscriptionPaymentMonthlyReportUrl,
  subscriptionTermsUrl,
} from "../src/utils/dashboardApiContract";
import {
  promoCodeToggleUrl,
  promoCodeValidateUrl,
} from "../src/utils/promoCodeApiContract";
import { deliveryZoneToggleUrl } from "../src/utils/deliveryZoneApiContract";
import { settingEndpointUrl } from "../src/utils/settingsApiContract";
import { test } from "vitest";

test("dashboardContractUrls.test", () => {
  assert.equal(dashboardSearchUrl("phone"), "/api/dashboard/search?q=phone");
  assert.equal(
    dashboardNotificationsSummaryUrl(),
    "/api/dashboard/notifications/summary"
  );
  assert.equal(dashboardReportsTodayUrl(), "/api/dashboard/reports/today");
  assert.equal(
    accountingDailyReportUrl({
      date: "2026-05-25",
      fulfillmentMethod: "pickup",
      includeDetails: true,
    }),
    "/api/dashboard/accounting/daily-report?date=2026-05-25&fulfillmentMethod=pickup&includeDetails=true"
  );
  assert.equal(
    accountingDailyReportExportUrl({ date: "2026-05-25" }),
    "/api/dashboard/accounting/daily-report/export?format=csv&date=2026-05-25"
  );
  assert.equal(
    subscriptionPaymentDailyReportUrl({
      date: "2026-07-25",
      fulfillmentMethod: "delivery",
      includeDetails: true,
    }),
    "/api/dashboard/accounting/subscription-payments/daily?date=2026-07-25&fulfillmentMethod=delivery&includeDetails=true"
  );
  assert.equal(
    subscriptionPaymentMonthlyReportUrl({
      month: "2026-07",
      fulfillmentMethod: "pickup",
      includeDetails: false,
    }),
    "/api/dashboard/accounting/subscription-payments/monthly?month=2026-07&fulfillmentMethod=pickup&includeDetails=false"
  );
  assert.equal(
    settingEndpointUrl("custom-meal-base-price"),
    "/api/dashboard/settings/custom-meal-base-price"
  );
  assert.equal(dashboardStaffUsersUrl(), "/api/dashboard/staff-users");
  assert.equal(
    dashboardStaffUsersUrl({
      page: 2,
      limit: 10,
      q: "manager",
      role: "superadmin",
      status: "active",
    }),
    "/api/dashboard/staff-users?page=2&limit=10&q=manager&role=superadmin&status=active"
  );
  assert.equal(
    dashboardStaffUserUrl("staff-1"),
    "/api/dashboard/staff-users/staff-1"
  );
  assert.equal(
    dashboardStaffResetPasswordUrl("staff-1"),
    "/api/dashboard/staff-users/staff-1/reset-password"
  );
  assert.equal(
    promoCodeValidateUrl(),
    "/api/dashboard/promo-codes/validate"
  );
  assert.equal(
    promoCodeToggleUrl("promo-1"),
    "/api/dashboard/promo-codes/promo-1/toggle"
  );
  assert.equal(
    deliveryZoneToggleUrl("zone-1"),
    "/api/dashboard/zones/zone-1/toggle"
  );
  assert.equal(
    subscriptionTermsUrl("ar"),
    "/api/dashboard/content/terms/subscription?locale=ar"
  );
  assert.equal(
    dashboardLogsUrl({ entityType: "order", page: 2 }),
    "/api/dashboard/logs?entityType=order&page=2"
  );
  assert.equal(
    notificationLogsUrl({ userId: "user-1" }),
    "/api/dashboard/notification-logs?userId=user-1"
  );
  assert.equal(
    dashboardHealthUrl("subscription-menu"),
    "/api/dashboard/health/subscription-menu"
  );
});
