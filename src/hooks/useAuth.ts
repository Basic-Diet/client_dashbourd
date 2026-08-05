import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeDashboardPassword,
  login,
  logout,
  persistDashboardSession,
  sessionQueryOptions,
} from "@/lib/authApi";
import {
  isUserRole,
  type AuthResponse,
  type ChangeDashboardPasswordPayload,
  type LoginCredentials,
} from "@/types/auth";
import { useRouter } from "@tanstack/react-router";
import { ROLE_DEFAULTS, canRoleAccessRoute } from "@/constants/routes";
import { ToastMessage } from "@/components/global/ToastMessage";
import { parseApiError } from "@/lib/apiErrors";
import Cookies from "js-cookie";

function getLoginErrorMessage(error: unknown) {
  const parsed = parseApiError(error);
  if (parsed.code === "LOCKED" || parsed.status === 423) {
    return "الحساب مقفل مؤقتًا بسبب تكرار محاولات الدخول. انتظر قليلًا ثم حاول مرة أخرى.";
  }
  if (parsed.status === 401 || parsed.code === "UNAUTHORIZED") {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (parsed.status === 403 || parsed.code === "FORBIDDEN") {
    return "هذا الحساب غير نشط. تواصل مع الإدارة لتفعيله.";
  }
  return parsed.message || "فشل تسجيل الدخول، تحقق من بياناتك";
}

export const useAuth = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: session, isLoading, isError } = useQuery(sessionQueryOptions);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data: AuthResponse) => {
      persistDashboardSession(data);
      queryClient.setQueryData(sessionQueryOptions.queryKey, data);

      ToastMessage("تم تسجيل الدخول بنجاح", "success");

      const search = router.state.location.search as { redirect?: string };
      const defaultRoute = isUserRole(data.user?.role)
        ? ROLE_DEFAULTS[data.user.role]
        : "/";
      const returnTo =
        typeof search.redirect === "string" &&
        isUserRole(data.user?.role) &&
        canRoleAccessRoute(data.user.role, search.redirect)
          ? search.redirect
          : defaultRoute;

      router.navigate({ to: returnTo });
    },
    onError: (error: unknown) => {
      ToastMessage(getLoginErrorMessage(error), "error");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangeDashboardPasswordPayload) =>
      changeDashboardPassword(payload),
    onSuccess: (data: AuthResponse) => {
      persistDashboardSession(data);
      queryClient.setQueryData(sessionQueryOptions.queryKey, data);
      ToastMessage("تم تغيير كلمة المرور بنجاح", "success");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await logout();
      } catch {
        // Even if backend logout fails, clear local session
      }
      Cookies.remove("dashboardToken");
    },
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, undefined);
      queryClient.removeQueries({ queryKey: sessionQueryOptions.queryKey });

      ToastMessage("تم تسجيل الخروج بنجاح", "success");

      router.navigate({ to: "/" });
    },
    onError: () => {
      ToastMessage("حدث خطأ أثناء تسجيل الخروج", "error");
    },
  });

  return {
    user: session?.user || null,
    isAuthenticated: !!session?.user,
    isLoading,
    isError,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    isChangingPassword: changePasswordMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
};
