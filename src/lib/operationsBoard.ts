import type {
  DashboardOpsActionRequest,
  DashboardOpsListResponse,
  KitchenV2,
  OperationAction,
  OperationEntityType,
  OperationFulfillment,
  OperationSource,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";

export const OPERATIONS_SCREENS = ["kitchen", "pickup", "courier"] as const;

export type OperationsScreen = (typeof OPERATIONS_SCREENS)[number];

export interface OperationsScreenConfig {
  label: string;
  screens: OperationsScreen[];
}

type RawQueueRecord = Record<string, unknown>;

const ALL_OPERATIONS_SCREENS: OperationsScreen[] = [
  "kitchen",
  "pickup",
  "courier",
];

const ROLE_SCREEN_MAP: Record<string, OperationsScreenConfig> = {
  kitchen: { label: "المطبخ والاستلام", screens: ["kitchen", "pickup"] },
  cashier: { label: "العمليات", screens: ALL_OPERATIONS_SCREENS },
  courier: { label: "التوصيل", screens: ["courier"] },
  admin: { label: "جميع العمليات", screens: ALL_OPERATIONS_SCREENS },
  superadmin: { label: "جميع العمليات", screens: ALL_OPERATIONS_SCREENS },
};

const STATUS_LABELS_AR: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  confirmed: "مؤكد",
  in_preparation: "قيد التحضير",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  ready_for_delivery: "جاهز للتوصيل",
  out_for_delivery: "خرج للتوصيل",
  fulfilled: "مكتمل",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  canceled: "ملغي",
  expired: "منتهي",
  no_show: "لم يحضر",
  open: "مفتوح",
};

export function asRecord(value: unknown): RawQueueRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawQueueRecord)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function safeText(value: unknown, fallback = "غير محدد"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";

  const record = asRecord(value);
  if (!record) return fallback;
  return safeText(
    record.ar ??
      record.en ??
      record.displayName ??
      record.label ??
      record.title ??
      asRecord(record.name)?.ar ??
      asRecord(record.name)?.en,
    fallback
  );
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = safeText(value, "");
    if (text) return text;
  }
  return null;
}

function hasArabic(value: string | null | undefined) {
  return Boolean(value && /[\u0600-\u06ff]/.test(value));
}

function statusLabel(status: string, candidate: unknown) {
  const label = firstText(candidate);
  if (hasArabic(label)) return label as string;
  return STATUS_LABELS_AR[status] ?? label ?? status;
}

function normalizeSource(value: unknown): OperationSource {
  const text = asString(value);
  if (text === "one_time_order" || text === "order") return "one_time_order";
  if (text === "pickup_request" || text === "subscription_pickup_request") {
    return "subscription_pickup_request";
  }
  return "subscription";
}

function normalizeEntityType(value: unknown, source: OperationSource): OperationEntityType {
  const text = asString(value);
  if (text === "order" || source === "one_time_order") return "order";
  if (text === "pickup_request" || text === "subscription_pickup_request") {
    return "subscription_pickup_request";
  }
  return "subscription_day";
}

function normalizeMode(record: RawQueueRecord, fulfillment: OperationFulfillment) {
  const rawMode =
    asString(record.mode) ||
    asString(fulfillment.mode) ||
    asString(fulfillment.type) ||
    "delivery";
  return rawMode.includes("pickup") ? "pickup" : "delivery";
}

function normalizeKitchen(value: unknown): KitchenV2 | null {
  const kitchen = asRecord(value);
  if (!kitchen || kitchen.version !== "v2") return null;

  return {
    version: "v2",
    mealCount: asNumber(kitchen.mealCount) ?? 0,
    cards: asArray(kitchen.cards) as KitchenV2["cards"],
    addonGroups: asArray(kitchen.addonGroups) as KitchenV2["addonGroups"],
    warnings: asArray(kitchen.warnings),
  };
}

function isSafeOperationEndpoint(endpoint: string | null | undefined) {
  return Boolean(endpoint?.startsWith("/api/dashboard/ops/actions/"));
}

export function getInvalidActionReason(action: Pick<OperationAction, "endpoint" | "method">) {
  if (!isSafeOperationEndpoint(action.endpoint)) {
    return "إعداد الإجراء غير صحيح: رابط الإجراء غير مدعوم.";
  }
  if (action.method !== "POST" && action.method !== "PUT") {
    return "إعداد الإجراء غير صحيح: طريقة الطلب غير مدعومة.";
  }
  return null;
}

