import api from "@/lib/apis";
import { extractOperationsQueueItems, getInvalidActionReason } from "@/lib/operationsBoard";
import { type UnifiedQueueItem, isOneTimeOrder } from "@/types/dashboardOpsTypes";
import type {
  DashboardOpsListResponse,
  DashboardOpsActionResponse,
  DashboardOpsActionRequest,
  QueueAction,
} from "@/types/dashboardOpsTypes";

export interface QueueParams {
  status?: string | string[];
  method?: string;
  q?: string;
  zoneId?: string;
  branchId?: string;
  includeCanceled?: boolean;
}

export interface ManualDeductionHistoryItem {
  id: string;
  businessDate?: string | null;
  deducted?: {
    regularMeals?: number | null;
    premiumMeals?: number | null;
    total?: number | null;
  };
  before?: {
    remainingRegularMeals?: number | null;
    remainingPremiumMeals?: number | null;
    remainingMeals?: number | null;
  };
  after?: {
    remainingRegularMeals?: number | null;
    remainingPremiumMeals?: number | null;
    remainingMeals?: number | null;
  };
  fulfillmentMethod?: string | null;
  actor?: {
    id?: string | null;
    role?: string | null;
  };
  reason?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

export interface ManualDeductionHistory {
  contractVersion: "dashboard_manual_deductions.v1";
  subscriptionId: string;
  count: number;
  items: ManualDeductionHistoryItem[];
}

export interface GetPickupQueueParams {
  date: string;
}

function queueRequestParams(date: string, params: QueueParams = {}) {
  return {
    ...params,
    date,
    status: Array.isArray(params.status) ? params.status.join(",") : params.status,
  };
}

export const getKitchenQueue = async (
  date: string,
  params: QueueParams = {}
): Promise<UnifiedQueueItem[]> => {
  const { data } = await api.get("/api/dashboard/kitchen/queue", {
    params: queueRequestParams(date, params),
  });
  return extractOperationsQueueItems(data);
};

export const getPickupQueue = async (
  dateOrParams: string | GetPickupQueueParams,
  params: QueueParams = {}
): Promise<UnifiedQueueItem[]> => {
  const date =
    typeof dateOrParams === "string" ? dateOrParams : dateOrParams.date;
  const { data } = await api.get("/api/dashboard/pickup/queue", {
    params: queueRequestParams(date, params),
  });
  return extractOperationsQueueItems(data);
};

export const executePickupAction = async ({
  item,
  action,
  reason,
  notes,
  pickupCode,
}: {
  item: UnifiedQueueItem;
  action: string;
  reason?: string;
  notes?: string;
  pickupCode?: string;
}) => {
  if (isOneTimeOrder(item)) {
    const orderId = item.entityId || item.id;
    const body: Record<string, string> = {};
    if (reason) body.reason = reason;
    if (notes) body.notes = notes;
    if (pickupCode) body.pickupCode = pickupCode;

    const { data } = await api.post(`/api/dashboard/orders/${orderId}/actions/${action}`, body);
    return data;
  } else {
    const { data } = await api.post(`/api/dashboard/pickup/actions/${action}`, {
      entityId: item.subscriptionDayId || item.id,
      entityType: "subscription_day",
      payload: { reason, notes, ...(pickupCode ? { pickupCode } : {}) },
    });
    return data;
  }
};

export interface GetCourierQueueParams {
  date: string;
  status?: string;
  method: "delivery";
}

export const getCourierQueue = async (
  dateOrParams: string | GetCourierQueueParams,
  params: QueueParams = {}
): Promise<UnifiedQueueItem[]> => {
  const date =
    typeof dateOrParams === "string" ? dateOrParams : dateOrParams.date;
  const mergedParams =
    typeof dateOrParams === "string" ? params : { ...dateOrParams, ...params };
  const { data } = await api.get("/api/dashboard/courier/queue", {
    params: queueRequestParams(date, mergedParams),
  });
  return extractOperationsQueueItems(data);
};

export const executeCourierAction = async ({
  item,
  action,
  reason,
  notes,
  courierId,
}: {
  item: UnifiedQueueItem;
  action: string;
  reason?: string;
  notes?: string;
  courierId?: string;
}) => {
  const { data } = await api.post(`/api/dashboard/courier/actions/${action}`, {
    entityId: item.subscriptionDayId || item.id,
    entityType: "subscription_day",
    payload: { reason, notes, ...(courierId ? { courierId } : {}) },
  });
  return data;
};

export const searchSubscription = async (phone: string) => {
  const { data } = await api.get(`/api/dashboard/subscriptions/search?phone=${encodeURIComponent(phone)}`);
  return data.items || data;
};

export const executeManualDeduction = async ({
  id,
  regularMeals,
  premiumMeals,
  reason,
  notes,
}: {
  id: string;
  regularMeals: number;
  premiumMeals: number;
  reason: string;
  notes: string;
}) => {
  const { data } = await api.post(`/api/dashboard/subscriptions/${id}/manual-deduction`, {
    regularMeals,
    premiumMeals,
    reason,
    notes,
  });
  return data;
};

export const fetchManualDeductionHistory = async (
  subscriptionId: string,
  limit = 5
): Promise<ManualDeductionHistory> => {
  const { data } = await api.get(
    `/api/dashboard/subscriptions/${subscriptionId}/manual-deductions`,
    { params: { limit } }
  );
  return data?.data || data;
};

// ── Fetch all ops for a date ──
export const fetchDashboardOpsList = async (
  date: string
): Promise<DashboardOpsListResponse> => {
  const response = await api.get("/api/dashboard/ops/list", {
    params: { date },
  });
  const items = extractOperationsQueueItems(response.data);
  return {
    status: response.data?.status !== false,
    data: {
      contractVersion: response.data?.data?.contractVersion,
      date: response.data?.data?.date ?? date,
      items,
    },
  };
};

// ── Full-text search across ops ──
export const fetchDashboardOpsSearch = async (
  query: string
): Promise<DashboardOpsListResponse> => {
  if (query.trim().length < 3) {
    return {
      status: true,
      data: {
        date: "",
        items: [],
      },
    };
  }

  const response = await api.get("/api/dashboard/ops/search", {
    params: { q: query },
  });
  const items = extractOperationsQueueItems(response.data);
  return {
    status: response.data?.status !== false,
    data: {
      contractVersion: response.data?.data?.contractVersion,
      date: response.data?.data?.date ?? "",
      items,
    },
  };
};

export const fetchCashierCustomerLookup = async (phone: string) => {
  const response = await api.get("/api/dashboard/ops/cashier/customer-lookup", {
    params: { phone },
  });
  return response.data;
};

export const createCashierCustomerConsumption = async (data: {
  userId?: string;
  subscriptionId?: string;
  phone?: string;
  items?: unknown[];
  reason?: string;
  notes?: string;
}) => {
  const response = await api.post(
    "/api/dashboard/ops/cashier/customer-consumption",
    data
  );
  return response.data;
};

export const fetchDeliverySchedule = async (
  date?: string
): Promise<unknown> => {
  const response = await api.get("/api/dashboard/delivery-schedule", {
    params: {
      ...(date ? { date } : {}),
    },
  });
  return response.data;
};

// ── Execute an action ──
export const executeDashboardOpsAction = async (
  action: string,
  payload: DashboardOpsActionRequest,
  actionDef?: QueueAction
): Promise<DashboardOpsActionResponse> => {
  if (!actionDef || actionDef.id !== action) {
    throw new Error("هذا الإجراء غير موجود ضمن الصلاحيات المرسلة من الخادم.");
  }
  const invalidReason = actionDef.disabledReason || getInvalidActionReason(actionDef);
  if (actionDef.disabled || invalidReason) {
    throw new Error(invalidReason || "هذا الإجراء غير متاح حالياً.");
  }

  const response = await api.request({
    url: actionDef.endpoint,
    method: actionDef.method.toLowerCase(),
    data: payload,
  });
  return response.data;
};
