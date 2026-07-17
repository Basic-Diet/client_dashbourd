import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder } from "@/types/dashboardOpsTypes";

type RawRecord = Record<string, unknown>;

export interface OperationsSelectedOption {
  signature: string;
  groupName: string;
  optionName: string;
  optionKey?: string;
  quantity: number;
  priceHalala: number;
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
  lineTotalHalala: number | null;
  basePriceHalala: number | null;
  optionsPriceHalala: number;
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
  modeLabel: string;
  paymentLabel: string;
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

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const direct = asString(value);
    if (direct) return direct;

    const localized = localizedText(value);
    if (localized) return localized;
  }
  return null;
}

function localizedText(value: unknown): string | null {
  const direct = asString(value);
  if (direct) return direct;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  const record = asRecord(value);
  if (!record) return null;

  const name = asRecord(record.name);
  const display = asRecord(record.display);
  return firstString(
    record.ar,
    record.en,
    record.displayName,
    record.titleAr,
    record.title,
    name?.ar,
    name?.en,
    display?.ar,
    display?.en,
    record.label
  );
}

function displayText(value: unknown, fallback: string): string {
  return localizedText(value) || fallback;
}

function normalizedKey(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function readHalala(record: RawRecord | null, keys: string[]): number | null {
  if (!record) return null;
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return Math.round(value);
  }
  return null;
}

function readPriceHalala(record: RawRecord | null): number {
  return (
    readHalala(record, [
      "priceHalala",
      "extraPriceHalala",
      "extraFeeHalala",
      "optionsPriceHalala",
      "optionPriceHalala",
      "lineExtraHalala",
    ]) || 0
  );
}

function formatSar(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "غير محدد";
  return `${(value / 100).toFixed(2)} ر.س`;
}

function getRawRecord(item: UnifiedQueueItem): RawRecord {
  return asRecord(item.rawData) || {};
}

function getOrderSummary(raw: RawRecord, item: UnifiedQueueItem): RawRecord {
  return asRecord(raw.orderSummary) || (asRecord(item.orderSummary) ?? {});
}

function getKitchen(raw: RawRecord, item: UnifiedQueueItem): RawRecord {
  return asRecord(raw.kitchen) || (asRecord(item.kitchen) ?? {});
}

function getFulfillment(raw: RawRecord, item: UnifiedQueueItem): RawRecord {
  return asRecord(raw.fulfillment) || (asRecord(item.fulfillment) ?? {});
}

function getSelectionSource(
  rawItem: RawRecord,
  kitchenMealSlot: unknown
): unknown[] {
  const direct = asArray(rawItem.selectedOptions);
  if (direct.length) return direct;

  const selections = asRecord(rawItem.selections);
  const nested = asArray(selections?.selectedOptions);
  if (nested.length) return nested;

  return asArray(asRecord(kitchenMealSlot)?.selectedOptions);
}

function getOptionGroupName(option: RawRecord): string {
  return (
    firstString(
      option.groupName,
      option.groupLabel,
      option.selectionGroupName,
      option.selectionGroupLabel,
      asRecord(option.group)?.name,
      asRecord(option.group)?.displayName,
      option.categoryName
    ) || "اختيارات"
  );
}

function getOptionName(option: RawRecord, index: number): string {
  return (
    firstString(
      option.optionName,
      option.name,
      option.displayName,
      option.title,
      asRecord(option.option)?.name,
      asRecord(option.option)?.displayName,
      asRecord(option.product)?.name,
      asRecord(option.product)?.displayName,
      option.label
    ) || `اختيار ${index + 1}`
  );
}

