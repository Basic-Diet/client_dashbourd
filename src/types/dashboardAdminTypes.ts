export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface DashboardPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DashboardStatusResponse<T> {
  status: boolean;
  data: T;
}

export type DashboardStaffRole =
  | "admin"
  | "restaurant"
  | "courier";

export type DashboardStaffStatusFilter = "active" | "inactive";

export interface DashboardStaffUserDto {
  id: string;
  email: string;
  role: DashboardStaffRole | string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStaffUsersListParams {
  q?: string;
  role?: DashboardStaffRole;
  status?: DashboardStaffStatusFilter;
  page?: number;
  limit?: number;
}

export interface CreateDashboardStaffUserPayload {
  email: string;
  password: string;
  role: DashboardStaffRole;
  isActive: boolean;
}

export interface UpdateDashboardStaffUserPayload {
  email?: string;
  role?: DashboardStaffRole;
  isActive?: boolean;
}

export interface ResetDashboardStaffPasswordPayload {
  password: string;
}

export interface DashboardStaffUsersListResponse
  extends DashboardStatusResponse<DashboardStaffUserDto[]> {
  meta: DashboardPaginationMeta;
  assignableRoles: DashboardStaffRole[];
}

export type DashboardStaffUserResponse =
  DashboardStatusResponse<DashboardStaffUserDto>;

export interface DashboardNotificationSummaryItem {
  id: string;
  title: string;
  body: string;
  type: string | null;
  status: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string | null;
}

export interface DashboardRecentActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  byRole: string | null;
  createdAt: string | null;
}

export interface DashboardNotificationSummaryData {
  unreadCount: number;
  unreadWindowHours: number;
  failedCount: number;
  processingCount: number;
  recent: DashboardNotificationSummaryItem[];
  recentActivity: DashboardRecentActivityItem[];
}

export type DashboardNotificationSummaryResponse =
  DashboardStatusResponse<DashboardNotificationSummaryData>;

export interface DashboardTodayReportSummary {
  activeSubscriptions: number;
  newSubscriptionsToday: number;
  ordersToday: number;
  deliveredToday: number;
  paidPaymentsCount: number;
  revenueMinorUnits: number;
  revenue: number;
  revenueDisplay: string;
  failedNotifications: number;
}

export interface DashboardTodayOrder {
  id: string;
  displayId: string;
  userName: string | null;
  itemsSummary: string;
  status: string;
  date: string | null;
  amountDisplay: string;
  pricingSummary: JsonObject;
}

export interface DashboardTodaySubscription {
  id: string;
  userName: string | null;
  planName: string | null;
  status: string;
  startDate: string | null;
  amountDisplay: string;
  pricingSummary: JsonObject;
}

export interface DashboardTodayReportData {
  today: string;
  generatedAt: string;
  summary: DashboardTodayReportSummary;
  ordersByStatus: Record<string, number>;
  subscriptionDaysByStatus: Record<string, number>;
  recentOrders: DashboardTodayOrder[];
  recentSubscriptions: DashboardTodaySubscription[];
}

export type DashboardTodayReportResponse =
  DashboardStatusResponse<DashboardTodayReportData>;

export interface AccountingDailyReportParams {
  date?: string;
  fulfillmentMethod?: string;
  includeDetails?: boolean | string;
}

export type AccountingDailyReportResponse =
  DashboardStatusResponse<JsonObject>;

export interface DashboardLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  byRole?: string;
  from?: string;
  to?: string;
}

export interface DashboardLogsResponse
  extends DashboardStatusResponse<JsonObject[]> {
  meta: DashboardPaginationMeta;
}

export interface DashboardNotificationLogFilters {
  page?: number;
  limit?: number;
  userId?: string;
  entityId?: string;
  from?: string;
  to?: string;
}

export interface DashboardNotificationLogsResponse
  extends DashboardStatusResponse<JsonObject[]> {
  meta: DashboardPaginationMeta;
}

export interface SubscriptionTermsPayload {
  title: string;
  locale: string;
  content: string | JsonObject;
}

export interface SubscriptionTermsContent {
  title?: JsonValue;
  locale?: JsonValue;
  content?: JsonValue;
}

export type SubscriptionTermsResponse =
  DashboardStatusResponse<SubscriptionTermsContent>;

export type DashboardHealthReportResponse =
  DashboardStatusResponse<JsonObject>;
