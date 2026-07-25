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

const RESTAURANT_ROUTES = [
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
];

const RESTAURANT_DENIED_ROUTES: string[] = [];

const AUTH_ROUTES = ["/"];

const ROLE_DEFAULTS: Record<UserRole, string> = {
  [UserRoles.SUPERADMIN]: "/dashboard",
  [UserRoles.ADMIN]: "/dashboard",
  [UserRoles.KITCHEN]: "/operations",
  [UserRoles.COURIER]: "/delivery",
  [UserRoles.CASHIER]: "/operations",
  [UserRoles.RESTAURANT]: "/operations",
};

const ROLE_ROUTES: Record<UserRole, string[]> = {
  [UserRoles.SUPERADMIN]: SUPERADMIN_ROUTES,
  [UserRoles.ADMIN]: ADMIN_ROUTES,
  [UserRoles.KITCHEN]: KITCHEN_ROUTES,
  [UserRoles.COURIER]: COURIER_ROUTES,
  [UserRoles.CASHIER]: CASHIER_ROUTES,
  [UserRoles.RESTAURANT]: RESTAURANT_ROUTES,
};

const ROLE_DENIED_ROUTES: Partial<Record<UserRole, string[]>> = {
  [UserRoles.RESTAURANT]: RESTAURANT_DENIED_ROUTES,
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isRouteMatch = (routes: string[], pathName: string) =>
  routes.some((route) => {
    if (!route.includes("$")) {
      return pathName === route || pathName.startsWith(`${route}/`);
    }

    const pattern = route
      .split("/")
      .map((segment) =>
        segment.startsWith("$") ? "[^/]+" : escapeRegex(segment)
      )
      .join("/");
    return new RegExp(`^${pattern}/?$`).test(pathName);
  });

const canRoleAccessRoute = (role: UserRole | undefined, pathName: string) => {
  if (!role) return false;
  if (isRouteMatch(ROLE_DENIED_ROUTES[role] ?? [], pathName)) return false;
  return isRouteMatch(ROLE_ROUTES[role] ?? [], pathName);
};

export {
  SUPERADMIN_ROUTES,
  ADMIN_ROUTES,
  KITCHEN_ROUTES,
  COURIER_ROUTES,
  CASHIER_ROUTES,
  RESTAURANT_ROUTES,
  RESTAURANT_DENIED_ROUTES,
  AUTH_ROUTES,
  ROLE_DEFAULTS,
  ROLE_ROUTES,
  ROLE_DENIED_ROUTES,
  canRoleAccessRoute,
  isRouteMatch,
};
