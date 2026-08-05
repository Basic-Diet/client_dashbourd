export interface SubscriptionFilters {
  q: string;
  status: string | null;
  from: string | null;
  to: string | null;
}

export interface SubscriptionSummary {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pendingSubscriptions: number;
  expiredSubscriptions: number;
  canceledSubscriptions: number;
  endedSubscriptions: number;
  selectedStatusCount: number | null;
  totalRemainingMeals: number;
}

export interface SubscriptionSummaryResponse {
  status: boolean;
  data: {
    filters: SubscriptionFilters;
    summary: SubscriptionSummary;
  };
}

export interface AddonSubscription {
  addonId: string;
  name: string;
  price: number;
  type: string;
  category?: string;
  entitlementMode?: string;
  maxPerDay?: number;
  _id?: string;
}

export interface ManualDeductionAddonBalance {
  addonId: string;
  name: string;
  remainingQty: number;
  totalQty?: number;
  consumedQty?: number;
}

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

export interface SubscriptionMealBalanceReadModel {
  totalMeals: number;
  displayRemainingMeals: number;
  availableMeals: number;
  reservedMeals: number;
  consumedMeals: number;
  forfeitedMeals: number;
  accountedMeals: number;
  equationDifference: number;
  balanced: boolean;
  projectionApplied: boolean;
  canManualDeduct: boolean;
  manualDeductionMaxMeals: number;
  displaySemantics: string;
  availableSemantics: string;
}

export interface ManualDeductionResponse {
  success?: boolean;
  status?: boolean;
  data: {
    subscriptionId: string;
    deducted?: {
      regularMeals?: number;
      premiumMeals?: number;
      total?: number;
      addons?: ManualDeductionAddonPayload[];
    };
    remaining?: {
      regularMeals?: number;
      premiumMeals?: number;
      totalMeals?: number;
      availableMeals?: number;
      displayRemainingMeals?: number;
      reservedMeals?: number;
      consumedMeals?: number;
      forfeitedMeals?: number;
      addons?: Array<{
        addonId: string;
        remainingQty: number;
      }>;
    };
    balance?: SubscriptionMealBalanceReadModel;
    businessDate?: string;
    fulfillmentMethod?: string;
  };
}

export interface DeliveryAddress {
  line1?: string;
  line2?: string;
  city: string;
  district: string;
  street?: string;
  building?: string;
  apartment?: string;
  notes?: string;
}

export interface DeliverySlot {
  type: string;
  window: string;
  slotId: string;
}

export interface AddonSummaryItem {
  addonId: string;
  name: string;
  purchasedQtyTotal: number;
  remainingQtyTotal: number;
  consumedQtyTotal: number;
  minUnitPriceHalala: number;
  maxUnitPriceHalala: number;
}

export interface PremiumSummaryItem {
  premiumMealId: string | null;
  name: string;
  purchasedQtyTotal: number;
  remainingQtyTotal: number;
  consumedQtyTotal: number;
  minUnitPriceHalala: number;
  maxUnitPriceHalala: number;
}

export interface ContractMeta {
  version: string | null;
  mode: string;
  completeness: string;
  source: string | null;
  isCanonical: boolean;
  isGrandfathered: boolean;
  snapshotAvailable: boolean;
  readMode: string;
  diagnosticsAvailable: boolean;
}

export interface SubscriptionUser {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  isActive: boolean;
}

export interface Subscription {
  _id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  validityEndDate: string;
  canceledAt: string | null;
  totalMeals: number;
  remainingMeals: number;
  availableMeals?: number;
  displayRemainingMeals?: number;
  reservedMeals?: number;
  consumedMeals?: number;
  forfeitedMeals?: number;
  remainingMealsSemantics?: string;
  balance?: SubscriptionMealBalanceReadModel;
  remainingRegularMeals?: number;
  remainingPremiumMeals?: number;
  premiumRemaining: number;
  premiumPrice: number;
  addonSubscriptions: AddonSubscription[];
  addonBalances?: ManualDeductionAddonBalance[];
  selectedGrams: number;
  selectedMealsPerDay: number;
  basePlanPriceHalala: number;
  checkoutCurrency: string;
  fulfillmentMethod?: string;
  deliveryMode: string;
  deliveryAddress: DeliveryAddress | null;
  deliveryZoneId: string | null;
  deliveryZoneName?: string;
  deliveryFeeHalala?: number;
  deliveryWindow?: string;
  deliverySlot?: DeliverySlot;
  skippedCount: number;
  createdAt: string;
  updatedAt: string;
  id: string;
  displayId: string;
  plan: {
    id: string;
    name: string | null;
  };
  planName: string | null;
  premiumSummary: PremiumSummaryItem[];
  addonsSummary: AddonSummaryItem[];
  contractMeta: ContractMeta;
  user: SubscriptionUser;
  userName: string;
  hasDeliveryDeductionToday?: boolean;
}

export interface SubscriptionsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SubscriptionsListResponse {
  status: boolean;
  data: Subscription[];
  meta: SubscriptionsMeta;
  filters: SubscriptionFilters;
}

export interface SubscriptionDetailsResponse {
  status: boolean;
  data: Subscription;
}

export interface FreezeSubscriptionPayload {
  startDate: string;
  days: number;
}

export interface ExtendSubscriptionPayload {
  days: number;
  reason?: string;
}

export interface SubscriptionDeliveryUpdatePayload {
  deliveryMode: "delivery" | "pickup";
  deliveryZoneId?: string;
  deliveryAddress?: {
    line1: string;
    notes?: string;
  };
  deliveryWindow?: string;
  pickupLocationId?: string;
  reason?: string;
}

export interface SubscriptionAddonEntitlementPayload {
  addonId: string;
  maxPerDay?: number;
}

export interface SubscriptionAddonEntitlement {
  id?: string;
  _id?: string;
  addonId: string;
  category?: string;
  name: string;
  purchasedDailyQty?: number;
  includedTotalQty?: number;
  totalHalala?: number;
  maxPerDay?: number;
}

export interface SubscriptionAddonEntitlementsResponse {
  status: boolean;
  data: {
    addonSubscriptions: SubscriptionAddonEntitlement[];
    addonEntitlements?: SubscriptionAddonEntitlement[];
  };
}

export interface SubscriptionDayRecord {
  [key: string]: unknown;
}

export interface SubscriptionDaysResponse {
  status: boolean;
  data: SubscriptionDayRecord[];
}

export interface SubscriptionBalancePremiumRow {
  premiumKey: string;
  proteinId: string | null;
  purchasedQty: number;
  remainingQty: number;
}

export interface SubscriptionBalanceAddonRow {
  addonId: string | null;
  purchasedQty: number;
  remainingQty: number;
}

export interface SubscriptionBalancesPayload {
  premiumBalance?: SubscriptionBalancePremiumRow[];
  addonBalance?: SubscriptionBalanceAddonRow[];
  reason?: string;
}

export interface SubscriptionBalancesResponse {
  status: boolean;
  data: {
    subscriptionId: string;
    balances: {
      premiumBalance: SubscriptionBalancePremiumRow[];
      addonBalance: SubscriptionBalanceAddonRow[];
    };
    premiumBalance: SubscriptionBalancePremiumRow[];
    addonBalance: SubscriptionBalanceAddonRow[];
  };
}
