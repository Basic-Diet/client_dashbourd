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
  meta?: { date?: string; total?: number };
};

type CourierDto = Record<string, unknown>;

const asRecord = (value: unknown): CourierDto | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as CourierDto)
    : null;

const asString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
};

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

const responseBusinessDate = (response: CourierDeliveryResponse) => {
  if (response.meta?.date) return response.meta.date;
  if (response.data && !Array.isArray(response.data)) {
    return asString(response.data.date);
  }
  return null;
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
  const formatted = firstString(
    address?.formattedAddress,
    address?.addressSummary,
    address?.line1
  );
  if (formatted) return formatted;

  return [
    address?.label,
    address?.line1,
    address?.line2,
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
  const rawType = firstString(record.source, record.type, record.entityType);
  const source =
    rawType === "one_time_order" || rawType === "order"
      ? "one_time_order"
      : "subscription";
  const address =
    asRecord(record.deliveryAddress) ??
    asRecord(asRecord(record.delivery)?.address) ??
    {};
  const id = String(record.id ?? record.entityId ?? "");
  const entityId = String(record.entityId ?? record.orderId ?? id);
  const mealCount = asNumber(record.mealCount) ?? 0;
  const addonCount = asNumber(record.addonCount) ?? 0;
  const premiumUpgradeCount = asNumber(record.premiumUpgradeCount) ?? 0;
  const normalizedActions = normalizeCourierActions(record.allowedActions);
  const allowedActions = normalizedActions.length
    ? normalizedActions
    : fallbackCourierActionsFor(record, source);
  const addressSummary = formatAddress(address);
  const deliveryWindow = firstString(
    record.deliveryWindow,
    asRecord(record.deliverySlot)?.window,
    record.deliverySlot,
    asRecord(record.delivery)?.window
  );
  const deliveryZone = firstString(
    record.deliveryZoneName,
    record.deliveryZone,
    record.zoneName,
    record.zoneId,
    address.district,
    address.city
  );
  const scheduledDate = firstString(
    record.scheduledDate,
    record.fulfillmentDate,
    record.deliveryDate,
    record.date
  );

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
        id: record.customerId ?? record.userId,
        name: record.customerName,
        phone: record.customerPhone,
      },
      fulfillment: {
        mode: "delivery",
        delivery: {
          deliveryId: id,
          status: record.status,
          date: scheduledDate,
          address,
          addressSummary,
          window: deliveryWindow,
          deliveryWindow,
          zone: deliveryZone
            ? { id: String(deliveryZone), name: String(deliveryZone) }
            : null,
        },
      },
      orderSummary: {
        mealCount,
        addonCount,
        itemCount: mealCount + addonCount + premiumUpgradeCount,
      },
      allowedActions,
      date: scheduledDate,
      timestamps: record.timestamps,
    },
    "courier-v2"
  );

  return {
    ...normalized,
    orderNumber: asString(record.orderNumber),
    subscriptionDayId: asString(record.subscriptionDayId),
    context: {
      ...normalized.context,
      date: scheduledDate,
      window: deliveryWindow,
      addressSummary,
      addressNotes: asString(address.notes),
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
      date: scheduledDate,
      window: deliveryWindow,
      deliveryWindow,
      status: asString(record.status),
      zone: deliveryZone
        ? { id: String(deliveryZone), name: String(deliveryZone) }
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
      deliveryWindow,
      deliveryZone,
      scheduledDate,
    },
  };
};

export const fetchCourierDeliveryList = async (
  date: string
): Promise<DashboardOpsListResponse> => {
  const response = await api.get<CourierDeliveryResponse>(
    "/api/courier/deliveries/today",
    { params: { date } }
  );
  const items = toItems(response.data).map(normalizeCourierItem);
  const firstDate = items.find((item) => item.context.date)?.context.date;
  const businessDate = responseBusinessDate(response.data) || firstDate || date;

  return {
    status: true,
    data: {
      contractVersion: "courier-v2",
      date: businessDate,
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
