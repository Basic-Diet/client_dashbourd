export interface User {
  id: string;
  coreUserId?: string;
  appUserId: string | null;
  fullName: string | null;
  phone: string;
  phoneE164?: string;
  email: string | null;
  role: string;
  isActive: boolean;
  accountStatus?: CustomerAccountStatus | string;
  forcePasswordChange: boolean;
  authState?: CustomerAuthState;
  temporaryPasswordReason?: "admin_created" | "admin_reset" | null;
  temporaryPasswordIssuedAt?: string | null;
  temporaryPasswordExpiresAt?: string | null;
  lastAdminPasswordResetAt?: string | null;
  canResetPassword?: boolean;
  fcmTokens: string[];
  subscriptionsCount: number;
  activeSubscriptionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CustomerAuthState =
  | "active"
  | "temporary_password"
  | "temporary_password_expired";

export type CustomerAccountStatus =
  | "active"
  | "pending_activation"
  | "reset_requested";

export type TemporaryCredentials = {
  temporaryPassword: string;
  expiresAt: string;
  mustChangePassword: boolean;
};

export type CreateAdminCustomerPayload = {
  fullName: string;
  phone: string;
  email?: string;
  temporaryPassword?: string;
  isActive: boolean;
};

export type ResetAdminCustomerPasswordPayload = {
  reason?: string;
};

export type CreateAdminCustomerResult = {
  user: User;
  temporaryCredentials: TemporaryCredentials;
};

export type ResetAdminCustomerPasswordResult = {
  userId: string;
  phoneE164: string;
  forcePasswordChange: true;
  temporaryPassword: string;
  temporaryPasswordExpiresAt: string;
  sessionsRevoked: boolean;
};

export interface PaginatedUsersResponse {
  status: boolean;
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
