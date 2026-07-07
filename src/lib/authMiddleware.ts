import { redirect } from "@tanstack/react-router";
import type { AuthResponse, UserRole } from "@/types/auth";
import {
  AUTH_ROUTES,
  ROLE_DEFAULTS,
  ROLE_ROUTES,
  isRouteMatch,
} from "@/constants/routes";

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

  if (pathName === "/one-time-orders" || pathName.startsWith("/one-time-orders/")) {
    throw redirect({ to: "/operations", search: { tab: "kitchen" } });
  }

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
