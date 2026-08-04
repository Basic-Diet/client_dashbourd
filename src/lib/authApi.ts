import Cookies from "js-cookie";
import { queryOptions } from "@tanstack/react-query";

import api from "./apis";
import type {
  AuthResponse,
  ChangeDashboardPasswordPayload,
  LoginCredentials,
} from "@/types/auth";
import { normalizeAuthResponse } from "./authResponse";

const DEFAULT_DASHBOARD_SESSION_SECONDS = 7 * 24 * 60 * 60;

function dashboardCookieDays(expiresIn?: number | null) {
  const seconds = Number(expiresIn);
  const resolvedSeconds = Number.isFinite(seconds) && seconds > 0
    ? seconds
    : DEFAULT_DASHBOARD_SESSION_SECONDS;
  return resolvedSeconds / (24 * 60 * 60);
}

export function persistDashboardSession(session: AuthResponse) {
  if (!session.user || !session.token) {
    Cookies.remove("dashboardToken");
    return;
  }

  Cookies.set("dashboardToken", session.token, {
    expires: dashboardCookieDays(session.expiresIn),
    secure: window.location.protocol === "https:",
    sameSite: "strict",
  });
}

export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/api/dashboard/auth/login",
    credentials,
    { skipAuthRedirect: true }
  );

  return normalizeAuthResponse(response.data);
};

export const getSession = async (): Promise<AuthResponse> => {
  const response = await api.get<AuthResponse>("/api/dashboard/auth/me", {
    skipAuthRedirect: true,
  });
  const session = normalizeAuthResponse(response.data);
  persistDashboardSession(session);
  return session;
};

export const changeDashboardPassword = async (
  payload: ChangeDashboardPasswordPayload
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/api/dashboard/auth/change-password",
    payload
  );
  return normalizeAuthResponse(response.data);
};

export const logout = async (): Promise<void> => {
  await api.post("/api/dashboard/auth/logout");
};

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: getSession,
  staleTime: 1000 * 60 * 5,
  retry: false,
  refetchOnWindowFocus: true,
});
