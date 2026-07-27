import { safeText } from "@/lib/operationsBoard";
import type {
  DashboardOpsStatusFilter,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";
import { matchesStatusFilter } from "@/types/dashboardOpsTypes";

type UnknownRecord = Record<string, unknown>;
export type DeliverySourceFilter = "all" | "subscription" | "one_time_order";
export type DeliveryActionFilter =
  | "all"
  | "needs_action"
  | "ready_to_collect"
  | "out_for_delivery"
  | "no_actions";

export interface DeliveryFilterState {
  search?: string;
  statusFilter?: DashboardOpsStatusFilter;
  sourceFilter?: DeliverySourceFilter;
  windowFilter?: string;
  zoneFilter?: string;
  actionFilter?: DeliveryActionFilter;
}

const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const firstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const text = asString(value);
    if (text) return text;
  }
  return null;
};

const formatAddress = (address: UnknownRecord | null): string | null => {
  const formatted = firstString(address?.formattedAddress, address?.addressSummary);
  if (formatted) return formatted;

  const parts = [
    address?.label,
    address?.district,
    address?.street,
    address?.building ? `مبنى ${address.building}` : null,
    address?.floor ? `دور ${address.floor}` : null,
    address?.apartment ? `شقة ${address.apartment}` : null,
    address?.city,
  ]
    .map((value) => asString(value))
    .filter((value): value is string => Boolean(value));

  return parts.length ? parts.join("، ") : null;
};

export function enrichDeliveryOperationItem(
  item: UnifiedQueueItem
): UnifiedQueueItem {
  const raw = asRecord(item.rawData) ?? {};
  const rawFulfillment = asRecord(raw.fulfillment);
  const rawDelivery =
    asRecord(rawFulfillment?.delivery) ??
    asRecord(raw.delivery) ??
    asRecord(raw.deliveryDetails) ??
    {};
  const address =
    asRecord(item.delivery?.address) ??
    asRecord(rawDelivery.address) ??
    asRecord(raw.deliveryAddress);

  const addressSummary = firstString(
    item.context.addressSummary,
    item.delivery?.addressSummary,
    rawDelivery.addressSummary,
    address?.formattedAddress,
    formatAddress(address)
  );
  const date = firstString(
    item.context.date,
    item.delivery?.date,
    rawDelivery.date,
    raw.scheduledDate,
    raw.businessDate,
    raw.date
  );
  const window = firstString(
    item.context.window,
    item.delivery?.window,
    item.delivery?.deliveryWindow,
    rawDelivery.window,
    rawDelivery.deliveryWindow,
    rawDelivery.deliverySlot,
    rawFulfillment?.deliverySlot,
    raw.deliveryWindow,
    raw.deliverySlot
  );
  const zoneValue = firstString(
    item.delivery?.zone?.name,
    item.delivery?.zone?.id,
    item.delivery?.zoneId,
    asRecord(rawDelivery.zone)?.name,
    asRecord(rawDelivery.zone)?.id,
    rawDelivery.zoneId,
    raw.deliveryZone,
    raw.zoneId
  );
  const addressNotes = firstString(
    item.context.addressNotes,
    address?.notes,
    rawDelivery.addressNotes
  );
  const deliveryStatus = firstString(
    item.delivery?.status,
    rawDelivery.status,
    raw.deliveryStatus,
    raw.status,
    item.status
  );

  return {
    ...item,
    delivery: {
      ...item.delivery,
      ...rawDelivery,
      address: address ?? item.delivery?.address,
      addressSummary,
      date,
      window,
      deliveryWindow: window,
      status: deliveryStatus,
      zone: zoneValue
        ? {
            id: firstString(item.delivery?.zone?.id, rawDelivery.zoneId, zoneValue),
            name: firstString(item.delivery?.zone?.name, asRecord(rawDelivery.zone)?.name, zoneValue),
          }
        : item.delivery?.zone,
    },
    context: {
      ...item.context,
      date,
      window,
      addressSummary,
      addressNotes,
    },
  };
}

export function getAllDeliveryOperationItems(
  items: UnifiedQueueItem[] = []
): UnifiedQueueItem[] {
  return items
    .map(enrichDeliveryOperationItem)
    .filter(
      (item) =>
        item.mode === "delivery" && item.source !== "subscription_pickup_request"
    );
}

