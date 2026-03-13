import api from "./apis";
import { queryOptions } from "@tanstack/react-query";
import type { AuthResponse, LoginCredentials } from "@/types/auth";

export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>(
    "/api/dashboard/auth/login",
    credentials
  );
  return response.data;
};

export const getSession = async (): Promise<AuthResponse> => {
  const response = await api.get<AuthResponse>("/api/dashboard/auth/me");
  return response.data;
};

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: getSession,
  staleTime: 1000 * 60 * 5, // 5 minutes
  retry: false, // Do not retry on failure (e.g. 401 Unauthorized)
});