function getOptionSignature(option: RawRecord, optionName: string, groupName: string) {
  const groupId = firstString(
    option.groupId,
    option.groupKey,
    option.selectionGroupId,
    asRecord(option.group)?.id,
    asRecord(option.group)?.key
  );
  const optionId = firstString(
    option.optionId,
    option.optionKey,
    asRecord(option.option)?.id,
    asRecord(option.option)?.key,
    asRecord(option.product)?.id,
    asRecord(option.product)?.key,
    option.id,
    option.key
  );
  const quantity = asNumber(option.quantity) ?? asNumber(option.qty) ?? 1;
  const price = readPriceHalala(option);
  const weight =
    asNumber(option.extraWeightGrams) ??
    asNumber(option.weightGrams) ??
    asNumber(option.grams) ??
    null;

  if (groupId && optionId) {
    return `id:${groupId}|${optionId}|q:${quantity}|p:${price}|w:${weight ?? ""}`;
  }

  return `text:${normalizedKey(groupName)}|${normalizedKey(
    firstString(option.optionKey, option.key) || ""
  )}|${normalizedKey(optionName)}|q:${quantity}|p:${price}|w:${weight ?? ""}`;
}

function normalizeSelectedOptions(options: unknown[]): OperationsSelectedOption[] {
  const seen = new Set<string>();
  const normalized: OperationsSelectedOption[] = [];

  options.forEach((entry, index) => {
    const record = asRecord(entry);
    if (!record) return;

    const groupName = getOptionGroupName(record);
    const optionName = getOptionName(record, index);
    const quantity = asNumber(record.quantity) ?? asNumber(record.qty) ?? 1;
    const priceHalala = readPriceHalala(record);
    const weightGrams =
      asNumber(record.extraWeightGrams) ??
      asNumber(record.weightGrams) ??
      asNumber(record.grams) ??
      null;
    const signature = getOptionSignature(record, optionName, groupName);

    if (seen.has(signature)) return;
    seen.add(signature);

    normalized.push({
      signature,
      groupName,
      optionName,
      optionKey: firstString(record.optionKey, record.key) || undefined,
      quantity,
      priceHalala,
      weightGrams,
    });
  });

  return normalized;
}

function groupSelectedOptions(
  options: OperationsSelectedOption[]
): OperationsSelectionGroup[] {
  const groups: OperationsSelectionGroup[] = [];
  const groupIndex = new Map<string, OperationsSelectionGroup>();

  options.forEach((option) => {
    const key = normalizedKey(option.groupName);
    const existing = groupIndex.get(key);
    if (existing) {
      existing.options.push(option);
      return;
    }

    const group = { name: option.groupName, options: [option] };
    groupIndex.set(key, group);
    groups.push(group);
  });

  return groups;
}

function getItemName(rawItem: RawRecord, index: number): string {
  return displayText(
    firstString(
      rawItem.productName,
      rawItem.displayName,
      rawItem.name,
      asRecord(rawItem.product)?.displayName,
      asRecord(rawItem.product)?.name,
      asRecord(rawItem.display)?.titleAr
    ),
    `صنف ${index + 1}`
  );
}

function getPresentedItems(raw: RawRecord, item: UnifiedQueueItem) {
  const rawItems = asArray(raw.items);
  const kitchen = getKitchen(raw, item);
  const kitchenSlots = asArray(kitchen.meals).length
    ? asArray(kitchen.meals)
    : asArray(item.kitchenDetails?.mealSlots);

  const sourceItems = rawItems.length
    ? rawItems
    : item.items?.map((entry) => ({ ...entry })) || [];

  return sourceItems.map((entry, index) => {
    const rawItem = asRecord(entry) || {};
    const selectedOptions = normalizeSelectedOptions(
      getSelectionSource(rawItem, kitchenSlots[index])
    );
    const selectionGroups = groupSelectedOptions(selectedOptions);
    const paidSelections = selectedOptions.filter((option) => option.priceHalala > 0);
    const basePriceHalala = readHalala(rawItem, [
      "basePriceHalala",
      "unitBasePriceHalala",
      "itemPriceHalala",
    ]);
    const lineTotalHalala = readHalala(rawItem, [
      "lineTotalHalala",
      "totalHalala",
      "subtotalHalala",
      "priceHalala",
    ]);
    const optionsPriceHalala =
      readHalala(rawItem, ["optionsPriceHalala", "extrasTotalHalala"]) ??
      selectedOptions.reduce((sum, option) => sum + option.priceHalala, 0);

    return {
      key: firstString(rawItem.id, rawItem._id, rawItem.key) || `item-${index}`,
      name: getItemName(rawItem, index),
      quantity: asNumber(rawItem.quantity) ?? asNumber(rawItem.qty) ?? 1,
      notes: firstString(rawItem.notes, rawItem.comment),
      lineTotalHalala,
      basePriceHalala,
      optionsPriceHalala,
      selectionGroups,
      uniqueSelectionCount: selectedOptions.length,
      paidSelections,
    };
  });
}