export function getDeliveryOperationWindow(item: UnifiedQueueItem): string {
  return firstString(
    item.context.window,
    item.delivery?.window,
    item.delivery?.deliveryWindow,
    item.delivery?.deliverySlot
  ) ?? "";
}

export function getDeliveryOperationZone(item: UnifiedQueueItem): string {
  return firstString(
    item.delivery?.zone?.name,
    item.delivery?.zone?.id,
    item.delivery?.zoneId
  ) ?? "";
}

const normalizeComparable = (value: unknown) =>
  safeText(value, "").trim().toLowerCase();

const hasDeliveryAction = (item: UnifiedQueueItem, actionIds: string[]) => {
  const ids = new Set(actionIds);
  return item.allowedActions?.some((action) => ids.has(action.id));
};

export function matchesDeliveryActionFilter(
  item: UnifiedQueueItem,
  filter: DeliveryActionFilter = "all"
): boolean {
  if (filter === "all") return true;
  if (filter === "needs_action") {
    return Boolean(item.allowedActions?.some((action) => !action.disabled));
  }
  if (filter === "ready_to_collect") {
    return (
      hasDeliveryAction(item, ["dispatch", "pickup", "collect", "courier_pickup"]) ||
      ["ready_for_delivery", "ready_to_collect", "ready_for_pickup"].includes(
        item.status
      )
    );
  }
  if (filter === "out_for_delivery") {
    return ["out_for_delivery", "arriving_soon"].includes(item.status);
  }
  if (filter === "no_actions") {
    return !item.allowedActions?.some((action) => !action.disabled);
  }
  return true;
}

export function matchesDeliverySearch(
  item: UnifiedQueueItem,
  query?: string
): boolean {
  const search = query?.trim().toLowerCase() ?? "";
  if (!search) return true;

  const raw = asRecord(item.rawData);
  const rawDelivery = asRecord(raw?.delivery);
  const address =
    asRecord(item.delivery?.address) ??
    asRecord(raw?.deliveryAddress) ??
    asRecord(rawDelivery?.address);
  const values = [
    item.customer.name,
    item.customer.phone,
    item.reference,
    item.orderNumber,
    item.context.addressSummary,
    item.context.addressNotes,
    getDeliveryOperationWindow(item),
    getDeliveryOperationZone(item),
    item.status,
    item.statusLabel,
    address?.district,
    address?.street,
    address?.building,
    raw?.subscriptionId,
    raw?.subscriptionDayId,
    raw?.orderId,
  ];

  return values.some((value) => normalizeComparable(value).includes(search));
}

export function matchesDeliveryFilters(
  item: UnifiedQueueItem,
  filters: DeliveryFilterState
): boolean {
  const statusFilter = filters.statusFilter ?? "all";
  const sourceFilter = filters.sourceFilter ?? "all";
  const windowFilter = filters.windowFilter ?? "all";
  const zoneFilter = filters.zoneFilter ?? "all";
  const actionFilter = filters.actionFilter ?? "all";

  return (
    (statusFilter === "all" || matchesStatusFilter(item.status, statusFilter)) &&
    (sourceFilter === "all" || item.source === sourceFilter) &&
    (windowFilter === "all" ||
      normalizeComparable(getDeliveryOperationWindow(item)) ===
        normalizeComparable(windowFilter)) &&
    (zoneFilter === "all" ||
      normalizeComparable(getDeliveryOperationZone(item)) ===
        normalizeComparable(zoneFilter)) &&
    matchesDeliveryActionFilter(item, actionFilter) &&
    matchesDeliverySearch(item, filters.search)
  );
}

export function filterDeliveryOperations(
  items: UnifiedQueueItem[],
  filters: DeliveryFilterState
): UnifiedQueueItem[] {
  return items.filter((item) => matchesDeliveryFilters(item, filters));
}

export function filterDeliveryOperationsByQuery(
  items: UnifiedQueueItem[],
  query?: string
): UnifiedQueueItem[] {
  return items.filter((item) => matchesDeliverySearch(item, query));
}
