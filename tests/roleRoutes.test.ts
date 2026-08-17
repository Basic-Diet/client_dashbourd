import assert from "node:assert/strict";
import {
  ADMIN_ROUTES,
  CASHIER_ROUTES,
  COURIER_ROUTES,
  KITCHEN_ROUTES,
  RESTAURANT_DENIED_ROUTES,
  RESTAURANT_ROUTES,
  ROLE_DEFAULTS,
  SUPERADMIN_ROUTES,
  canRoleAccessRoute,
} from "../src/constants/routes";
import { UserRoles, type UserRole } from "../src/types/auth";
import { test } from "vitest";

test("roleRoutes.test", () => {
  const adminProtectedRoutes = [
    "/dashboard",
    "/operations",
    "/one-time-orders",
    "/subscriptions",
    "/packages",
    "/users",
    "/addons",
    "/delivery",
    "/payments",
    "/accounting",
    "/subscription-audit",
    "/promo-codes",
    "/zones",
    "/manual-deduction",
    "/menu",
    "/premium-meals",
    "/settings",
    "/restaurant-hours",
    "/pickup-branches",
    "/notifications",
    "/profile",
  ];

  assert.deepEqual(SUPERADMIN_ROUTES, [
    ...adminProtectedRoutes.slice(0, 16),
    "/dashboard-users",
    ...adminProtectedRoutes.slice(16),
  ]);
  assert.deepEqual(ADMIN_ROUTES, adminProtectedRoutes);

  assert.deepEqual(CASHIER_ROUTES, [
    "/manual-deduction",
    "/operations",
    "/one-time-orders",
    "/users",
    "/profile",
  ]);

  assert.equal(CASHIER_ROUTES.includes("/payments"), false);
  assert.equal(CASHIER_ROUTES.includes("/subscriptions"), false);
  assert.equal(CASHIER_ROUTES.includes("/menu"), false);
  assert.equal(CASHIER_ROUTES.includes("/packages"), false);

  assert.deepEqual(KITCHEN_ROUTES, [
    "/addons",
    "/operations",
    "/one-time-orders",
    "/menu",
    "/premium-meals",
    "/profile",
  ]);
  assert.equal(KITCHEN_ROUTES.includes("/manual-deduction"), false);
  assert.equal(KITCHEN_ROUTES.includes("/users"), false);
  assert.equal(KITCHEN_ROUTES.includes("/delivery"), false);

  assert.deepEqual(COURIER_ROUTES, ["/delivery", "/operations", "/profile"]);
  assert.equal(COURIER_ROUTES.includes("/operations"), true);
  assert.equal(COURIER_ROUTES.includes("/one-time-orders"), false);

  assert.deepEqual(RESTAURANT_ROUTES, [
    "/operations",
    "/one-time-orders",
    "/subscriptions",
    "/manual-deduction",
    "/users",
    "/addons",
    "/delivery",
    "/menu",
    "/premium-meals",
    "/profile",
  ]);
  assert.deepEqual(RESTAURANT_DENIED_ROUTES, []);

  assert.deepEqual(ROLE_DEFAULTS, {
    [UserRoles.SUPERADMIN]: "/dashboard",
    [UserRoles.ADMIN]: "/dashboard",
    [UserRoles.KITCHEN]: "/operations",
    [UserRoles.COURIER]: "/delivery",
    [UserRoles.CASHIER]: "/operations",
    [UserRoles.RESTAURANT]: "/operations",
  });

  assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/subscriptions/create"), true);
  assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/dashboard-users"), false);
  assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/users/user-1"), true);
  assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/dashboard-users"), true);
  assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/menu"), true);
  assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/premium-meals"), true);
  assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/delivery"), false);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/delivery"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/one-time-orders"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/manual-deduction"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/users"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/payments"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/accounting"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/manual-deduction"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/users"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/users/create"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/users/user-1"), true);
  assert.equal(
    canRoleAccessRoute(UserRoles.RESTAURANT, "/users/user-1/create-subscription"),
    true
  );
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/subscriptions"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/addons"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/addons/create"), true);
  assert.equal(
    canRoleAccessRoute(UserRoles.RESTAURANT, "/addons/addon-1/update"),
    true
  );
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/menu"), true);
  assert.equal(
    canRoleAccessRoute(UserRoles.RESTAURANT, "/menu/products/product-1/update"),
    true
  );
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/premium-meals"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/delivery"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/profile"), true);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/dashboard"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/dashboard-users"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/accounting"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/payments"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/settings"), false);
  assert.equal(canRoleAccessRoute(UserRoles.RESTAURANT, "/pickup-branches"), false);
  assert.equal(canRoleAccessRoute("unknown" as UserRole, "/dashboard"), false);
  assert.equal(canRoleAccessRoute(undefined, "/dashboard"), false);
});
