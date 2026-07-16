import assert from "node:assert/strict";
import {
  ADMIN_ROUTES,
  CASHIER_ROUTES,
  COURIER_ROUTES,
  KITCHEN_ROUTES,
  ROLE_DEFAULTS,
  SUPERADMIN_ROUTES,
  canRoleAccessRoute,
} from "../src/constants/routes";
import { canManageCustomerLifecycle } from "../src/lib/customerLifecyclePermissions";
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
    ...adminProtectedRoutes.slice(0, 15),
    "/dashboard-users",
    ...adminProtectedRoutes.slice(15),
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

  assert.deepEqual(COURIER_ROUTES, ["/delivery", "/profile"]);
  assert.equal(COURIER_ROUTES.includes("/operations"), false);
  assert.equal(COURIER_ROUTES.includes("/one-time-orders"), false);

  assert.deepEqual(ROLE_DEFAULTS, {
    [UserRoles.SUPERADMIN]: "/dashboard",
    [UserRoles.ADMIN]: "/dashboard",
    [UserRoles.KITCHEN]: "/operations",
    [UserRoles.COURIER]: "/delivery",
    [UserRoles.CASHIER]: "/operations",
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
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations"), false);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/one-time-orders"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/manual-deduction"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/one-time-orders"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/users"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/users/create"), true);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/users/user-1"), true);
  assert.equal(
    canRoleAccessRoute(UserRoles.CASHIER, "/users/user-1/create-subscription"),
    true
  );
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/subscriptions"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/subscriptions/create"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/packages"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/dashboard-users"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/settings"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/addons"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/promo-codes"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/zones"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/payments"), false);
  assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/accounting"), false);
  assert.equal(canRoleAccessRoute("unknown" as UserRole, "/dashboard"), false);
  assert.equal(canRoleAccessRoute(undefined, "/dashboard"), false);
});

test("customer lifecycle helper allows only customer-management roles", () => {
  assert.equal(canManageCustomerLifecycle(UserRoles.SUPERADMIN), true);
  assert.equal(canManageCustomerLifecycle(UserRoles.ADMIN), true);
  assert.equal(canManageCustomerLifecycle(UserRoles.CASHIER), true);
  assert.equal(canManageCustomerLifecycle(UserRoles.KITCHEN), false);
  assert.equal(canManageCustomerLifecycle(UserRoles.COURIER), false);
  assert.equal(canManageCustomerLifecycle("unknown"), false);
  assert.equal(canManageCustomerLifecycle(undefined), false);
});
