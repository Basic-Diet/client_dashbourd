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
assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/one-time-orders"), true);
assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/users/user-1"), true);
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
assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/payments"), false);
assert.equal(canRoleAccessRoute(UserRoles.CASHIER, "/accounting"), false);
assert.equal(canRoleAccessRoute("unknown" as UserRole, "/dashboard"), false);
assert.equal(canRoleAccessRoute(undefined, "/dashboard"), false);
