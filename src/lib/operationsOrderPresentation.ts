import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder } from "@/types/dashboardOpsTypes";
import { formatOperationsSar } from "@/lib/operationsKitchenV2Presentation";

type RawRecord = Record<string, unknown>;

const STATUS_LABELS_AR: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  confirmed: "مؤكد",
  in_preparation: "قيد التحضير",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  out_for_delivery: "خرج للتوصيل",
  fulfilled: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
  expired: "منتهي",
};

const PAYMENT_LABELS_AR: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  initiated: "بانتظار الدفع",
  pending_payment: "بانتظار الدفع",
  failed: "فشل الدفع",
  cancelled: "ملغي",
  refunded: "مسترجع",
  partially_refunded: "مسترجع جزئياً",
  not_required: "غير مطلوب",
};

export interface OperationsSelectedOption {
  signature: string;
  groupName: string;
  optionName: string;
  optionKey?: string;
  quantity: number;
  paidAmountHalala: number;
  weightGrams: number | null;
}

export interface OperationsSelectionGroup {
  name: string;
  options: OperationsSelectedOption[];
}

export interface OperationsPresentedItem {
  key: string;
  name: string;
  quantity: number;
  notes: string | null;
  basePriceHalala: number | null;
  optionsAmountHalala: number;
  unitAmountHalala: number | null;
  lineTotalHalala: number | null;
  currency: string;
  vatIncluded: boolean | null;
  selectionGroups: OperationsSelectionGroup[];
  uniqueSelectionCount: number;
  paidSelections: OperationsSelectedOption[];
}

export interface OperationsPricingPresentation {
  baseItemsHalala: number | null;
  optionsHalala: number;
  subtotalHalala: number | null;
  deliveryHalala: number | null;
  discountHalala: number | null;
  vatHalala: number | null;
  totalHalala: number | null;
  currency: string;
  vatIncluded: boolean | null;
}

export interface OperationsFulfillmentPresentation {
  modeLabel: string;
  destination: string | null;
  window: string | null;
  notes: string | null;
  allergies: string | null;
}

export interface OperationsOrderPresentation {
  isOneTimeOrder: boolean;
  customerName: string;
  customerPhone: string;
  reference: string;
  sourceLabel: string;
  statusLabel: string;
  rawStatus: string;
  modeLabel: string;
  paymentLabel: string;
  rawPaymentStatus: string | null;
  totalLabel: string;
  items: OperationsPresentedItem[];
  itemCount: number;
  quantityCount: number;
  uniqueSelectionCount: number;
  selectionGroupCount: number;
  paidSelections: OperationsSelectedOption[];
  addonCount: number;
  pricing: OperationsPricingPresentation;
  fulfillment: OperationsFulfillmentPresentation;
  actions: QueueAction[];
  searchText: string;
}

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function localizedText(value: unknown): string | null {
  const direct = asString(value);
  if (direct) return direct;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const record = asRecord(value);
  if (!record) return null;
  return (
    asString(record.ar) ||
    asString(record.en) ||
    asString(record.displayName) ||
    asString(record.title) ||
    asString(record.label) ||
    asString(asRecord(record.name)?.ar) ||
    asString(asRecord(record.name)?.en)
  );
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const text = localizedText(value);
    if (text) return text;
  }
  return null;
}

function hasArabic(value: string | null | undefined): boolean {
  return Boolean(value && /[\u0600-\u06ff]/.test(value));
}

function normalizeLabel(
  labelValues: unknown[],
  canonicalValues: unknown[],
  fallbackMap: Record<string, string>,
  fallback = "غير محدد"
) {
  const labels = labelValues
    .map((value) => localizedText(value))
    .filter((value): value is string => Boolean(value));
  const arabic = labels.find(hasArabic);
  if (arabic) return arabic;

  for (const value of canonicalValues) {
    const key = localizedText(value)?.trim();
    if (!key) continue;
    if (hasArabic(key)) return key;
    const mapped = fallbackMap[key.toLowerCase()];
    if (mapped) return mapped;
  }

  return labels[0] || fallback;
}

