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
import { UserRoles, type UserRole } from "../src/types/auth";

const adminProtectedRoutes = [
  "/dashboard",
  "/operations",
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
  "/dashboard-users",
  "/settings",
  "/restaurant-hours",
  "/pickup-branches",
  "/notifications",
  "/profile",
];

assert.deepEqual(SUPERADMIN_ROUTES, adminProtectedRoutes);
assert.deepEqual(ADMIN_ROUTES, adminProtectedRoutes);

assert.deepEqual(CASHIER_ROUTES, [
  "/dashboard",
  "/subscriptions",
  "/payments",
  "/users",
  "/profile",
]);

assert.equal(CASHIER_ROUTES.includes("/manual-deduction"), false);
assert.equal(CASHIER_ROUTES.includes("/pickup-board"), false);
assert.equal(CASHIER_ROUTES.includes("/menu"), false);
assert.equal(CASHIER_ROUTES.includes("/packages"), false);

assert.deepEqual(KITCHEN_ROUTES, ["/operations", "/profile"]);
assert.equal(KITCHEN_ROUTES.includes("/menu"), false);
assert.equal(KITCHEN_ROUTES.includes("/manual-deduction"), false);
assert.equal(KITCHEN_ROUTES.includes("/one-time-orders"), false);

assert.deepEqual(COURIER_ROUTES, ["/delivery", "/profile"]);
assert.equal(COURIER_ROUTES.includes("/operations"), false);
assert.equal(COURIER_ROUTES.includes("/one-time-orders"), false);

assert.deepEqual(ROLE_DEFAULTS, {
  [UserRoles.SUPERADMIN]: "/dashboard",
  [UserRoles.ADMIN]: "/dashboard",
  [UserRoles.KITCHEN]: "/operations",
  [UserRoles.COURIER]: "/delivery",
  [UserRoles.CASHIER]: "/dashboard",
});

assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/subscriptions/create"), true);
assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/users/user-1"), true);
assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/operations"), true);
assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/one-time-orders/order-1"), false);
assert.equal(canRoleAccessRoute(UserRoles.KITCHEN, "/delivery"), false);
assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/delivery"), true);
assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations"), false);
assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/payments"), true);
assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/accounting"), false);
assert.equal(canRoleAccessRoute("unknown" as UserRole, "/dashboard"), false);
assert.equal(canRoleAccessRoute(undefined, "/dashboard"), false);