function readPricing(raw: RawRecord, items: OperationsPresentedItem[]) {
  const pricing = asRecord(raw.pricing) || {};
  const payment = asRecord(raw.payment) || {};
  const optionsTotal = items.reduce(
    (sum, entry) => sum + entry.optionsPriceHalala,
    0
  );

  return {
    baseItemsHalala:
      readHalala(pricing, ["baseItemsHalala", "itemsTotalHalala", "itemsSubtotalHalala"]) ??
      null,
    optionsHalala:
      readHalala(pricing, ["optionsHalala", "optionsTotalHalala", "extrasTotalHalala"]) ??
      optionsTotal,
    subtotalHalala:
      readHalala(pricing, ["subtotalHalala", "subtotal", "orderSubtotalHalala"]) ??
      null,
    deliveryHalala:
      readHalala(pricing, ["deliveryHalala", "deliveryFeeHalala", "deliveryFee"]) ??
      null,
    discountHalala:
      readHalala(pricing, ["discountHalala", "discountAmountHalala"]) ??
      null,
    vatHalala:
      readHalala(pricing, ["vatHalala", "vatAmountHalala", "taxHalala"]) ??
      null,
    totalHalala:
      readHalala(pricing, ["totalHalala", "finalTotalHalala", "grandTotalHalala"]) ??
      readHalala(payment, ["amountHalala", "totalHalala"]) ??
      readHalala(raw, ["totalHalala", "amountHalala"]) ??
      null,
  };
}

function getPaymentLabel(raw: RawRecord, item: UnifiedQueueItem): string {
  const payment = asRecord(raw.payment) || {};
  return (
    firstString(
      asRecord(payment.paymentStatusLabel)?.ar,
      payment.paymentStatusLabel,
      payment.statusLabel,
      payment.paymentStatus,
      item.paymentStatus,
      item.payment?.paymentStatusLabel,
      item.payment?.paymentStatus
    ) || "غير محدد"
  );
}

function getWindow(raw: RawRecord, item: UnifiedQueueItem): string | null {
  const fulfillment = getFulfillment(raw, item);
  const pickup = asRecord(raw.pickup) || asRecord(fulfillment.pickup);
  const delivery = asRecord(raw.delivery) || asRecord(fulfillment.delivery);
  const context = asRecord(raw.context);

  if (item.mode === "pickup") {
    return firstString(
      pickup?.pickupWindow,
      pickup?.window,
      context?.window,
      item.context?.window,
      delivery?.window,
      delivery?.deliveryWindow
    );
  }

  return firstString(
    delivery?.window,
    delivery?.deliveryWindow,
    context?.window,
    item.context?.window,
    pickup?.pickupWindow
  );
}

function getBranch(raw: RawRecord, item: UnifiedQueueItem): string | null {
  const fulfillment = getFulfillment(raw, item);
  const pickup = asRecord(raw.pickup) || asRecord(fulfillment.pickup);
  const context = asRecord(raw.context);

  return firstString(
    pickup?.branchName,
    asRecord(pickup?.branchName)?.ar,
    asRecord(pickup?.branchName)?.en,
    pickup?.locationName,
    context?.branch,
    item.context?.branch,
    pickup?.branchId,
    pickup?.locationId,
    item.pickup?.branchId,
    item.pickup?.locationId
  );
}