function normalizeAllowedActions(raw: unknown): OperationAction[] {
  return asArray(raw)
    .map((entry) => {
      const action = asRecord(entry);
      const id = asString(action?.id);
      const endpoint = asString(action?.endpoint);
      const method = asString(action?.method)?.toUpperCase();
      if (!action || !id || !endpoint || (method !== "POST" && method !== "PUT")) {
        const fallbackId = id || "invalid-action";
        return {
          id: fallbackId,
          label: safeText(action?.label, fallbackId),
          color: asString(action?.color) || "gray",
          icon: asString(action?.icon) || "",
          endpoint: endpoint || "",
          method: method === "PUT" ? "PUT" : "POST",
          requiresReason: Boolean(action?.requiresReason),
          disabled: true,
          disabledReason: "إعداد الإجراء غير مكتمل من الخادم.",
        } satisfies OperationAction;
      }

      const normalized: OperationAction = {
        id,
        label: safeText(action.label, id),
        color: asString(action.color) || "gray",
        icon: asString(action.icon) || "",
        endpoint,
        method,
        requiresReason: Boolean(action.requiresReason),
      };
      const invalidReason = getInvalidActionReason(normalized);
      if (invalidReason) {
        normalized.disabled = true;
        normalized.disabledReason = invalidReason;
      }
      return normalized;
    })
    .filter((action, index, actions) => {
      return actions.findIndex((entry) => entry.id === action.id) === index;
    });
}

function normalizeCustomer(record: RawQueueRecord) {
  const customer = asRecord(record.customer);
  const phone = asString(customer?.phone) || asString(record.customerPhone) || "";
  const name = asString(customer?.name) || asString(record.customerName) || phone || "عميل";
  return {
    id: asString(customer?.id) || "",
    name,
    phone,
  };
}

function normalizeFulfillment(value: unknown): OperationFulfillment {
  const fulfillment = asRecord(value) || {};
  return {
    ...fulfillment,
    type: asString(fulfillment.type) || asString(fulfillment.mode),
    mode: asString(fulfillment.mode) || asString(fulfillment.type),
    pickup: asRecord(fulfillment.pickup) as OperationFulfillment["pickup"],
    delivery: asRecord(fulfillment.delivery) as OperationFulfillment["delivery"],
    deliverySlot: asString(fulfillment.deliverySlot),
    notes: asString(fulfillment.notes),
    allergies: asString(fulfillment.allergies),
  };
}

function branchName(pickup: RawQueueRecord | null) {
  return (
    firstText(
      pickup?.branchName,
      asRecord(pickup?.branchName)?.ar,
      asRecord(pickup?.branchName)?.en
    ) ||
    asString(pickup?.branchId) ||
    asString(pickup?.locationId) ||
    null
  );
}

function normalizeOrderItems(raw: unknown): UnifiedQueueItem["items"] {
  return asArray(raw).map((entry, index) => {
    const item = asRecord(entry) || {};
    return {
      id: asString(item.id) || asString(item._id) || `item-${index}`,
      productName: asString(item.productName),
      displayName: asString(item.displayName),
      name: asString(item.name),
      quantity: asNumber(item.quantity) ?? asNumber(item.qty) ?? 1,
      notes: asString(item.notes),
      selectedOptions: asArray(item.selectedOptions) as never,
      unitPriceHalala: asNumber(item.unitPriceHalala),
      lineTotalHalala: asNumber(item.lineTotalHalala),
      pricingSnapshot: asRecord(item.pricingSnapshot) as never,
    };
  });
}

export function getScreensForRole(role: string | null | undefined): OperationsScreenConfig {
  if (!role) return { label: "", screens: [] };
  return ROLE_SCREEN_MAP[role] || { label: "", screens: [] };
}

export function getSafeOperationsTab(
  tab: string | undefined,
  visibleScreens: readonly OperationsScreen[]
): OperationsScreen {
  if (tab && visibleScreens.includes(tab as OperationsScreen)) {
    return tab as OperationsScreen;
  }
  return visibleScreens[0] || "kitchen";
}

export function buildOperationsActionPayload(
  item: UnifiedQueueItem,
  _action: string,
  reason?: string,
  notes?: string,
  pickupCode?: string
): DashboardOpsActionRequest {
  const payload =
    reason || notes || pickupCode
      ? {
          ...(reason ? { reason } : {}),
          ...(notes ? { notes } : {}),
          ...(pickupCode ? { pickupCode } : {}),
        }
      : undefined;

  return {
    entityId: item.entityId,
    entityType: item.entityType,
    source: item.source,
    ...(payload ? { payload } : {}),
  };
}

export function getItemsByStatuses(
  items: UnifiedQueueItem[],
  statuses: readonly string[]
): UnifiedQueueItem[] {
  return items.filter((item) => statuses.includes(item.status));
}

