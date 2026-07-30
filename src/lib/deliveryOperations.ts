import { safeText } from "@/lib/operationsBoard";
import type {
  DashboardOpsStatusFilter,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";

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

const PREPARATION_STATUSES = new Set([
  "scheduled",
  "open",
  "locked",
  "confirmed",
  "preparing",
  "in_preparation",
  "ready_for_delivery",
  "ready_to_collect",
  "ready_for_pickup",
]);
const OUT_FOR_DELIVERY_STATUSES = new Set(["out_for_delivery", "arriving_soon"]);
const DELIVERED_STATUSES = new Set(["delivered", "fulfilled"]);
const CANCELED_STATUSES = new Set([
  "canceled",
  "cancelled",
  "delivery_canceled",
  "failed",
]);

const EASTERN_ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

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

const normalizeDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (digit) => EASTERN_ARABIC_DIGITS[digit] ?? digit);

const normalizeSearchText = (value: unknown) =>
  normalizeDigits(safeText(value, ""))
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[+()\[\]{}.,،/\\:_–—-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeFilterKey = (value: unknown) =>
  normalizeSearchText(value).replace(/\s+/g, "");

const normalizeStatus = (value: unknown) =>
  safeText(value, "").trim().toLowerCase();

function uniqueStrings(values: unknown[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = asString(value);
    if (!text) continue;
    const key = normalizeFilterKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

const formatAddress = (address: UnknownRecord | null): string | null => {
  const formatted = firstString(
    address?.formattedAddress,
    address?.addressSummary,
    address?.line1
  );
  if (formatted) return formatted;

  const parts = [
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
    .map((value) => asString(value))
    .filter((value): value is string => Boolean(value));

  return parts.length ? parts.join("، ") : null;
};

function getRawDelivery(item: UnifiedQueueItem): UnknownRecord {
  const raw = asRecord(item.rawData);
  const rawFulfillment = asRecord(raw?.fulfillment);
  return (
    asRecord(rawFulfillment?.delivery) ??
    asRecord(raw?.delivery) ??
    asRecord(raw?.deliveryDetails) ??
    {}
  );
}

function getDeliveryAddress(item: UnifiedQueueItem): UnknownRecord | null {
  const raw = asRecord(item.rawData);
  const rawDelivery = getRawDelivery(item);
  return (
    asRecord(item.delivery?.address) ??
    asRecord(rawDelivery.address) ??
    asRecord(raw?.deliveryAddress)
  );
}

function isGenericAreaName(value: unknown): boolean {
  const key = normalizeFilterKey(value);
  if (!key) return true;

  return (
    key === "جده" ||
    key === "jeddah" ||
    key.includes("مناطقاخريداخلجده") ||
    key.includes("مناطقأخريداخلجده") ||
    key.includes("otherareasinjeddah") ||
    key.includes("otherareasinsidejeddah") ||
    key === "غيرمحدد" ||
    key === "unknown"
  );
}

function cleanExtractedArea(value: string): string | null {
  const cleaned = value
    .replace(/^[\s:،,\-–—]+|[\s:،,\-–—]+$/g, "")
    .replace(/\s+(?:جدة|جده|jeddah).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : null;
}

function extractNeighborhoodFromAddress(address: UnknownRecord | null): string | null {
  if (!address) return null;

  const candidates = uniqueStrings([
    address.street,
    address.line1,
    address.line2,
    address.formattedAddress,
    address.addressSummary,
    address.notes,
  ]);

  for (const candidate of candidates) {
    const arabicMatch = candidate.match(
      /(?:^|[\s،,;|/\\\-–—])حي\s+([^\n،,;|/\\\-–—]{2,45})/u
    );
    if (arabicMatch?.[1]) {
      const area = cleanExtractedArea(arabicMatch[1]);
      if (area) return area;
    }

    const englishMatch = candidate.match(
      /\b(?:district|neighbou?rhood)\s*[:\-]?\s*([^,;|/\\\-–—]{2,45})/i
    );
    if (englishMatch?.[1]) {
      const area = cleanExtractedArea(englishMatch[1]);
      if (area) return area;
    }
  }

  return null;
}

function getExplicitDeliveryZoneValues(item: UnifiedQueueItem): string[] {
  const raw = asRecord(item.rawData);
  const rawDelivery = getRawDelivery(item);

  return uniqueStrings([
    item.delivery?.zone?.name,
    item.delivery?.zone?.id,
    item.delivery?.zoneId,
    asRecord(rawDelivery.zone)?.name,
    asRecord(rawDelivery.zone)?.id,
    rawDelivery.zoneName,
    rawDelivery.zoneId,
    raw?.deliveryZoneName,
    raw?.deliveryZone,
    raw?.deliveryZoneId,
    raw?.zoneName,
    raw?.zoneId,
  ]);
}

/**
 * Returns the precise customer neighborhood used as the primary UI filter value.
 * A real district wins over a configured broad delivery zone. When historical
 * data stores a generic value such as "مناطق أخرى داخل جدة", the function tries
 * to recover "حي ..." from the street/full address before falling back.
 */
export function getDeliveryOperationZone(item: UnifiedQueueItem): string {
  const address = getDeliveryAddress(item);
  const district = firstString(
    address?.district,
    address?.neighborhood,
    address?.neighbourhood,
    address?.suburb,
    address?.area
  );

  if (district && !isGenericAreaName(district)) return district;

  const extractedNeighborhood = extractNeighborhoodFromAddress(address);
  if (extractedNeighborhood) return extractedNeighborhood;

  if (district) return district;

  return (
    getExplicitDeliveryZoneValues(item)[0] ??
    firstString(address?.city) ??
    ""
  );
}

/**
 * Complete list of values that may identify an item's area. The first value is
 * the precise neighborhood displayed in the dropdown; broad zone aliases remain
 * searchable/matchable for backward compatibility.
 */
export function getDeliveryOperationAreaValues(item: UnifiedQueueItem): string[] {
  const address = getDeliveryAddress(item);
  return uniqueStrings([
    getDeliveryOperationZone(item),
    address?.district,
    address?.neighborhood,
    address?.neighbourhood,
    address?.suburb,
    address?.area,
    ...getExplicitDeliveryZoneValues(item),
    address?.city,
  ]);
}

export function enrichDeliveryOperationItem(
  item: UnifiedQueueItem
): UnifiedQueueItem {
  const raw = asRecord(item.rawData) ?? {};
  const rawFulfillment = asRecord(raw.fulfillment);
  const rawDelivery = getRawDelivery(item);
  const address = getDeliveryAddress(item);

  const addressSummary = firstString(
    item.context.addressSummary,
    item.delivery?.addressSummary,
    rawDelivery.addressSummary,
    address?.formattedAddress,
    address?.line1,
    formatAddress(address)
  );
  const date = firstString(
    item.context.date,
    item.delivery?.date,
    rawDelivery.date,
    raw.scheduledDate,
    raw.fulfillmentDate,
    raw.deliveryDate,
    raw.businessDate,
    raw.date
  );
  const window = firstString(
    item.context.window,
    item.delivery?.window,
    item.delivery?.deliveryWindow,
    item.delivery?.deliverySlot,
    rawDelivery.window,
    rawDelivery.deliveryWindow,
    rawDelivery.deliverySlot,
    rawFulfillment?.deliverySlot,
    raw.deliveryWindow,
    asRecord(raw.deliverySlot)?.window,
    raw.deliverySlot
  );
  const explicitZone = getExplicitDeliveryZoneValues(item)[0] ?? null;
  const addressNotes = firstString(
    item.context.addressNotes,
    address?.notes,
    rawDelivery.addressNotes,
    raw.addressNotes
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
      zone: explicitZone
        ? {
            id: firstString(
              item.delivery?.zone?.id,
              rawDelivery.zoneId,
              raw.deliveryZoneId,
              explicitZone
            ),
            name: firstString(
              item.delivery?.zone?.name,
              asRecord(rawDelivery.zone)?.name,
              rawDelivery.zoneName,
              raw.deliveryZoneName,
              explicitZone
            ),
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
  const raw = asRecord(item.rawData);
  const rawDelivery = getRawDelivery(item);
  return (
    firstString(
      item.context.window,
      item.delivery?.window,
      item.delivery?.deliveryWindow,
      item.delivery?.deliverySlot,
      rawDelivery.window,
      rawDelivery.deliveryWindow,
      rawDelivery.deliverySlot,
      raw?.deliveryWindow,
      asRecord(raw?.deliverySlot)?.window,
      raw?.deliverySlot
    ) ?? ""
  );
}

export function getDeliveryOperationSource(
  item: UnifiedQueueItem
): Exclude<DeliverySourceFilter, "all"> {
  if (
    item.source === "one_time_order" ||
    item.entityType === "order" ||
    item.type === "order"
  ) {
    return "one_time_order";
  }
  return "subscription";
}

export function matchesDeliveryStatusFilter(
  itemStatus: string,
  filter: DashboardOpsStatusFilter = "all"
): boolean {
  if (filter === "all") return true;
  const status = normalizeStatus(itemStatus);

  if (filter === "preparing") return PREPARATION_STATUSES.has(status);
  if (filter === "out_for_delivery") {
    return OUT_FOR_DELIVERY_STATUSES.has(status);
  }
  if (filter === "delivered") return DELIVERED_STATUSES.has(status);
  if (filter === "canceled") return CANCELED_STATUSES.has(status);
  return status === normalizeStatus(filter);
}

export function countDeliveryByStatusFilter(
  items: UnifiedQueueItem[],
  filter: DashboardOpsStatusFilter
): number {
  if (filter === "all") return items.length;
  return items.filter((item) => matchesDeliveryStatusFilter(item.status, filter))
    .length;
}

const hasDeliveryAction = (item: UnifiedQueueItem, actionIds: string[]) => {
  const ids = new Set(actionIds);
  return item.allowedActions?.some(
    (action) => !action.disabled && ids.has(action.id)
  );
};

const hasEnabledAction = (item: UnifiedQueueItem) =>
  Boolean(item.allowedActions?.some((action) => !action.disabled));

export function matchesDeliveryActionFilter(
  item: UnifiedQueueItem,
  filter: DeliveryActionFilter = "all"
): boolean {
  if (filter === "all") return true;
  if (filter === "needs_action") return hasEnabledAction(item);
  if (filter === "ready_to_collect") {
    return (
      hasDeliveryAction(item, [
        "dispatch",
        "pickup",
        "collect",
        "courier_pickup",
      ]) ||
      ["ready_for_delivery", "ready_to_collect", "ready_for_pickup"].includes(
        normalizeStatus(item.status)
      )
    );
  }
  if (filter === "out_for_delivery") {
    return OUT_FOR_DELIVERY_STATUSES.has(normalizeStatus(item.status));
  }
  if (filter === "no_actions") return !hasEnabledAction(item);
  return true;
}

export function matchesDeliverySearch(
  item: UnifiedQueueItem,
  query?: string
): boolean {
  const normalizedQuery = normalizeSearchText(query ?? "");
  if (!normalizedQuery) return true;

  const raw = asRecord(item.rawData);
  const rawDelivery = getRawDelivery(item);
  const address = getDeliveryAddress(item);
  const sourceLabel =
    getDeliveryOperationSource(item) === "one_time_order"
      ? "طلب فردي one time order"
      : "اشتراك subscription";

  const values: unknown[] = [
    item.customer.id,
    item.customer.name,
    item.customer.phone,
    item.reference,
    item.orderNumber,
    item.entityId,
    item.id,
    item.subscriptionDayId,
    item.context.date,
    item.context.addressSummary,
    item.context.addressNotes,
    getDeliveryOperationWindow(item),
    ...getDeliveryOperationAreaValues(item),
    item.status,
    item.statusLabel,
    sourceLabel,
    address?.label,
    address?.formattedAddress,
    address?.addressSummary,
    address?.line1,
    address?.line2,
    address?.district,
    address?.street,
    address?.building,
    address?.floor,
    address?.apartment,
    address?.city,
    address?.notes,
    rawDelivery.addressSummary,
    rawDelivery.zoneName,
    rawDelivery.zoneId,
    raw?.subscriptionId,
    raw?.subscriptionDayId,
    raw?.orderId,
    raw?.deliveryId,
    raw?.deliveryZone,
    raw?.deliveryZoneName,
    raw?.scheduledDate,
    ...(item.allowedActions ?? []).flatMap((action) => [action.id, action.label]),
  ];

  const haystack = normalizeSearchText(
    values.map((value) => safeText(value, "")).join(" ")
  );
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
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
  const normalizedZoneFilter = normalizeFilterKey(zoneFilter);

  return (
    matchesDeliveryStatusFilter(item.status, statusFilter) &&
    (sourceFilter === "all" ||
      getDeliveryOperationSource(item) === sourceFilter) &&
    (windowFilter === "all" ||
      normalizeFilterKey(getDeliveryOperationWindow(item)) ===
        normalizeFilterKey(windowFilter)) &&
    (zoneFilter === "all" ||
      getDeliveryOperationAreaValues(item).some(
        (value) => normalizeFilterKey(value) === normalizedZoneFilter
      )) &&
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
