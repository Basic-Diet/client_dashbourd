import api from "@/lib/apis";
import {
  isExpectedManualDeductionNoResultCode,
  type ManualDeductionHistoryResponse,
  type ManualDeductionMutationResponse,
  type ManualDeductionPayload as ManualDeductionContractPayload,
  type ManualDeductionSearchResponse,
} from "@/components/pages/manual-deduction/manualDeductionModel";
import type {
  SubscriptionAddonEntitlementsResponse,
  SubscriptionAddonEntitlementPayload,
  SubscriptionBalancesPayload,
  SubscriptionBalancesResponse,
  SubscriptionDeliveryUpdatePayload,
  ExtendSubscriptionPayload,
  SubscriptionDaysResponse,
} from "@/types/subscriptionTypes";
import {
  subscriptionAddonEntitlementsUrl,
  subscriptionAuditUrl,
  subscriptionBalancesUrl,
  subscriptionCancelUrl,
  subscriptionDeliveryUrl,
  subscriptionDaysUrl,
  subscriptionExtendUrl,
  subscriptionLifecycleUrl,
} from "./subscriptionApiContract";

const getErrorCode = (data: unknown) => {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object") {
    const code = (error as Record<string, unknown>).code;
    return typeof code === "string" ? code : undefined;
  }
  return typeof record.code === "string" ? record.code : undefined;
};

export const fetchSubscriptionsSummary = async () => {
  try {
    const response = await api.get("/api/dashboard/subscriptions/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriptions summary:", error);
    throw error;
  }
};

export const fetchSubscriptionsList = async ({
  status,
  page = 1,
  limit = 20,
  q = "",
}: {
  status?: string | null;
  page?: number;
  limit?: number;
  q?: string;
}) => {
  try {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (q) params.append("q", q);

    const response = await api.get(
      `/api/dashboard/subscriptions?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriptions list:", error);
    throw error;
  }
};

export const fetchSubscriptionDetails = async (id: string) => {
  const response = await api.get(`/api/dashboard/subscriptions/${id}`);
  return response.data;
};

export const freezeSubscription = async ({
  id,
  data,
}: {
  id: string;
  data: { startDate: string; days: number };
}) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/freeze`,
    data
  );
  return response.data;
};

export const unfreezeSubscription = async (id: string) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/unfreeze`
  );
  return response.data;
};

export const extendSubscription = async ({
  id,
  data,
}: {
  id: string;
  data: ExtendSubscriptionPayload;
}) => {
  const response = await api.put(subscriptionExtendUrl(id), data);
  return response.data;
};

export const cancelSubscription = async (id: string, reason?: string) => {
  const response = await api.post(subscriptionCancelUrl(id), {
    ...(reason ? { reason } : {}),
  });
  return response.data;
};

export const createSubscription = async (data: Record<string, unknown>) => {
  const response = await api.post("/api/dashboard/subscriptions", data);
  return response.data;
};

export const fetchSubscriptionQuote = async (data: Record<string, unknown>) => {
  const response = await api.post("/api/dashboard/subscriptions/quote", data);
  return response.data;
};

export const skipSubscriptionDay = async (
  subscriptionId: string,
  date: string
) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${subscriptionId}/days/${date}/skip`
  );
  return response.data;
};