function readNested(record: RawRecord | null, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    return asRecord(current)?.[key];
  }, record);
}

function readAmount(record: RawRecord | null, paths: string[]): number | null {
  for (const path of paths) {
    const value = asNumber(readNested(record, path));
    if (value !== null) return Math.round(value);
  }
  return null;
}

function normalizedKey(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function optionAmount(option: RawRecord): number {
  const quantity = asNumber(option.quantity) ?? asNumber(option.qty) ?? 1;
  const total = readAmount(option, [
    "totalPriceHalala",
    "lineTotalHalala",
    "pricingSnapshot.lineTotalHalala",
    "payableTotalHalala",
    "totalHalala",
  ]);
  if (total !== null) return total;
  const unit = readAmount(option, [
    "unitPriceHalala",
    "pricingSnapshot.unitPriceHalala",
    "productUnitPriceHalala",
  ]);
  if (unit !== null) return Math.round(unit * quantity);
  return readAmount(option, ["extraWeightPriceHalala"]) ?? 0;
}

function optionGroupName(option: RawRecord): string {
  return firstString(option.groupName, option.groupLabel, option.categoryName) || "اختيارات";
}

function optionName(option: RawRecord, index: number): string {
  return (
    firstString(option.optionName, option.name, option.displayName, option.title, option.label) ||
    `اختيار ${index + 1}`
  );
}

function optionSignature(option: RawRecord, name: string, group: string) {
  const quantity = asNumber(option.quantity) ?? asNumber(option.qty) ?? 1;
  const amount = optionAmount(option);
  const weight =
    asNumber(option.extraWeightUnitGrams) ??
    asNumber(option.extraWeightGrams) ??
    asNumber(option.weightGrams) ??
    asNumber(option.grams) ??
    null;
  return [
    normalizedKey(group),
    normalizedKey(name),
    quantity,
    amount,
    weight ?? "",
  ].join("|");
}

function normalizeSelectedOptions(options: unknown[]): OperationsSelectedOption[] {
  const seen = new Set<string>();
  const normalized: OperationsSelectedOption[] = [];

  options.forEach((entry, index) => {
    const option = asRecord(entry);
    if (!option) return;
    const groupName = optionGroupName(option);
    const name = optionName(option, index);
    const signature = optionSignature(option, name, groupName);
    if (seen.has(signature)) return;
    seen.add(signature);

    normalized.push({
      signature,
      groupName,
      optionName: name,
      optionKey: asString(option.optionKey) || asString(option.optionId) || undefined,
      quantity: asNumber(option.quantity) ?? asNumber(option.qty) ?? 1,
      paidAmountHalala: optionAmount(option),
      weightGrams:
        asNumber(option.grams) ??
        asNumber(option.extraWeightUnitGrams) ??
        asNumber(option.extraWeightGrams) ??
        asNumber(option.weightGrams) ??
        null,
    });
  });

  return normalized;
}

function groupSelectedOptions(options: OperationsSelectedOption[]) {
  const groups: OperationsSelectionGroup[] = [];
  const byName = new Map<string, OperationsSelectionGroup>();

  options.forEach((option) => {
    const key = normalizedKey(option.groupName);
    const existing = byName.get(key);
    if (existing) {
      existing.options.push(option);
      return;
    }
    const group = { name: option.groupName, options: [option] };
    byName.set(key, group);
    groups.push(group);
  });

  return groups;
}

function itemName(rawItem: RawRecord, index: number): string {
  return (
    firstString(
      rawItem.productName,
      rawItem.displayName,
      rawItem.name,
      asRecord(rawItem.product)?.displayName,
      asRecord(rawItem.product)?.name
    ) || `صنف ${index + 1}`
  );
}

function presentedItems(item: UnifiedQueueItem): OperationsPresentedItem[] {
  return (item.items ?? []).map((entry, index) => {
    const rawItem = entry as unknown as RawRecord;
    const selectedOptions = normalizeSelectedOptions(asArray(rawItem.selectedOptions));
    const selectionGroups = groupSelectedOptions(selectedOptions);
    const basePriceHalala = readAmount(rawItem, [
      "pricingSnapshot.basePriceHalala",
      "basePriceHalala",
      "unitPriceHalala",
    ]);
    const optionsAmountHalala =
      readAmount(rawItem, [
        "pricingSnapshot.optionsTotalHalala",
        "optionsTotalHalala",
        "optionsHalala",
      ]) ?? selectedOptions.reduce((sum, option) => sum + option.paidAmountHalala, 0);
    const unitAmountHalala = readAmount(rawItem, [
      "pricingSnapshot.unitPriceHalala",
      "unitPriceHalala",
    ]);
    const lineTotalHalala = readAmount(rawItem, [
      "pricingSnapshot.lineTotalHalala",
      "lineTotalHalala",
    ]);

    return {
      key: asString(rawItem.id) || `item-${index}`,
      name: itemName(rawItem, index),
      quantity: asNumber(rawItem.quantity) ?? 1,
      notes: asString(rawItem.notes),
      basePriceHalala,
      optionsAmountHalala,
      unitAmountHalala,
      lineTotalHalala,
      currency: firstString(readNested(rawItem, "pricingSnapshot.currency"), item.pricing?.currency) || "SAR",
      vatIncluded:
        asBoolean(readNested(rawItem, "pricingSnapshot.vatIncluded")) ??
        item.pricing?.vatIncluded ??
        null,
      selectionGroups,
      uniqueSelectionCount: selectedOptions.length,
      paidSelections: selectedOptions.filter((option) => option.paidAmountHalala > 0),
    };
  });
}

function readPricing(item: UnifiedQueueItem, items: OperationsPresentedItem[]) {
  const pricing = (item.pricing ?? {}) as RawRecord;
  const payment = (item.payment ?? {}) as RawRecord;
  const derivedBaseItems = items.reduce(
    (sum, entry) => sum + (entry.basePriceHalala ?? 0) * entry.quantity,
    0
  );
  const optionsTotal = items.reduce((sum, entry) => sum + entry.optionsAmountHalala, 0);

  return {
    baseItemsHalala:
      readAmount(pricing, ["baseItemsHalala", "itemsTotalHalala", "itemsSubtotalHalala"]) ??
      (derivedBaseItems > 0 ? derivedBaseItems : null),
    optionsHalala:
      readAmount(pricing, ["optionsHalala", "optionsTotalHalala", "extrasTotalHalala"]) ??
      optionsTotal,
    subtotalHalala: readAmount(pricing, ["subtotalHalala", "orderSubtotalHalala"]),
    deliveryHalala: readAmount(pricing, ["deliveryHalala", "deliveryFeeHalala"]),
    discountHalala: readAmount(pricing, ["discountHalala", "discountAmountHalala"]),
    vatHalala: readAmount(pricing, ["vatHalala", "vatAmountHalala", "taxHalala"]),
    totalHalala:
      readAmount(pricing, ["totalHalala", "finalTotalHalala", "grandTotalHalala"]) ??
      readAmount(payment, ["amountHalala", "totalHalala"]),
    currency: asString(pricing.currency) || "SAR",
    vatIncluded:
      asBoolean(pricing.vatIncluded) ??
      items.find((entry) => entry.vatIncluded !== null)?.vatIncluded ??
      null,
  };
}

function branchDestination(item: UnifiedQueueItem): string | null {
  const pickup = item.fulfillment?.pickup || item.pickup || {};
  return (
    firstString(
      pickup.branchName,
      asRecord(pickup.branchName)?.ar,
      asRecord(pickup.branchName)?.en
    ) ||
    asString(pickup.branchId) ||
    asString(pickup.locationId)
  );
}

function fulfillmentPresentation(
  item: UnifiedQueueItem,
  orderSummary: RawRecord
): OperationsFulfillmentPresentation {
  const delivery = item.fulfillment?.delivery;
  const destination =
    item.mode === "delivery"
      ? firstString(delivery?.addressSummary, asRecord(delivery?.address)?.displayAddressAr)
      : branchDestination(item);

  return {
    modeLabel: item.mode === "delivery" ? "توصيل" : "استلام",
    destination,
    window:
      item.mode === "pickup"
        ? firstString(
            item.fulfillment?.pickup?.pickupWindow,
            item.context.window,
            item.fulfillment?.deliverySlot
          )
        : firstString(delivery?.window, delivery?.deliveryWindow, item.fulfillment?.deliverySlot),
    notes: firstString(orderSummary.notes, item.context.notes, item.fulfillment?.notes),
    allergies: firstString(orderSummary.allergies, item.fulfillment?.allergies),
  };
}

function customerName(item: UnifiedQueueItem) {
  return item.customer?.name || item.customer?.phone || "عميل";
}

export function getOperationsActionKey(item: UnifiedQueueItem, action: string): string {
  return `${item.id}:${action}`;
}

export function buildOperationsOrderPresentation(
  item: UnifiedQueueItem
): OperationsOrderPresentation {
  const orderSummary = (item.orderSummary ?? {}) as RawRecord;
  const items = presentedItems(item);
  const pricing = readPricing(item, items);
  const paidSelections = items.flatMap((entry) => entry.paidSelections);
  const uniqueSelectionCount = items.reduce(
    (sum, entry) => sum + entry.uniqueSelectionCount,
    0
  );
  const selectionGroupCount = items.reduce(
    (sum, entry) => sum + entry.selectionGroups.length,
    0
  );
  const fulfillment = fulfillmentPresentation(item, orderSummary);
  const statusLabel = normalizeLabel(
    [item.statusLabel],
    [item.status],
    STATUS_LABELS_AR,
    item.status
  );
  const rawPaymentStatus = firstString(item.paymentStatus, item.payment?.paymentStatus);
  const paymentLabel = normalizeLabel(
    [item.payment?.paymentStatusLabel],
    [rawPaymentStatus],
    PAYMENT_LABELS_AR
  );
  const searchParts = [
    customerName(item),
    item.customer?.phone,
    item.reference,
    item.orderNumber,
    statusLabel,
    item.status,
    paymentLabel,
    fulfillment.destination,
    fulfillment.window,
    ...items.flatMap((entry) => [
      entry.name,
      entry.notes,
      ...entry.selectionGroups.flatMap((group) => [
        group.name,
        ...group.options.map((option) => option.optionName),
      ]),
    ]),
  ];

  return {
    isOneTimeOrder: isOneTimeOrder(item),
    customerName: customerName(item),
    customerPhone: item.customer?.phone || "غير محدد",
    reference: item.reference || item.orderNumber || "غير محدد",
    sourceLabel: isOneTimeOrder(item) ? "طلب فردي" : "اشتراك يومي",
    statusLabel,
    rawStatus: item.status,
    modeLabel: fulfillment.modeLabel,
    paymentLabel,
    rawPaymentStatus,
    totalLabel: formatOperationsSar(pricing.totalHalala) || "غير محدد",
    items,
    itemCount:
      (orderSummary.itemCount as number | undefined) ||
      (items.length ? items.length : (orderSummary.mealCount as number | undefined) || 0),
    quantityCount: items.reduce((sum, entry) => sum + entry.quantity, 0),
    uniqueSelectionCount,
    selectionGroupCount,
    paidSelections,
    addonCount: (orderSummary.addonCount as number | undefined) || 0,
    pricing,
    fulfillment,
    actions: item.allowedActions || [],
    searchText: searchParts.filter(Boolean).join(" ").toLowerCase(),
  };
}

export { formatOperationsSar };
