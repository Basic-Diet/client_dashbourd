import api from "@/lib/apis";
import { normalizeOperationsQueueItem } from "@/lib/operationsBoard";
import type {
  DashboardOpsActionRequest,
  DashboardOpsActionResponse,
  DashboardOpsListResponse,
  QueueAction,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";

type CourierDeliveryResponse = {
  status: boolean;
  data?: unknown[] | { items?: unknown[]; date?: string };
};

type CourierDto = Record<string, unknown>;

const asRecord = (value: unknown): CourierDto | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as CourierDto)
    : null;

const asString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toItems = (response: CourierDeliveryResponse): unknown[] => {
  if (Array.isArray(response.data)) return response.data;
  if (response.data && typeof response.data === "object") {
    const items = response.data.items;
    return Array.isArray(items) ? items : [];
  }
  return [];
};

const isSafeCourierEndpoint = (endpoint: string) =>
  endpoint.startsWith("/api/courier/deliveries/") ||
  endpoint.startsWith("/api/courier/orders/");

const normalizeCourierActions = (
  value: unknown
): UnifiedQueueItem["allowedActions"] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<QueueAction[]>((actions, entry) => {
    const action = asRecord(entry);
    const id = asString(action?.id);
    const label = asString(action?.label) || id;
    const endpoint = asString(action?.endpoint);
    const method = asString(action?.method)?.toUpperCase();

    if (!id || !label || !endpoint || (method !== "PUT" && method !== "POST")) {
      return actions;
    }

    const isSafe = isSafeCourierEndpoint(endpoint);
    actions.push({
      id,
      label,
      endpoint,
      method,
      color: asString(action?.color) || undefined,
      icon: asString(action?.icon) || undefined,
      requiresReason: Boolean(action?.requiresReason) || id === "cancel",
      disabled: Boolean(action?.disabled) || !isSafe,
      disabledReason: !isSafe
        ? "رابط الإجراء المرسل من الخادم غير مدعوم."
        : asString(action?.disabledReason),
    });

    return actions;
  }, []);
};

export const fallbackCourierActionsFor = (
  item: CourierDto,
  source: "subscription" | "one_time_order"
): UnifiedQueueItem["allowedActions"] => {
  const id = String(item.id ?? "");
  if (!id) return [];
  const base =
    source === "one_time_order"
      ? `/api/courier/orders/${id}`
      : `/api/courier/deliveries/${id}`;
  const actions: UnifiedQueueItem["allowedActions"] = [];

  if (item.canCourierPickup === true) {
    actions.push({
      id: "pickup",
      label: "استلام للتوصيل",
      endpoint: `${base}/collect`,
      method: "PUT",
    });
  }
  if (item.canMarkArrivingSoon === true) {
    actions.push({
      id: "notify_arrival",
      label: "قريب من العميل",
      endpoint: `${base}/arriving-soon`,
      method: "PUT",
    });
  }
  if (item.canMarkDelivered === true) {
    actions.push({
      id: "fulfill",
      label: "تم التسليم",
      endpoint: `${base}/delivered`,
      method: "PUT",
    });
  }
  if (item.canCancel === true) {
    actions.push({
      id: "cancel",
      label: "تعذر التوصيل",
      endpoint: `${base}/cancel`,
      method: "PUT",
      requiresReason: true,
    });
  }

  return actions;
};

const formatAddress = (address: CourierDto | null) => {
  const formatted = asString(address?.formattedAddress);
  if (formatted) return formatted;
  return [
    address?.label,
    address?.district,
    address?.street,
    address?.building ? `مبنى ${address.building}` : null,
    address?.floor ? `دور ${address.floor}` : null,
    address?.apartment ? `شقة ${address.apartment}` : null,
    address?.city,
  ]
    .map(asString)
    .filter(Boolean)
    .join("، ");
};