export const unskipSubscriptionDay = async (
  subscriptionId: string,
  date: string
) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${subscriptionId}/days/${date}/unskip`
  );
  return response.data;
};

export const fetchSubscriptionAuditLog = async (subscriptionId: string) => {
  const response = await api.get(
    `/api/dashboard/subscriptions/${subscriptionId}/audit-log`
  );
  return response.data;
};

export const fetchSubscriptionAudit = async (subscriptionId: string) => {
  const response = await api.get(subscriptionAuditUrl(subscriptionId));
  return response.data;
};

export const fetchSubscriptionLifecycle = async (subscriptionId: string) => {
  const response = await api.get(subscriptionLifecycleUrl(subscriptionId));
  return response.data;
};

export const fetchSubscriptionDays = async (
  subscriptionId: string
): Promise<SubscriptionDaysResponse> => {
  const response = await api.get<SubscriptionDaysResponse>(
    subscriptionDaysUrl(subscriptionId)
  );
  return response.data;
};

export const fetchSubscriptionDelivery = async (subscriptionId: string) => {
  const response = await api.get(
    `/api/dashboard/subscriptions/${subscriptionId}`
  );
  return response.data;
};

export const updateSubscriptionDelivery = async (
  subscriptionId: string,
  data: SubscriptionDeliveryUpdatePayload
) => {
  const response = await api.put(subscriptionDeliveryUrl(subscriptionId), data);
  return response.data;
};

export const fetchSubscriptionBalances = async (
  subscriptionId: string
): Promise<SubscriptionBalancesResponse> => {
  const response = await api.get<SubscriptionBalancesResponse>(
    subscriptionBalancesUrl(subscriptionId)
  );
  return response.data;
};

export const updateSubscriptionBalances = async (
  subscriptionId: string,
  data: SubscriptionBalancesPayload
): Promise<SubscriptionBalancesResponse> => {
  const response = await api.patch<SubscriptionBalancesResponse>(
    subscriptionBalancesUrl(subscriptionId),
    data
  );
  return response.data;
};

export const fetchSubscriptionAddonEntitlements = async (
  subscriptionId: string
): Promise<SubscriptionAddonEntitlementsResponse> => {
  const response = await api.get<SubscriptionAddonEntitlementsResponse>(
    subscriptionAddonEntitlementsUrl(subscriptionId)
  );
  return response.data;
};

export const replaceSubscriptionAddonEntitlements = async (
  subscriptionId: string,
  addonEntitlements: SubscriptionAddonEntitlementPayload[],
  reason: string
) => {
  const response = await api.patch(
    subscriptionAddonEntitlementsUrl(subscriptionId),
    {
      addonSubscriptions: addonEntitlements,
      entitlements: addonEntitlements,
      addonEntitlements,
      reason,
    }
  );
  return response.data;
};

export const createSubscriptionAddonEntitlement = async (
  subscriptionId: string,
  data: SubscriptionAddonEntitlementPayload & { reason?: string }
) => {
  const current = await fetchSubscriptionAddonEntitlements(subscriptionId);
  const addonEntitlements = [
    ...(current.data?.addonSubscriptions ??
      current.data?.addonEntitlements ??
      []),
    data,
  ].map((row) => ({
    addonId: row.addonId,
    maxPerDay: row.maxPerDay,
  }));

  return replaceSubscriptionAddonEntitlements(
    subscriptionId,
    addonEntitlements,
    data.reason ?? "Dashboard addon entitlement added"
  );
};

export const deleteSubscriptionAddonEntitlement = async (
  subscriptionId: string,
  entitlementId: string,
  reason = "Dashboard addon entitlement removed"
) => {
  const current = await fetchSubscriptionAddonEntitlements(subscriptionId);
  const addonEntitlements = (
    current.data?.addonSubscriptions ??
    current.data?.addonEntitlements ??
    []
  )
    .filter((row: { _id?: string; id?: string; addonId?: string }) => {
      const rowId = row._id ?? row.id ?? row.addonId;
      return rowId !== entitlementId;
    })
    .map((row: { addonId: string; maxPerDay?: number }) => ({
      addonId: row.addonId,
      maxPerDay: row.maxPerDay,
    }));

  return replaceSubscriptionAddonEntitlements(
    subscriptionId,
    addonEntitlements,
    reason
  );
};

export const searchSubscriptionsByPhone = async (
  phone: string
): Promise<ManualDeductionSearchResponse> => {
  const response = await api.get(
    `/api/dashboard/subscriptions/search?phone=${encodeURIComponent(phone)}`,
    {
      validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
    }
  );

  if (response.status === 404) {
    const code = getErrorCode(response.data);
    if (isExpectedManualDeductionNoResultCode(code)) {
      return {
        status: false,
        noResult: {
          code,
          message:
            code === "CUSTOMER_NOT_FOUND"
              ? "لم يتم العثور على عميل بهذا الرقم."
              : "العميل موجود لكن لا يوجد اشتراك نشط.",
        },
      };
    }

    const error = new Error("Unexpected manual deduction search 404");
    Object.assign(error, { response });
    throw error;
  }

  return response.data;
};

export const fetchSubscriptionManualDeductions = async (
  subscriptionId: string
): Promise<ManualDeductionHistoryResponse> => {
  const response = await api.get(
    `/api/dashboard/subscriptions/${subscriptionId}/manual-deductions`
  );
  return response.data;
};

export const manualDeductSubscription = async ({
  id,
  data,
}: {
  id: string;
  data: ManualDeductionContractPayload;
}): Promise<ManualDeductionMutationResponse> => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/manual-deduction`,
    data
  );
  return response.data;
};
