import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder } from "@/types/dashboardOpsTypes";

type RawRecord = Record<string, unknown>;

const STATUS_LABELS_AR: Record<string, string> = {
  pending_payment: "بانتظار الدفع",
  confirmed: "مؤكد",
  in_preparation: "قيد التحضير",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  ready_for_delivery: "جاهز للتوصيل",
  out_for_delivery: "خرج للتوصيل",
  fulfilled: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
  expired: "منتهي",
  no_show: "لم يحضر",
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
  basePriceHalala: number | null;
  optionsPriceHalala: number;
  unitPriceHalala: number | null;
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

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const direct = asString(value);
    if (direct) return direct;

    const localized = localizedText(value);
    if (localized) return localized;
  }
  return null;
}

function hasArabicText(value: string | null | undefined): boolean {
  return Boolean(value && /[\u0600-\u06ff]/.test(value));
}

function isTechnicalEnum(value: string | null | undefined): boolean {
  return Boolean(value && /^[a-z][a-z0-9_-]*$/i.test(value.trim()));
}

function enumKey(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function normalizeOperationalLabel(
  values: unknown[],
  fallbackMap: Record<string, string>,
  fallback = "غير محدد"
): string {
  const candidates = values
    .map((value) => localizedText(value))
    .filter((value): value is string => Boolean(value));
  const arabicCandidate = candidates.find(hasArabicText);
  if (arabicCandidate) return arabicCandidate;

  for (const candidate of candidates) {
    const mapped = fallbackMap[enumKey(candidate)];
    if (mapped) return mapped;
  }

  const humanCandidate = candidates.find((candidate) => !isTechnicalEnum(candidate));
  return humanCandidate || fallback;
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

function readNestedHalala(record: RawRecord | null, paths: string[]): number | null {
  if (!record) return null;
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      return asRecord(current)?.[key];
    }, record);
    const parsed = asNumber(value);
    if (parsed !== null) return Math.round(parsed);
  }
  return null;
}

function readNestedString(record: RawRecord | null, paths: string[]): string | null {
  if (!record) return null;
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      return asRecord(current)?.[key];
    }, record);
    const parsed = asString(value);
    if (parsed) return parsed;
  }
  return null;
}

