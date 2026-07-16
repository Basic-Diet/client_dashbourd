import { UserRoles, type UserRole } from "@/types/auth";

export function canManageCustomerLifecycle(
  role: UserRole | string | null | undefined
) {
  return (
    role === UserRoles.SUPERADMIN ||
    role === UserRoles.ADMIN ||
    role === UserRoles.CASHIER
  );
}
