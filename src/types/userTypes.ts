export interface User {
  id: string;
  coreUserId: string;
  appUserId: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  fcmTokens: string[];
  subscriptionsCount: number;
  activeSubscriptionsCount: number;
  createdAt: string;
  updatedAt: string;
}

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
