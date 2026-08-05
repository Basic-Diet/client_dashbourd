import { UserRoles } from "@/types/auth";

const RESTAURANT_WRITE_ROLES = new Set<string>([
  UserRoles.SUPERADMIN,
  UserRoles.ADMIN,
  UserRoles.RESTAURANT,
]);

const CUSTOMER_PASSWORD_ROLES = new Set<string>([
  UserRoles.SUPERADMIN,
  UserRoles.ADMIN,
  UserRoles.RESTAURANT,
]);

export function canManageRestaurantData(role: unknown): boolean {
  return typeof role === "string" && RESTAURANT_WRITE_ROLES.has(role);
}

export function canManageCustomerPasswords(role: unknown): boolean {
  return typeof role === "string" && CUSTOMER_PASSWORD_ROLES.has(role);
}

export const canCreateAppCustomer = canManageRestaurantData;
export const canCreateCustomerSubscription = canManageRestaurantData;
export const canManageMenuData = canManageRestaurantData;
export const canManageMealBuilder = canManageRestaurantData;
export const canManagePremiumUpgrades = canManageRestaurantData;
export const canManageAddonPlans = canManageRestaurantData;