function readNestedBoolean(record: RawRecord | null, paths: string[]): boolean | null {
  if (!record) return null;
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((current, key) => {
      return asRecord(current)?.[key];
    }, record);
    const parsed = asBoolean(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function readPriceHalala(record: RawRecord | null): number {
  if (!record) return 0;

  const quantity = asNumber(record.quantity) ?? asNumber(record.qty) ?? 1;
  const total = readHalala(record, ["totalHalala", "totalPriceHalala"]);
  if (total !== null) return total;

  const extraPrice = readHalala(record, ["extraPriceHalala"]);
  if (extraPrice !== null) return Math.round(extraPrice * quantity);

  const unitPrice = readHalala(record, ["unitPriceHalala"]);
  if (unitPrice !== null) return Math.round(unitPrice * quantity);

  return (
    readHalala(record, [
      "extraFeeHalala",
      "priceHalala",
      "optionsPriceHalala",
      "optionPriceHalala",
      "lineExtraHalala",
      "extraWeightPriceHalala",
    ]) || 0
  );
}

function formatSarAr(value: number | null): string {
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
    asNumber(option.extraWeightUnitGrams) ??
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
      asNumber(record.extraWeightUnitGrams) ??
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
  const orderPricing = asRecord(raw.pricing) || {};
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
    const basePriceHalala = readNestedHalala(rawItem, [
      "pricingSnapshot.basePriceHalala",
      "basePriceHalala",
      "productSnapshot.priceHalala",
      "unitBasePriceHalala",
    ]);
    const optionsPriceHalala =
      readNestedHalala(rawItem, [
        "pricingSnapshot.optionsTotalHalala",
        "optionsPriceHalala",
        "extrasTotalHalala",
      ]) ?? selectedOptions.reduce((sum, option) => sum + option.priceHalala, 0);
    const unitPriceHalala = readNestedHalala(rawItem, [
      "pricingSnapshot.unitPriceHalala",
      "unitPriceHalala",
      "unitPrice",
    ]);
    const lineTotalHalala = readNestedHalala(rawItem, [
      "pricingSnapshot.lineTotalHalala",
      "lineTotalHalala",
      "totalHalala",
    ]);
    const currency =
      readNestedString(rawItem, ["pricingSnapshot.currency", "currency"]) ||
      asString(orderPricing.currency) ||
      "SAR";
    const vatIncluded =
      readNestedBoolean(rawItem, ["pricingSnapshot.vatIncluded"]) ??
      asBoolean(orderPricing.vatIncluded);

    return {
      key: firstString(rawItem.id, rawItem._id, rawItem.key) || `item-${index}`,
      name: getItemName(rawItem, index),
      quantity: asNumber(rawItem.quantity) ?? asNumber(rawItem.qty) ?? 1,
      notes: firstString(rawItem.notes, rawItem.comment),
      basePriceHalala,
      optionsPriceHalala,
      unitPriceHalala,
      lineTotalHalala,
      currency,
      vatIncluded,
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
  const derivedBaseItems = items.reduce((sum, entry) => {
    return sum + (entry.basePriceHalala ?? 0) * entry.quantity;
  }, 0);
  const vatIncluded =
    asBoolean(pricing.vatIncluded) ??
    items.find((entry) => entry.vatIncluded !== null)?.vatIncluded ??
    null;

  return {
    baseItemsHalala:
      readHalala(pricing, ["baseItemsHalala", "itemsTotalHalala", "itemsSubtotalHalala"]) ??
      (derivedBaseItems > 0 ? derivedBaseItems : null),
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
    currency: asString(pricing.currency) || items[0]?.currency || "SAR",
    vatIncluded,
  };
}

function getNormalizedPaymentLabel(raw: RawRecord, item: UnifiedQueueItem): string {
  const payment = asRecord(raw.payment) || {};
  return normalizeOperationalLabel(
    [
      asRecord(payment.paymentStatusLabel)?.ar,
      payment.paymentStatusLabel,
      payment.statusLabel,
      payment.paymentStatus,
      item.paymentStatus,
      item.payment?.paymentStatusLabel,
      item.payment?.paymentStatus,
    ],
    PAYMENT_LABELS_AR
  );
}

function getRawPaymentStatus(raw: RawRecord, item: UnifiedQueueItem): string | null {
  const payment = asRecord(raw.payment) || {};
  return firstString(payment.paymentStatus, item.paymentStatus, item.payment?.paymentStatus);
}

function getNormalizedStatusLabel(raw: RawRecord, item: UnifiedQueueItem): string {
  const source = asRecord(raw.source) || {};
  return normalizeOperationalLabel(
    [
      asRecord(source.statusLabel)?.ar,
      source.statusLabel,
      item.ui?.label,
      item.statusLabel,
      source.status,
      item.status,
    ],
    STATUS_LABELS_AR
  );
}

function getOneTimeAddonCount(
  raw: RawRecord,
  item: UnifiedQueueItem,
  orderSummary: RawRecord
): number {
  const summaryCount = asNumber(orderSummary.addonCount);
  if (summaryCount !== null) return summaryCount;

  const rawKitchenDetails = asRecord(raw.kitchenDetails);
  const rawKitchen = asRecord(raw.kitchen);
  const itemKitchenDetails = asRecord(item.kitchenDetails);
  const sources = [
    asArray(raw.addons),
    asArray(rawKitchenDetails?.addons),
    asArray(rawKitchen?.addons),
    asArray(itemKitchenDetails?.addons),
    asArray(item.addonSelections),
  ];
  const firstPopulated = sources.find((entries) => entries.length > 0);
  return firstPopulated?.length || 0;
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
  const statusLabel = getNormalizedStatusLabel(raw, item);
  const rawPaymentStatus = getRawPaymentStatus(raw, item);
  const actions = item.allowedActions || [];
  const addonCount = getOneTimeAddonCount(raw, item, orderSummary);
  const searchParts = [
    customerName,
    customerPhone,
    item.reference,
    item.orderNumber,
    statusLabel,
    item.status,
    rawPaymentStatus,
    getNormalizedPaymentLabel(raw, item),
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
    rawStatus: item.status,
    modeLabel: fulfillment.modeLabel,
    paymentLabel: getNormalizedPaymentLabel(raw, item),
    rawPaymentStatus,
    totalLabel: formatSarAr(pricing.totalHalala),
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

export { formatSarAr as formatOperationsSar };
