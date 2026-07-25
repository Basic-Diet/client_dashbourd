import assert from "node:assert/strict";
import { NavLinksData } from "../src/constants/NavLinksData";
import { filterNavItemsForRole } from "../src/lib/navPermissions";
import { test } from "vitest";

test("navPermissions.test", () => {
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
    "/operations",
    "/manual-deduction",
    "/users",
  ]);

  assert.equal(cashierUrls.includes("/payments"), false);
  assert.equal(cashierUrls.includes("/subscriptions"), false);
  assert.equal(cashierUrls.includes("/menu"), false);
  assert.equal(cashierUrls.includes("/packages"), false);

  const restaurantUrls = navMainUrlsForRole("restaurant");
  assert.deepEqual(restaurantUrls, [
    "/addons",
    "/subscriptions",
    "/operations",
    "/manual-deduction",
    "/menu",
    "/premium-meals",
    "/delivery",
    "/users",
  ]);
  assert.equal(restaurantUrls.includes("/dashboard"), false);
  assert.equal(restaurantUrls.includes("/dashboard-users"), false);
  assert.equal(restaurantUrls.includes("/accounting"), false);
  assert.equal(restaurantUrls.includes("/payments"), false);
  assert.equal(restaurantUrls.includes("/delivery"), true);
  assert.equal(restaurantUrls.includes("/zones"), false);

  const kitchenUrls = filterNavItemsForRole(
    NavLinksData.navMain,
    "kitchen"
  ).map((item) => item.url);

  assert.deepEqual(kitchenUrls, [
    "/addons",
    "/operations",
    "/menu",
    "/premium-meals",
  ]);
  assert.equal(kitchenUrls.includes("/manual-deduction"), false);
  assert.equal(kitchenUrls.includes("/users"), false);
  assert.equal(kitchenUrls.includes("/delivery"), false);

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
  ]);

  assert.deepEqual(navMainUrlsForRole("superadmin"), [
    ...navMainUrlsForRole("admin"),
    "/dashboard-users",
  ]);

  assert.equal(navMainUrlsForRole("admin").includes("/dashboard-users"), false);
  assert.equal(navMainUrlsForRole("kitchen").includes("/dashboard-users"), false);
  assert.equal(navMainUrlsForRole("courier").includes("/dashboard-users"), false);
  assert.equal(navMainUrlsForRole("cashier").includes("/dashboard-users"), false);
  assert.equal(navMainUrlsForRole("restaurant").includes("/dashboard-users"), false);
  assert.equal(navMainUrlsForRole("superadmin").includes("/dashboard-users"), true);

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
  assert.deepEqual(secondaryUrlsForRole("restaurant"), []);
});
