import { parseApiError } from "@/lib/apiErrors";

export type FulfillmentMethod = "pickup" | "delivery";

export interface ManualDeductionCustomer {
  id: string;
  name: string;
  phone: string;
}

export interface ManualDeductionAddonBalance {
  addonId: string;
  addonPlanId: string;
  name: string;
  category: string;
  purchasedDailyQty: number;
  includedTotalQty: number;
  remainingQty: number;
  totalQty: number;
  purchasedQty: number;
  consumedQty: number;
  reservedQty: number;
}

export interface ManualDeductionSearchSubscription {
  id: string;
  planName: string;
  status: string;
  fulfillmentMethod: FulfillmentMethod;
  totalMeals: number;
  consumedMeals: number;
  remainingMeals: number;
  remainingRegularMeals: number;
  remainingPremiumMeals: number;
  addonBalances: ManualDeductionAddonBalance[];
}

export interface ManualDeductionToday {
  businessDate: string;
  hasDeliveryDeductionToday: boolean;
  lastDeductionAt: string | null;
}

export interface ManualDeductionSearchSuccessResponse {
  status: true;
  data: {
    customer: ManualDeductionCustomer;
    subscription: ManualDeductionSearchSubscription;
    subscriptions: ManualDeductionSearchSubscription[];
    today: ManualDeductionToday;
  };
}

export type ManualDeductionNoResultCode =
  | "CUSTOMER_NOT_FOUND"
  | "SUBSCRIPTION_NOT_FOUND";

export interface ManualDeductionNoResultResponse {
  status: false;
  noResult: {
    code: ManualDeductionNoResultCode;
    message: string;
  };
}

export type ManualDeductionSearchResponse =
  | ManualDeductionSearchSuccessResponse
  | ManualDeductionNoResultResponse;

export interface NormalizedManualDeductionSubscription
  extends ManualDeductionSearchSubscription {
  dailyDeduction: {
    known: boolean;
    blocked: boolean;
    source?: "backend-default" | "session-success" | "backend-rejection";
  };
}

export type NormalizedManualDeductionSearch =
  | {
      kind: "found";
      customer: ManualDeductionCustomer;
      subscriptions: NormalizedManualDeductionSubscription[];
      defaultSubscriptionId: string;
      today: ManualDeductionToday;
    }
  | {
      kind: "customer_not_found";
      message: string;
    }
  | {
      kind: "subscription_not_found";
      message: string;
    };

export interface ManualDeductionAddonPayload {
  addonId: string;
  qty: number;
}

export interface ManualDeductionPayload {
  regularMeals: number;
  premiumMeals: number;
  addons?: ManualDeductionAddonPayload[];
  reason: string;
  notes?: string;
}

export interface ManualDeductionMutationResponse {
  status: true;
  data: {
    subscriptionId: string;
    deducted: {
      regularMeals: number;
      premiumMeals: number;
      total: number;
      addons: ManualDeductionAddonPayload[];
    };
    remaining: {
      regularMeals: number;
      premiumMeals: number;
      totalMeals: number;
      addons: Array<{
        addonId: string;
        remainingQty: number;
      }>;
    };
    businessDate: string;
    fulfillmentMethod: FulfillmentMethod;
  };
}

export interface ManualDeductionHistoryItem {
  id: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  businessDate: string | null;
  deducted: {
    regularMeals: number;
    premiumMeals: number;
    total: number;
    addons: Array<{
      addonId: string;
      qty: number;
      remainingBefore?: number;
      remainingAfter?: number;
    }>;
  };
  before: {
    remainingRegularMeals: number | null;
    remainingPremiumMeals: number | null;
    remainingMeals: number | null;
  };
  after: {
    remainingRegularMeals: number | null;
    remainingPremiumMeals: number | null;
    remainingMeals: number | null;
  };
  fulfillmentMethod: FulfillmentMethod | null;
  actor: {
    id: string | null;
    role: string | null;
  };
  reason: string;
  notes: string;
  createdAt: string | null;
}

export interface ManualDeductionHistoryResponse {
  status: true;
  data: {
    contractVersion: "dashboard_manual_deductions.v1";
    subscriptionId: string;
    count: number;
    items: ManualDeductionHistoryItem[];
  };
}

export type ManualDeductionBlockedMap = Record<
  string,
  "session-success" | "backend-rejection"
>;

export interface DeductionFormAddonValue {
  addonId: string;
  name: string;
  qty: number;
}

export interface DeductionPayloadValues {
  regularMeals: number;
  premiumMeals: number;
  addons: DeductionFormAddonValue[];
  reason: string;
  notes?: string;
}

export const REASON_LABELS: Record<string, string> = {
  cashier_walk_in: "استلام مباشر من الكاشير",
  customer_support_correction: "تصحيح من خدمة العملاء",
  balance_correction: "تصحيح رصيد",
  manual_pickup: "استلام يدوي",
  other: "سبب آخر",
};

export const expectedManualDeductionNoResultCodes = new Set([
  "CUSTOMER_NOT_FOUND",
  "SUBSCRIPTION_NOT_FOUND",
]);

export const isExpectedManualDeductionNoResultCode = (
  code: unknown
): code is ManualDeductionNoResultCode =>
  typeof code === "string" && expectedManualDeductionNoResultCodes.has(code);

