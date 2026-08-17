import type { LoginSchemaType } from "@/lib/validations/loginSchema";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  status: boolean;
  token: string;
  expiresIn?: number | null;
  user: User | null;
}

export interface ChangeDashboardPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const UserRoles = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  KITCHEN: "kitchen",
  COURIER: "courier",
  CASHIER: "cashier",
  RESTAURANT: "restaurant",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const isUserRole = (role: unknown): role is UserRole =>
  Object.values(UserRoles).includes(role as UserRole);

export type LoginCredentials = LoginSchemaType;
