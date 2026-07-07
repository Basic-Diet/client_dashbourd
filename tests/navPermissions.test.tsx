import assert from "node:assert/strict";
import { NavLinksData } from "../src/constants/NavLinksData";
import { filterNavItemsForRole } from "../src/lib/navPermissions";

const navMainUrlsForRole = (role: Parameters<typeof filterNavItemsForRole>[1]) =>
  filterNavItemsForRole(NavLinksData.navMain, role).map((item) => item.url);

const secondaryUrlsForRole = (
  role: Parameters<typeof filterNavItemsForRole>[1]
) => filterNavItemsForRole(NavLinksData.navSecondary, role).map((item) => item.url);

const cashierUrls = filterNavItemsForRole(
  NavLinksData.navMain,
  "cashier"
).map((item) => item.url);

assert.deepEqual(cashierUrls, [
  "/dashboard",
  "/payments",
  "/subscriptions",
  "/users",
]);

assert.equal(cashierUrls.includes("/menu"), false);
assert.equal(cashierUrls.includes("/packages"), false);
assert.equal(cashierUrls.includes("/manual-deduction"), false);

const kitchenUrls = filterNavItemsForRole(
  NavLinksData.navMain,
  "kitchen"
).map((item) => item.url);

assert.deepEqual(kitchenUrls, ["/operations"]);
assert.equal(kitchenUrls.includes("/menu"), false);
assert.equal(kitchenUrls.includes("/manual-deduction"), false);
assert.equal(kitchenUrls.includes("/one-time-orders"), false);

assert.deepEqual(navMainUrlsForRole("courier"), ["/delivery"]);
assert.equal(navMainUrlsForRole("courier").includes("/operations"), false);

assert.deepEqual(navMainUrlsForRole("admin"), [
  "/dashboard",
  "/payments",
  "/accounting",
  "/promo-codes",
  "/addons",
  "/packages",
  "/subscriptions",
  "/operations",
  "/manual-deduction",
  "/menu",
  "/premium-meals",
  "/delivery",
  "/zones",
  "/users",
  "/dashboard-users",
]);

assert.deepEqual(navMainUrlsForRole("superadmin"), navMainUrlsForRole("admin"));

assert.deepEqual(secondaryUrlsForRole("admin"), [
  "/settings",
  "/restaurant-hours",
  "/pickup-branches",
  "/notifications",
]);
assert.deepEqual(secondaryUrlsForRole("superadmin"), secondaryUrlsForRole("admin"));
assert.deepEqual(secondaryUrlsForRole("kitchen"), []);
assert.deepEqual(secondaryUrlsForRole("courier"), []);
assert.deepEqual(secondaryUrlsForRole("cashier"), []);
