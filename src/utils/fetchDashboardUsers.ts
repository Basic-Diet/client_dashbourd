import api from "@/lib/apis";
import { parseApiError } from "@/lib/apiErrors";
import type {
  CreateDashboardStaffUserPayload,
  DashboardStaffRole,
  DashboardStaffUserResponse,
  DashboardStaffUsersListParams,
  DashboardStaffUsersListResponse,
  ResetDashboardStaffPasswordPayload,
  UpdateDashboardStaffUserPayload,
} from "@/types/dashboardAdminTypes";
import {
  dashboardStaffResetPasswordUrl,
  dashboardStaffUserUrl,
  dashboardStaffUsersUrl,
} from "@/utils/dashboardApiContract";

/** Current backend-owned assignment contract for Dashboard Users. */
export const ASSIGNABLE_DASHBOARD_STAFF_ROLES = [
  "superadmin",
  "restaurant",
  "courier",
] as const satisfies readonly DashboardStaffRole[];

const dashboardStaffErrorMessages: Record<string, string> = {
  INVALID_EMAIL: "البريد الإلكتروني غير صحيح.",
  WEAK_PASSWORD: "كلمة المرور لا تحقق متطلبات الأمان.",
  INVALID_DASHBOARD_ROLE: "نوع صلاحية المستخدم غير صحيح.",
  DASHBOARD_USER_EXISTS:
    "يوجد مستخدم لوحة تحكم بهذا البريد الإلكتروني بالفعل.",
  DASHBOARD_USER_NOT_FOUND: "لم يتم العثور على مستخدم لوحة التحكم.",
  SUPERADMIN_PROTECTED:
    "لا يمكن تعديل حساب السوبر أدمن من هذه الشاشة.",
  UNAUTHORIZED: "انتهت الجلسة أو بيانات الدخول غير صحيحة.",
  FORBIDDEN: "ليس لديك صلاحية لتنفيذ هذا الإجراء.",
  TOKEN_REVOKED:
    "تم إنهاء الجلسة بسبب تغيير بيانات الحساب. سجل الدخول مرة أخرى.",
  LOCKED:
    "الحساب مقفل مؤقتا بسبب محاولات تسجيل الدخول الفاشلة.",
  INTERNAL: "حدث خطأ غير متوقع. حاول مرة أخرى.",
};

export const isDashboardStaffRole = (
  role: unknown
): role is DashboardStaffRole =>
  ASSIGNABLE_DASHBOARD_STAFF_ROLES.includes(role as DashboardStaffRole);

export const normalizeDashboardStaffRoles = (
  roles: unknown
): DashboardStaffRole[] => {
  void roles;
  return [...ASSIGNABLE_DASHBOARD_STAFF_ROLES];
};

const normalizeStaffUsersListResponse = (
  response: DashboardStaffUsersListResponse
): DashboardStaffUsersListResponse => ({
  ...response,
  assignableRoles: normalizeDashboardStaffRoles(response.assignableRoles),
  data: response.data,
});

export const fetchDashboardStaffUsers = async (
  params: DashboardStaffUsersListParams = {},
  signal?: AbortSignal
): Promise<DashboardStaffUsersListResponse> => {
  const response = await api.get<DashboardStaffUsersListResponse>(
    dashboardStaffUsersUrl(params),
    {
      signal,
      suppressGlobalForbiddenToast: true,
    }
  );
  return normalizeStaffUsersListResponse(response.data);
};

export const createDashboardStaffUser = async (
  data: CreateDashboardStaffUserPayload
): Promise<DashboardStaffUserResponse> => {
  const response = await api.post<DashboardStaffUserResponse>(
    dashboardStaffUsersUrl(),
    data,
    { suppressGlobalForbiddenToast: true }
  );
  return response.data;
};

export const updateDashboardStaffUser = async ({
  id,
  data,
}: {
  id: string;
  data: UpdateDashboardStaffUserPayload;
}): Promise<DashboardStaffUserResponse> => {
  const response = await api.patch<DashboardStaffUserResponse>(
    dashboardStaffUserUrl(id),
    data,
    { suppressGlobalForbiddenToast: true }
  );
  return response.data;
};

export const resetDashboardStaffUserPassword = async ({
  id,
  password,
}: {
  id: string;
} & ResetDashboardStaffPasswordPayload): Promise<DashboardStaffUserResponse> => {
  const response = await api.post<DashboardStaffUserResponse>(
    dashboardStaffResetPasswordUrl(id),
    { password },
    { suppressGlobalForbiddenToast: true }
  );
  return response.data;
};

export const getDashboardStaffUserErrorMessage = (error: unknown) => {
  const parsedError = parseApiError(error);
  if (parsedError.code && dashboardStaffErrorMessages[parsedError.code]) {
    return dashboardStaffErrorMessages[parsedError.code];
  }
  return parsedError.message || dashboardStaffErrorMessages.INTERNAL;
};

export const isDashboardStaffForbiddenError = (error: unknown) => {
  const parsedError = parseApiError(error);
  return parsedError.status === 403 || parsedError.code === "FORBIDDEN";
};

export const isDashboardStaffTokenRevokedError = (error: unknown) => {
  const parsedError = parseApiError(error);
  return parsedError.status === 401 || parsedError.code === "TOKEN_REVOKED";
};
