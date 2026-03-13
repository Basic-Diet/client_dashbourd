import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { login, sessionQueryOptions } from "@/lib/authApi";
import type { LoginCredentials, AuthResponse } from "@/types/auth";
import { useRouter } from "@tanstack/react-router";
import Cookies from "js-cookie";

export const useAuth = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: session, isLoading, isError } = useQuery(sessionQueryOptions);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Save token securely in cookies.
      // Set secure: true in production, sameSite: 'strict' for CSRF protection.
      Cookies.set("token", data.token, {
        expires: 7, // 7 days example
        secure: window.location.protocol === "https:",
        sameSite: "strict",
      });

      // Update query cache
      queryClient.setQueryData(sessionQueryOptions.queryKey, data);

      // Redirect to dashboard (or intended protected route)
      router.navigate({ to: "/" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Optional: Call logout API endpoint if exists
      Cookies.remove("token");
    },
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, undefined);
      queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey });
      router.navigate({ to: "/" });
    },
  });

  return {
    user: session?.user || null,
    isAuthenticated: !!session?.user,
    isLoading,
    isError,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
};
