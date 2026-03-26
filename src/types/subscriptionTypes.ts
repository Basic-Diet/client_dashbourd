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
  premiumRemaining: number;
  premiumPrice: number;
  addonSubscriptions: AddonSubscription[];
  selectedGrams: number;
  selectedMealsPerDay: number;
  basePlanPriceHalala: number;
  checkoutCurrency: string;
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
