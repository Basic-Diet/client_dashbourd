import { UserRoles } from "@/types/auth";
import type { UserRole } from "@/types/auth";

const SUPERADMIN_ROUTES = [
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

const ADMIN_ROUTES = [
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

const KITCHEN_ROUTES = [
  "/addons",
  "/operations",
  "/one-time-orders",
  "/menu",
  "/premium-meals",
  "/profile",
];

const COURIER_ROUTES = ["/delivery", "/profile"];

const CASHIER_ROUTES = [
  "/manual-deduction",
  "/operations",
  "/one-time-orders",
  "/users",
  "/profile",
];

const AUTH_ROUTES = ["/"];

const ROLE_DEFAULTS: Record<UserRole, string> = {
  [UserRoles.SUPERADMIN]: "/dashboard",
  [UserRoles.ADMIN]: "/dashboard",
  [UserRoles.KITCHEN]: "/operations",
  [UserRoles.COURIER]: "/delivery",
  [UserRoles.CASHIER]: "/operations",
};

const ROLE_ROUTES: Record<UserRole, string[]> = {
  [UserRoles.SUPERADMIN]: SUPERADMIN_ROUTES,
  [UserRoles.ADMIN]: ADMIN_ROUTES,
  [UserRoles.KITCHEN]: KITCHEN_ROUTES,
  [UserRoles.COURIER]: COURIER_ROUTES,
  [UserRoles.CASHIER]: CASHIER_ROUTES,
};

const isRouteMatch = (routes: string[], pathName: string) =>
  routes.some(
    (route) => pathName === route || pathName.startsWith(`${route}/`)
  );

const canRoleAccessRoute = (role: UserRole | undefined, pathName: string) => {
  if (!role) return false;
  if (role === UserRoles.CASHIER && pathName === "/subscriptions/create") {
    return true;
  }
  return isRouteMatch(ROLE_ROUTES[role] ?? [], pathName);
};

export {
  SUPERADMIN_ROUTES,
  ADMIN_ROUTES,
  KITCHEN_ROUTES,
  COURIER_ROUTES,
  CASHIER_ROUTES,
  AUTH_ROUTES,
  ROLE_DEFAULTS,
  ROLE_ROUTES,
  canRoleAccessRoute,
  isRouteMatch,
};
