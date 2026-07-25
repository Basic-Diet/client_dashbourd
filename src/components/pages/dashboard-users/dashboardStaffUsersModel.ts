import { z } from "zod";
import type {
  CreateDashboardStaffUserPayload,
  DashboardStaffRole,
  DashboardStaffUserDto,
  UpdateDashboardStaffUserPayload,
} from "@/types/dashboardAdminTypes";
import { getDashboardStaffRoleLabel, getRoleLabel } from "@/lib/roleLabels";
import {
  ASSIGNABLE_DASHBOARD_STAFF_ROLES,
  isDashboardStaffRole,
  normalizeDashboardStaffRoles,
} from "@/utils/fetchDashboardUsers";

export const DASHBOARD_STAFF_ROLE_LABELS: Record<
  DashboardStaffRole,
  string
> = {
  admin: getDashboardStaffRoleLabel("admin"),
  restaurant: getDashboardStaffRoleLabel("restaurant"),
  courier: getDashboardStaffRoleLabel("courier"),
};

export const DASHBOARD_STAFF_ROLE_LABELS_EN: Record<
  DashboardStaffRole,
  string
> = {
  admin: getDashboardStaffRoleLabel("admin", "en"),
  restaurant: getDashboardStaffRoleLabel("restaurant", "en"),
  courier: getDashboardStaffRoleLabel("courier", "en"),
};

export const getDashboardStaffUserRoleLabel = (role: string) =>
  getRoleLabel(role) || role;

export const DASHBOARD_STAFF_STATUS_LABELS = {
  active: "نشط",
  inactive: "غير نشط",
} as const;

export const WEAK_DASHBOARD_PASSWORD_MESSAGE =
  "كلمة المرور شائعة أو افتراضية. اختر كلمة مرور أقوى.";

export const DASHBOARD_PASSWORD_REQUIREMENTS = [
  "12 حرفا على الأقل",
  "حرف كبير وحرف صغير",
  "رقم ورمز خاص",
  "ليست كلمة مرور شائعة أو افتراضية",
];

const weakDashboardPasswords = new Set(
  [
    "Password@123",
    "Password123!",
    "Admin@123456",
    "Admin123456!",
    "Qwerty@12345",
    "Welcome@123",
  ].map((password) => password.trim().toLowerCase())
);

export const isKnownWeakDashboardPassword = (password: string) =>
  weakDashboardPasswords.has(password.trim().toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "كلمة المرور يجب أن تكون 12 حرفا على الأقل.")
  .regex(/[A-Z]/, "كلمة المرور يجب أن تحتوي على حرف كبير.")
  .regex(/[a-z]/, "كلمة المرور يجب أن تحتوي على حرف صغير.")
  .regex(/[0-9]/, "كلمة المرور يجب أن تحتوي على رقم.")
  .regex(/[^A-Za-z0-9]/, "كلمة المرور يجب أن تحتوي على رمز.")
  .refine((password) => !isKnownWeakDashboardPassword(password), {
    message: WEAK_DASHBOARD_PASSWORD_MESSAGE,
  });

const roleSchema = z.custom<DashboardStaffRole>(
  isDashboardStaffRole,
  "نوع صلاحية المستخدم غير صحيح."
);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("البريد الإلكتروني غير صحيح.");

export const createDashboardStaffUserSchema = z
  .object({
    email: emailSchema,
    role: roleSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    isActive: z.boolean(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "تأكيد كلمة المرور غير مطابق.",
  });

export const editDashboardStaffUserSchema = z.object({
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

export const resetDashboardStaffPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "تأكيد كلمة المرور غير مطابق.",
  });

export type CreateDashboardStaffUserFormValues = z.input<
  typeof createDashboardStaffUserSchema
>;

export type ParsedCreateDashboardStaffUserFormValues = z.output<
  typeof createDashboardStaffUserSchema
>;

export type EditDashboardStaffUserFormValues = z.input<
  typeof editDashboardStaffUserSchema
>;

export type ParsedEditDashboardStaffUserFormValues = z.output<
  typeof editDashboardStaffUserSchema
>;

export type ResetDashboardStaffPasswordFormValues = z.input<
  typeof resetDashboardStaffPasswordSchema
>;

export const defaultAssignableRoles = (): DashboardStaffRole[] => [
  ...ASSIGNABLE_DASHBOARD_STAFF_ROLES,
];

export const getAssignableDashboardStaffRoles = normalizeDashboardStaffRoles;

export const getDefaultDashboardStaffRole = (
  assignableRoles: DashboardStaffRole[]
): DashboardStaffRole =>
  assignableRoles.includes("restaurant")
    ? "restaurant"
    : assignableRoles[0] ?? "restaurant";

export const isAssignableDashboardStaffRole = (
  role: DashboardStaffRole,
  assignableRoles: DashboardStaffRole[]
) => assignableRoles.includes(role);

export const createDashboardStaffUserSchemaForRoles = (
  assignableRoles: DashboardStaffRole[]
) =>
  createDashboardStaffUserSchema.refine(
    (value) => isAssignableDashboardStaffRole(value.role, assignableRoles),
    {
      path: ["role"],
      message: "نوع صلاحية المستخدم غير صحيح.",
    }
  );

export const editDashboardStaffUserSchemaForRoles = (
  assignableRoles: DashboardStaffRole[]
) =>
  editDashboardStaffUserSchema.refine(
    (value) => isAssignableDashboardStaffRole(value.role, assignableRoles),
    {
      path: ["role"],
      message: "نوع صلاحية المستخدم غير صحيح.",
    }
  );

export const buildCreateDashboardStaffUserPayload = (
  values: ParsedCreateDashboardStaffUserFormValues
): CreateDashboardStaffUserPayload => ({
  email: values.email,
  password: values.password,
  role: values.role,
  isActive: values.isActive,
});

export const buildUpdateDashboardStaffUserPatch = (
  originalUser: DashboardStaffUserDto,
  values: ParsedEditDashboardStaffUserFormValues
): UpdateDashboardStaffUserPayload => {
  const patch: UpdateDashboardStaffUserPayload = {};

  if (values.email !== originalUser.email) patch.email = values.email;
  if (values.role !== originalUser.role) patch.role = values.role;
  if (values.isActive !== originalUser.isActive) {
    patch.isActive = values.isActive;
  }

  return patch;
};

export const hasUpdatePatchChanges = (patch: UpdateDashboardStaffUserPayload) =>
  Object.keys(patch).length > 0;