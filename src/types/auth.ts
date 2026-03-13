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
  ok: boolean;
  token: string;
  user: User;
}

export type LoginCredentials = LoginSchemaType;