export function normalizeManualDeductionSearchResponse(
  response: ManualDeductionSearchResponse,
  blockedBySubscriptionId: ManualDeductionBlockedMap = {}
): NormalizedManualDeductionSearch {
  if ("noResult" in response) {
    return response.noResult.code === "CUSTOMER_NOT_FOUND"
      ? {
          kind: "customer_not_found",
          message: "لم يتم العثور على عميل بهذا الرقم.",
        }
      : {
          kind: "subscription_not_found",
          message: "العميل موجود لكن لا يوجد اشتراك نشط.",
        };
  }

  if (response.status !== true || !response.data) {
    throw new Error("Unexpected manual deduction search response");
  }

  const defaultSubscriptionId = response.data.subscription.id;
  const subscriptions = response.data.subscriptions.map((subscription) => {
    const sessionBlock = blockedBySubscriptionId[subscription.id];
    const isDefault = subscription.id === defaultSubscriptionId;
    const backendBlocked =
      subscription.fulfillmentMethod === "delivery" &&
      isDefault &&
      response.data.today.hasDeliveryDeductionToday;
    const sessionBlocked = subscription.fulfillmentMethod === "delivery" && Boolean(sessionBlock);

    return {
      ...subscription,
      addonBalances: subscription.addonBalances ?? [],
      dailyDeduction: {
        known: isDefault || sessionBlocked,
        blocked: backendBlocked || sessionBlocked,
        source: sessionBlock ?? (isDefault ? "backend-default" : undefined),
      },
    };
  });

  return {
    kind: "found",
    customer: response.data.customer,
    subscriptions,
    defaultSubscriptionId,
    today: response.data.today,
  };
}

const toNonNegativeInteger = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
};

export function buildManualDeductionPayload(
  values: DeductionPayloadValues
): ManualDeductionPayload {
  const regularMeals = toNonNegativeInteger(values.regularMeals);
  const premiumMeals = toNonNegativeInteger(values.premiumMeals);
  const normalizedAddons = values.addons
    .map((addon) => ({
      addonId: addon.addonId,
      qty: toNonNegativeInteger(addon.qty),
    }));
  const reason = values.reason.trim();
  const notes = values.notes?.trim();

  if (
    !Number.isFinite(regularMeals) ||
    !Number.isFinite(premiumMeals) ||
    normalizedAddons.some((addon) => !Number.isFinite(addon.qty))
  ) {
    throw new Error("INVALID_LOCAL_QUANTITY");
  }

  const addons = normalizedAddons.filter((addon) => addon.qty > 0);

  const payload: ManualDeductionPayload = {
    regularMeals,
    premiumMeals,
    reason,
  };

  if (addons.length > 0) payload.addons = addons;
  if (notes) payload.notes = notes;

  return payload;
}

const MANUAL_DEDUCTION_ERROR_FALLBACKS: Record<string, string> = {
  CUSTOMER_NOT_FOUND: "لم يتم العثور على عميل بهذا الرقم.",
  SUBSCRIPTION_NOT_FOUND: "العميل موجود لكن لا يوجد اشتراك نشط.",
  SUBSCRIPTION_NOT_ACTIVE: "الاشتراك غير نشط حالياً ولا يمكن الخصم منه.",
  INVALID_MEAL_COUNT: "عدد الوجبات يجب أن يكون رقماً صحيحاً غير سالب.",
  INVALID_ADDON_COUNT: "كمية الإضافة يجب أن تكون رقماً صحيحاً غير سالب.",
  UNKNOWN_ADDON: "الإضافة المحددة غير موجودة على هذا الاشتراك.",
  INSUFFICIENT_REMAINING_MEALS: "الرصيد الكلي للوجبات غير كافٍ.",
  INSUFFICIENT_REGULAR_MEALS: "رصيد الوجبات العادية غير كافٍ.",
  INSUFFICIENT_PREMIUM_MEALS: "رصيد الوجبات المميزة غير كافٍ.",
  INSUFFICIENT_ADDON_BALANCE: "رصيد إحدى الإضافات غير كافٍ.",
  DELIVERY_ALREADY_DEDUCTED_TODAY: "تم تنفيذ خصم توصيل لهذا الاشتراك اليوم.",
  FORBIDDEN: "ليست لديك صلاحية تنفيذ هذا الإجراء.",
};

export function mapManualDeductionError(
  error: unknown,
  fallbackMessage = "تعذر تنفيذ الخصم اليدوي. حاول مرة أخرى."
) {
  const parsed = parseApiError(error);
  const fallback = parsed.code ? MANUAL_DEDUCTION_ERROR_FALLBACKS[parsed.code] : undefined;
  const hasArabicMessage = /[\u0600-\u06FF]/.test(parsed.message);
  const message =
    hasArabicMessage && parsed.message !== parsed.code ? parsed.message : fallback;

  return {
    message: message ?? fallbackMessage,
    code: parsed.code,
    detail: parsed.code ? `رمز الدعم: ${parsed.code}` : undefined,
  };
}

export const getReasonLabel = (reason: string) =>
  REASON_LABELS[reason] ?? reason;

export const getFulfillmentLabel = (method: FulfillmentMethod | null | undefined) => {
  if (method === "delivery") return "توصيل";
  if (method === "pickup") return "استلام";
  return "غير متاح";
};

export const getAddonName = (
  addonId: string,
  subscription?: Pick<ManualDeductionSearchSubscription, "addonBalances">
) =>
  subscription?.addonBalances.find((addon) => addon.addonId === addonId)?.name ??
  "إضافة";
