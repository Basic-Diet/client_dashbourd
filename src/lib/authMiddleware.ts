import { redirect } from "@tanstack/react-router";
import type { AuthResponse, UserRole } from "@/types/auth";
import { UserRoles } from "@/types/auth";
import {
  KITCHEN_ROUTES,
  SUPERADMIN_ROUTES,
  AUTH_ROUTES,
  COURIER_ROUTES,
  ROLE_DEFAULTS,
} from "../../routes";

const isRouteMatch = (routes: string[], pathName: string) =>
  routes.some(
    (route) => pathName === route || pathName.startsWith(`${route}/`)
  );

const ROLE_ROUTES: Record<UserRole, string[]> = {
  [UserRoles.SUPERADMIN]: SUPERADMIN_ROUTES,
  [UserRoles.KITCHEN]: KITCHEN_ROUTES,
  [UserRoles.COURIER]: COURIER_ROUTES,
};

export const authMiddleware = (
  session: AuthResponse | null | undefined,
  pathName: string,
  searchParams: Record<string, string> = {}
) => {
  const isAuthRoute = isRouteMatch(AUTH_ROUTES, pathName);

  // No session → send to login, preserve intended destination
  if (!session?.user) {
    if (isAuthRoute) return; // already on login, do nothing
    throw redirect({ to: "/", search: { redirect: pathName } });
  }

  const role = session.user.role as UserRole;
  const allowedRoutes = ROLE_ROUTES[role];
  const defaultRoute = ROLE_DEFAULTS[role];

  // Unknown role → kick to login
  if (!allowedRoutes || !defaultRoute) throw redirect({ to: "/" });

  // Logged-in user on auth route → send back or to default
  if (isAuthRoute) {
    const returnTo = searchParams.redirect ?? defaultRoute;
    throw redirect({ to: returnTo });
  }

  // Not allowed for this role → send to their default
  if (!isRouteMatch(allowedRoutes, pathName)) {
    throw redirect({ to: defaultRoute });
  }
};