export function getPickupItems(items: UnifiedQueueItem[] = []): UnifiedQueueItem[] {
  return items.filter((item) => item.mode === "pickup");
}

export function getCourierItems(items: UnifiedQueueItem[] = []): UnifiedQueueItem[] {
  return items.filter(
    (item) => item.mode === "delivery" && item.source === "subscription"
  );
}

export function normalizeOperationsQueueItem(
  raw: unknown,
  contractVersion?: string
): UnifiedQueueItem {
  const record = asRecord(raw) || {};
  const fulfillment = normalizeFulfillment(record.fulfillment);
  const source = normalizeSource(record.source);
  const entityType = normalizeEntityType(record.entityType, source);
  const entityId =
    asString(record.entityId) ||
    asString(record.id) ||
    asString(record.reference) ||
    "";
  const status = asString(record.status) || "open";
  const pickup = (asRecord(fulfillment.pickup) || asRecord(record.pickup)) as
    | RawQueueRecord
    | null;
  const delivery = asRecord(fulfillment.delivery) as RawQueueRecord | null;
  const kitchen = normalizeKitchen(record.kitchen);
  const orderSummary = asRecord(record.orderSummary);
  const timestamps = asRecord(record.timestamps);
  const mode = normalizeMode(record, fulfillment);
  const customer = normalizeCustomer(record);
  const ui = asRecord(record.ui) || {};
  const reference =
    asString(record.reference) ||
    asString(record.orderNumber) ||
    entityId.slice(-6) ||
    "-";
  const label = statusLabel(status, record.statusLabel);

  return {
    contractVersion,
    id: asString(record.id) || entityId || reference,
    entityId,
    entityType,
    source,
    type:
      entityType === "order"
        ? "order"
        : source === "subscription_pickup_request"
          ? "subscription_pickup_request"
          : "subscription",
    mode,
    reference,
    orderNumber: asString(record.orderNumber),
    status,
    statusLabel: label,
    ui: {
      label,
      badge: asString(ui.badge) || asString(ui.color),
      color: asString(ui.color),
      icon: asString(ui.icon),
    },
    customer,
    fulfillment,
    pickup: pickup as UnifiedQueueItem["pickup"],
    delivery: delivery as UnifiedQueueItem["delivery"],
    kitchen,
    allowedActions: normalizeAllowedActions(record.allowedActions),
    timestamps: {
      createdAt: asString(timestamps?.createdAt) || asString(record.createdAt),
      updatedAt: asString(timestamps?.updatedAt) || asString(record.updatedAt),
      preparedAt: asString(timestamps?.preparedAt),
      fulfilledAt: asString(timestamps?.fulfilledAt),
    },
    paymentStatus: asString(record.paymentStatus) || asString(asRecord(record.payment)?.paymentStatus),
    payment: asRecord(record.payment) as UnifiedQueueItem["payment"],
    pricing: asRecord(record.pricing) as UnifiedQueueItem["pricing"],
    orderSummary: orderSummary as UnifiedQueueItem["orderSummary"],
    items: normalizeOrderItems(record.items),
    plan: asRecord(asRecord(record.subscription)?.plan) as UnifiedQueueItem["plan"],
    dataQuality: asRecord(record.dataQuality) as UnifiedQueueItem["dataQuality"],
    context: {
      date: asString(record.date),
      window:
        mode === "pickup"
          ? asString(pickup?.pickupWindow) || asString(fulfillment.deliverySlot)
          : asString(delivery?.window) ||
            asString(delivery?.deliveryWindow) ||
            asString(fulfillment.deliverySlot),
      addressSummary: asString(delivery?.addressSummary),
      addressNotes: asString(asRecord(delivery?.address)?.notes),
      branch: branchName(pickup),
      pickupCode: asString(pickup?.pickupCode),
      notes: asString(orderSummary?.notes) || asString(fulfillment.notes),
      mealCount: kitchen?.mealCount ?? asNumber(orderSummary?.mealCount) ?? undefined,
      requiredMealCount: kitchen?.mealCount ?? undefined,
    },
    rawData: raw,
  };
}

export function extractOperationsQueueItems(
  response: DashboardOpsListResponse | unknown
): UnifiedQueueItem[] {
  const payload = asRecord(response);
  if (!payload) {
    return Array.isArray(response)
      ? response.map((item) => normalizeOperationsQueueItem(item))
      : [];
  }

  const nested = asRecord(payload.data);
  const contractVersion = asString(nested?.contractVersion);
  const rawItems = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(nested?.items)
      ? nested.items
      : Array.isArray(payload.items)
        ? payload.items
        : [];

  return rawItems.map((item) =>
    normalizeOperationsQueueItem(item, contractVersion || undefined)
  );
}