function getFulfillmentPresentation(
  raw: RawRecord,
  item: UnifiedQueueItem,
  orderSummary: RawRecord
): OperationsFulfillmentPresentation {
  const fulfillment = getFulfillment(raw, item);
  const delivery = asRecord(raw.delivery) || asRecord(fulfillment.delivery);
  const context = asRecord(raw.context);
  const destination =
    item.mode === "delivery"
      ? firstString(
          item.context?.addressSummary,
          item.delivery?.addressSummary,
          delivery?.addressSummary,
          asRecord(delivery?.address)?.displayAddressAr,
          asRecord(delivery?.address)?.formattedAddress,
          asRecord(context?.address)?.displayAddressAr
        )
      : getBranch(raw, item);

  return {
    modeLabel: item.mode === "delivery" ? "توصيل" : "استلام",
    destination,
    window: getWindow(raw, item),
    notes: firstString(
      orderSummary.notes,
      raw.notes,
      item.notes,
      item.context?.notes,
      item.context?.addressNotes
    ),
    allergies: firstString(orderSummary.allergies, raw.allergies),
  };
}

export function getOperationsActionKey(
  item: UnifiedQueueItem,
  action: string
): string {
  return `${item.id}:${action}`;
}

export function buildOperationsOrderPresentation(
  item: UnifiedQueueItem
): OperationsOrderPresentation {
  const raw = getRawRecord(item);
  const orderSummary = getOrderSummary(raw, item);
  const items = getPresentedItems(raw, item);
  const pricing = readPricing(raw, items);
  const paidSelections = items.flatMap((entry) => entry.paidSelections);
  const uniqueSelectionCount = items.reduce(
    (sum, entry) => sum + entry.uniqueSelectionCount,
    0
  );
  const selectionGroupCount = items.reduce(
    (sum, entry) => sum + entry.selectionGroups.length,
    0
  );
  const fulfillment = getFulfillmentPresentation(raw, item, orderSummary);
  const customerName =
    firstString(item.customer?.name, asRecord(raw.customer)?.name, raw.customerName) ||
    "عميل بدون اسم";
  const customerPhone =
    firstString(item.customer?.phone, asRecord(raw.customer)?.phone, raw.customerPhone) ||
    "غير محدد";
  const statusLabel = firstString(item.ui?.label, item.statusLabel, item.status) || item.status;
  const actions = item.allowedActions || [];
  const rawAddonCount =
    asArray(raw.addons).length || asArray(item.addonSelections).length;
  const addonCount = asNumber(orderSummary.addonCount) ?? rawAddonCount;
  const searchParts = [
    customerName,
    customerPhone,
    item.reference,
    item.orderNumber,
    statusLabel,
    fulfillment.modeLabel,
    fulfillment.destination,
    fulfillment.window,
    ...items.flatMap((entry) => [
      entry.name,
      entry.notes,
      ...entry.selectionGroups.flatMap((group) => [
        group.name,
        ...group.options.map((option) => option.optionName),
      ]),
      ...entry.paidSelections.map((option) => option.optionName),
    ]),
  ];

  return {
    isOneTimeOrder: isOneTimeOrder(item),
    customerName,
    customerPhone,
    reference: item.reference || item.orderNumber || "غير محدد",
    sourceLabel: isOneTimeOrder(item) ? "طلب فردي" : "اشتراك يومي",
    statusLabel,
    modeLabel: fulfillment.modeLabel,
    paymentLabel: getPaymentLabel(raw, item),
    totalLabel: formatSar(pricing.totalHalala),
    items,
    itemCount:
      asNumber(orderSummary.itemCount) ||
      (items.length ? items.length : asNumber(orderSummary.mealCount) || 0),
    quantityCount: items.reduce((sum, entry) => sum + entry.quantity, 0),
    uniqueSelectionCount,
    selectionGroupCount,
    paidSelections,
    addonCount,
    pricing,
    fulfillment,
    actions,
    searchText: searchParts.filter(Boolean).join(" ").toLowerCase(),
  };
}

export { formatSar as formatOperationsSar };