const normalizeCourierItem = (item: unknown): UnifiedQueueItem => {
  const record = asRecord(item) ?? {};
  const rawType = asString(record.type);
  const source = rawType === "one_time_order" ? "one_time_order" : "subscription";
  const address = asRecord(record.deliveryAddress);
  const id = String(record.id ?? record.entityId ?? "");
  const entityId = String(record.entityId ?? id);
  const mealCount = asNumber(record.mealCount) ?? 0;
  const addonCount = asNumber(record.addonCount) ?? 0;
  const premiumUpgradeCount = asNumber(record.premiumUpgradeCount) ?? 0;
  const allowedActions = normalizeCourierActions(record.allowedActions);
  const addressSummary = formatAddress(address);

  const normalized = normalizeOperationsQueueItem(
    {
      ...record,
      id,
      entityId,
      entityType: source === "one_time_order" ? "order" : "subscription_day",
      source,
      type: source === "one_time_order" ? "order" : "subscription",
      mode: "delivery",
      reference:
        record.orderNumber ?? record.subscriptionDayId ?? record.entityId ?? id,
      customer: {
        name: record.customerName,
        phone: record.customerPhone,
      },
      fulfillment: {
        mode: "delivery",
        delivery: {
          deliveryId: id,
          status: record.status,
          date: record.scheduledDate,
          address,
          addressSummary,
          window: record.deliveryWindow,
          deliveryWindow: record.deliveryWindow,
          zone: record.deliveryZone
            ? { id: String(record.deliveryZone), name: String(record.deliveryZone) }
            : null,
        },
      },
      orderSummary: {
        mealCount,
        addonCount,
        itemCount: mealCount + addonCount + premiumUpgradeCount,
      },
      allowedActions,
      date: record.scheduledDate,
      timestamps: record.timestamps,
    },
    "courier-v1"
  );

  return {
    ...normalized,
    orderNumber: asString(record.orderNumber),
    subscriptionDayId: asString(record.subscriptionDayId),
    context: {
      ...normalized.context,
      date: asString(record.scheduledDate),
      window: asString(record.deliveryWindow),
      addressSummary,
      addressNotes: asString(address?.notes),
      notes:
        asString(record.cancellationNote) ||
        asString(record.cancellationReason) ||
        normalized.context.notes,
      mealCount,
    },
    delivery: {
      ...normalized.delivery,
      address,
      addressSummary,
      date: asString(record.scheduledDate),
      window: asString(record.deliveryWindow),
      deliveryWindow: asString(record.deliveryWindow),
      status: asString(record.status),
      zone: record.deliveryZone
        ? { id: String(record.deliveryZone), name: String(record.deliveryZone) }
        : null,
    },
    allowedActions,
    rawData: {
      ...record,
      preparationStatus: record.preparationStatus,
      cancellationReason: record.cancellationReason,
      cancellationNote: record.cancellationNote,
      timestamps: record.timestamps,
      premiumUpgradeCount,
      addonCount,
    },
  };
};

export const fetchCourierDeliveryList = async (): Promise<DashboardOpsListResponse> => {
  const response = await api.get<CourierDeliveryResponse>(
    "/api/courier/deliveries/today"
  );
  const items = toItems(response.data).map(normalizeCourierItem);
  const firstDate = items.find((item) => item.context.date)?.context.date;

  return {
    status: true,
    data: {
      contractVersion: "courier-v1",
      date: firstDate || undefined,
      items,
    },
  };
};

export const executeCourierDeliveryAction = async ({
  action,
  payload,
  actionDef,
}: {
  action: string;
  payload: DashboardOpsActionRequest;
  actionDef?: QueueAction;
}): Promise<DashboardOpsActionResponse> => {
  const reason = payload.payload?.reason;
  const notes = payload.payload?.notes;
  const data = reason || notes ? { reason, note: notes } : undefined;

  if (actionDef?.endpoint) {
    if (!isSafeCourierEndpoint(actionDef.endpoint)) {
      throw new Error("Unsupported courier action endpoint");
    }
    const response = await api.request({
      url: actionDef.endpoint,
      method: actionDef.method,
      data,
    });
    return response.data;
  }

  throw new Error(`No backend action endpoint was provided for ${action}`);
};
