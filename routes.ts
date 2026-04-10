import { UserRoles } from "@/types/auth";
import type { UserRole } from "@/types/auth";

const SUPERADMIN_ROUTES = [
  "/dashboard",
  "/orders",
  "/subscriptions",
  "/packages",
  "/users",
  "/premium-meals",
  "/addons",
  "/meals",
  "/categories",
];

const KITCHEN_ROUTES = ["/orders"];

const COURIER_ROUTES = ["/orders"];

const AUTH_ROUTES = ["/"];

const ROLE_DEFAULTS: Record<UserRole, string> = {
  [UserRoles.SUPERADMIN]: "/dashboard",
  [UserRoles.KITCHEN]: "/orders",
  [UserRoles.COURIER]: "/orders",
};

export {
  SUPERADMIN_ROUTES,
  KITCHEN_ROUTES,
  COURIER_ROUTES,
  AUTH_ROUTES,
  ROLE_DEFAULTS,
};
