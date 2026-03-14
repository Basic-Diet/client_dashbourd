import type { LoginSchemaType } from "@/lib/validations/loginSchema";

export interface User {
  id: string;
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
  user: User | null;
}

export const UserRoles = {
  SUPERADMIN: "superadmin",
  COURIER: "courier",
  KITCHEN: "kitchen",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export type LoginCredentials = LoginSchemaType;
