export type OperationSource =
  | "subscription"
  | "one_time_order"
  | "subscription_pickup_request";

export type OperationEntityType =
  | "subscription_day"
  | "order"
  | "subscription_pickup_request";

export interface LocalizedText {
  ar?: string | null;
  en?: string | null;
}

export interface OperationUi {
  label?: string | null;
  badge?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface OperationCustomer {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
}

export interface OperationPickup {
  branchName?: string | LocalizedText | null;
  branchId?: string | null;
  locationId?: string | null;
  pickupWindow?: string | null;
  pickupCode?: string | null;
  pickupCodeState?: string | null;
  mealCount?: number | null;
  remainingMeals?: number | null;
}

export interface OperationDelivery {
  addressSummary?: string | null;
  address?: unknown;
  date?: string | null;
  window?: string | null;
  deliveryWindow?: string | null;
  deliverySlot?: string | null;
  status?: string | null;
  zone?: { id?: string | null; name?: string | null } | null;
  zoneId?: string | null;
  courierId?: string | null;
}

export interface OperationFulfillment {
  type?: "pickup" | "delivery" | "home_delivery" | string | null;
  mode?: "pickup" | "delivery" | string | null;
  pickup?: OperationPickup | null;
  delivery?: OperationDelivery | null;
  deliverySlot?: string | null;
  notes?: string | null;
  allergies?: string | null;
}

export type KitchenCardType =
  | "basic_salad"
  | "premium_large_salad"
  | "standard_meal"
  | "premium_meal"
  | "sandwich"
  | "chef_choice"
  | string;

export interface KitchenComponentItem {
  name?: string | LocalizedText | null;
  label?: string | LocalizedText | null;
  grams?: number | null;
  quantity?: number | null;
}

export interface KitchenSaladSummary {
  sectionCount?: number | null;
  itemCount?: number | null;
}

export interface KitchenComponents {
  protein?: KitchenComponentItem | null;
  carbs?: KitchenComponentItem[] | KitchenComponentItem | null;
  product?: KitchenComponentItem | null;
  salad?: KitchenSaladSummary | KitchenComponentItem | null;
}

export interface KitchenSectionItem {
  id?: string | null;
  key?: string | null;
  name?: string | LocalizedText | null;
  nameI18n?: LocalizedText | null;
  quantity?: number | null;
  grams?: number | null;
  productUnitPriceHalala?: number | null;
  payableTotalHalala?: number | null;
}

export interface KitchenSection {
  key?: string | null;
  label?: string | LocalizedText | null;
  labelI18n?: LocalizedText | null;
  title?: string | LocalizedText | null;
  items: KitchenSectionItem[];
}

export interface KitchenCard {
  id?: string | null;
  cardId?: string | null;
  slotIndex?: number | null;
  slotKey?: string | null;
  type: KitchenCardType;
  title?: string | LocalizedText | null;
  titleI18n?: LocalizedText | null;
  imageUrl?: string | null;
  badge?: string | LocalizedText | null;
  quantity?: number | null;
  lines?: string[];
  notes?: string | null;
  components?: KitchenComponents | null;
  sections?: KitchenSection[];
  warnings?: unknown[];
}

export interface KitchenAddonItem {
  productId?: string | null;
  key?: string | null;
  name?: string | LocalizedText | null;
  nameI18n?: LocalizedText | null;
  quantity?: number | null;
  productUnitPriceHalala?: number | null;
  payableTotalHalala?: number | null;
}

export interface KitchenAddonGroup {
  addonPlanId?: string | null;
  balanceBucketId?: string | null;
  label?: string | LocalizedText | null;
  labelI18n?: LocalizedText | null;
  title?: string | LocalizedText | null;
  items: KitchenAddonItem[];
}

export interface KitchenV2 {
  version: "v2";
  mealCount: number;
  cards: KitchenCard[];
  addonGroups: KitchenAddonGroup[];
  warnings: unknown[];
}

export interface OperationAction {
  id: string;
  label: string;
  color?: string;
  icon?: string;
  endpoint: string;
  method: "POST" | "PUT";
  requiresReason?: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
}

export type QueueAction = OperationAction;

export interface SelectedOption {
  groupId?: string | null;
  groupKey?: string | null;
  groupName: string;
  optionId?: string | null;
  optionKey?: string | null;
  optionName: string;
  quantity: number;
  grams?: number | null;
  unitPriceHalala: number;
  totalPriceHalala: number;
  extraWeightUnitGrams: number;
  extraWeightPriceHalala: number;
  lineTotalHalala?: number | null;
  payableTotalHalala?: number | null;
  totalHalala?: number | null;
  pricingSnapshot?: {
    unitPriceHalala?: number | null;
    lineTotalHalala?: number | null;
  } | null;
}

export interface OrderItemPricingSnapshot {
  basePriceHalala?: number | null;
  optionsTotalHalala?: number | null;
  unitPriceHalala?: number | null;
  lineTotalHalala?: number | null;
  currency?: string | null;
  vatIncluded?: boolean | null;
}

export interface OrderOperationItem {
  id?: string | null;
  productName?: string | null;
  displayName?: string | null;
  name?: string | null;
  quantity?: number | null;
  notes?: string | null;
  selectedOptions?: SelectedOption[];
  unitPriceHalala?: number | null;
  lineTotalHalala?: number | null;
  pricingSnapshot?: OrderItemPricingSnapshot | null;
}

export interface OrderPricing {
  baseItemsHalala?: number | null;
  optionsHalala?: number | null;
  subtotalHalala?: number | null;
  deliveryHalala?: number | null;
  discountHalala?: number | null;
  vatHalala?: number | null;
  totalHalala?: number | null;
  currency?: string | null;
  vatIncluded?: boolean | null;
}

export interface OrderPayment {
  paymentStatus?: string | null;
  paymentStatusLabel?: string | LocalizedText | null;
  amountHalala?: number | null;
}

export interface OrderSummary {
  itemCount?: number | null;
  mealCount?: number | null;
  addonCount?: number | null;
  notes?: string | null;
  allergies?: string | null;
}

export interface OperationItem {
  contractVersion?: string;
  id: string;
  entityId: string;
  subscriptionDayId?: string | null;
  entityType: OperationEntityType;
  source: OperationSource;
  type: "subscription" | "order" | "subscription_pickup_request";
  mode: "pickup" | "delivery";
  reference: string;
  orderNumber?: string | null;
  status: string;
  statusLabel: string;
  ui: OperationUi;
  customer: OperationCustomer;
  fulfillment: OperationFulfillment;
  pickup?: OperationPickup | null;
  delivery?: OperationDelivery | null;
  kitchen?: KitchenV2 | null;
  allowedActions: OperationAction[];
  timestamps: {
    createdAt: string | null;
    updatedAt: string | null;
    preparedAt?: string | null;
    fulfilledAt?: string | null;
  };
  paymentStatus?: string | null;
  payment?: OrderPayment | null;
  pricing?: OrderPricing | null;
  orderSummary?: OrderSummary | null;
  items?: OrderOperationItem[];
  mealSlots?: Array<{
    slot?: string | number | null;
    label?: string | null;
    items: Array<{ name?: string | null; quantity?: number | null }>;
  }>;
  notes?: string | null;
  plan?: {
    id?: string | null;
    key?: string | null;
    name?: string | null;
    remainingMeals?: number | null;
    selectedMealsPerDay?: number | null;
    proteinGrams?: number | null;
    portionSize?: string | null;
  } | null;
  dataQuality?: {
    isComplete?: boolean;
    warnings?: Array<{ code?: string; messageAr?: string; messageEn?: string }>;
  } | null;
  context: {
    date: string | null;
    window?: string | null;
    addressSummary?: string | null;
    addressNotes?: string | null;
    branch?: string | null;
    pickupCode?: string | null;
    notes?: string | null;
    mealCount?: number;
    requiredMealCount?: number;
  };
  rawData?: unknown;
}

export type UnifiedQueueItem = OperationItem;

export interface DashboardOpsListResponse {
  status: boolean;
  data?: {
    contractVersion?: string;
    date?: string;
    items: UnifiedQueueItem[];
    filters?: unknown;
  };
  items?: UnifiedQueueItem[];
}

export interface DashboardOpsActionRequest {
  entityId: string;
  entityType: string;
  source?: string;
  payload?: {
    reason?: string;
    pickupCode?: string;
    notes?: string;
  };
}

export interface DashboardOpsActionResponse {
  status: boolean;
  data: UnifiedQueueItem;
}

export type DashboardOpsStatusFilter =
  | "all"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "canceled"
  | "confirmed"
  | "in_preparation"
  | "ready_for_pickup"
  | "fulfilled"
  | "expired"
  | "pending_payment";

const DELIVERED_STATUSES = ["delivered", "fulfilled"];
const CANCELED_STATUSES = ["canceled", "cancelled", "delivery_canceled"];
const PREPARING_STATUSES = ["preparing", "in_preparation"];

export function matchesStatusFilter(
  itemStatus: string,
  filter: DashboardOpsStatusFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "preparing":
      return PREPARING_STATUSES.includes(itemStatus);
    case "out_for_delivery":
      return itemStatus === "out_for_delivery";
    case "delivered":
      return DELIVERED_STATUSES.includes(itemStatus);
    case "canceled":
      return CANCELED_STATUSES.includes(itemStatus);
    default:
      return itemStatus === filter;
  }
}

export function countByFilter(
  items: { status: string }[],
  filter: DashboardOpsStatusFilter
): number {
  if (filter === "all") return items.length;
  return items.filter((i) => matchesStatusFilter(i.status, filter)).length;
}

export const isOneTimeOrder = (item: { source?: string; entityType?: string }) =>
  item.source === "one_time_order" || item.entityType === "order";

export const isSubscriptionDay = (item: { source?: string; entityType?: string }) =>
  item.entityType === "subscription_day" || item.source === "subscription";

export const isPickupRequest = (item: { source?: string; entityType?: string }) =>
  item.entityType === "subscription_pickup_request" ||
  item.source === "subscription_pickup_request";

export type BadgeColorKey = "green" | "red" | "blue" | "orange" | "yellow";

export const BADGE_CLASSES: Record<BadgeColorKey, string> = {
  green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
  red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-400",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
};

export function getBadgeClasses(color: string): string {
  return BADGE_CLASSES[color as BadgeColorKey] || BADGE_CLASSES.blue;
}
