export type DashboardSubscriptionSelectionPayload = {
  userId: string;
  planId: string;
  grams: number;
  mealsPerDay: number;
  startDate: string;
  delivery:
    | {
        type: "pickup";
        pickupLocationId: string;
      }
    | {
        type: "delivery";
        zoneId: string;
        window?: string;
        address: {
          label: string;
          line1: string;
          line2?: string;
          city: string;
          district: string;
          lat?: number;
          lng?: number;
          phone?: string;
          notes?: string;
        };
      };
  premiumItems?: Array<{
    premiumKey: string;
    qty: number;
  }>;
  addons?: Array<{
    addonId: string;
    qty: number;
  }>;
  promoCode?: string;
};

export type SubscriptionCreationCustomerSummary = {
  id: string;
  name: string;
  phone?: string;
};

export type DashboardSubscriptionCashCreatePayload =
  DashboardSubscriptionSelectionPayload & {
    payment: {
      method: "cash";
      status: "paid";
      collectedAmountHalala: number;
      paidAt: string;
    };
    source: "dashboard_cashier";
  };

export type DashboardQuoteLineItem = {
  kind?: string;
  type?: string;
  key?: string;
  code?: string;
  label?: string;
  amountHalala?: number;
  valueHalala?: number;
  totalHalala?: number;
  priceHalala?: number;
  currency?: string;
};

export type DashboardSelectionItem = {
  kind?: string;
  type?: string;
  key?: string;
  premiumKey?: string;
  addonId?: string;
  addonPlanId?: string;
  label?: string;
  name?: string | { ar?: string; en?: string };
  value?: string | number;
  qty?: number;
  quantity?: number;
  quantityPerDay?: number;
  billingMode?: string;
  billingUnit?: string;
  selectedOptions?: {
    grams?: number;
    mealsPerDay?: number;
    startDate?: string;
    daysCount?: number;
  };
  amountHalala?: number;
  priceHalala?: number;
  totalHalala?: number;
  unitExtraFeeHalala?: number;
  unitPriceHalala?: number;
  unitPlanPriceHalala?: number;
  priceLabel?: string;
  totalLabel?: string;
  unitPriceLabel?: string;
  currency?: string;
};

export type DashboardSelectionSection = {
  key?: string;
  code?: string;
  title?: string;
  label?: string;
  items?: DashboardSelectionItem[];
};

export type DashboardSubscriptionQuoteResponse = {
  status: true;
  data: {
    plan: unknown;
    selectedOptions: unknown;
    delivery: unknown;
    premiumItems: unknown[];
    addonPlans: unknown[];
    addons?: unknown[];
    subscriptionPrice?: {
      amountHalala: number;
      amountSar: number;
      currency: string;
      label: string;
    };
    subscriptionPriceHalala?: number;
    subscriptionPriceSar?: number;
    pricing?: {
      subscriptionPriceHalala?: number;
      basePlanPriceHalala?: number;
      premiumTotalHalala?: number;
      addonsTotalHalala?: number;
      deliveryFeeHalala?: number;
      discountHalala?: number;
      grossTotalHalala?: number;
      vatPercentage?: number;
      vatHalala?: number;
      totalHalala: number;
      totalPriceHalala?: number;
      currency: string;
      lineItems?: DashboardQuoteLineItem[];
    };
    pricingSummary?: Record<string, unknown>;
    breakdown?: Record<string, unknown>;
    selectionSections?: DashboardSelectionSection[];
    selectionGroups?: {
      subscriptionMeals?: DashboardSelectionSection;
      premiumMeals?: DashboardSelectionSection;
      addonSubscriptions?: DashboardSelectionSection;
    };
    checkoutSummary?: {
      selectionSections?: DashboardSelectionSection[];
      selectionGroups?: unknown;
    };
    quoteSummary?: unknown;
    lineItems?: DashboardQuoteLineItem[];
    totalHalala?: number;
    currency?: string;
    allowedPaymentMethods?: string[];
  };
};

export type DashboardSubscriptionCreateResponse = {
  status: true;
  data: {
    id: string;
    _id?: string;
    displayId?: string;
    status: string;
    plan?: unknown;
    subscriptionPrice?: unknown;
    subscriptionPriceHalala?: number;
    subscriptionPriceSar?: number;
    pricing?: unknown;
    selectionSections?: unknown[];
    selectionGroups?: unknown;
    checkoutSummary?: unknown;
    lineItems?: unknown[];
    balances?: unknown;
    allowedActions?: unknown;
  };
  meta?: {
    createdByAdmin?: boolean;
  };
};

export type BuilderPremiumMealCatalogItem = {
  id: string;
  premiumKey: string;
  name: string | { ar?: string; en?: string };
  imageUrl?: string;
  extraFeeHalala?: number;
  isActive?: boolean;
};

export type BuilderPremiumMealsResponse = {
  status: boolean;
  data: BuilderPremiumMealCatalogItem[];
};

export type SubscriptionAddonPlanCatalogItem = {
  id?: string;
  _id?: string;
  name: { ar?: string; en?: string };
  description?: { ar?: string; en?: string };
  category?: string;
  priceHalala?: number;
  priceSar?: number;
  price?: number;
  currency?: string;
  imageUrl?: string;
  isActive?: boolean;
  planPrices?: Array<{
    basePlanId: string;
    priceHalala?: number;
    priceSar?: number;
    isActive?: boolean;
  }>;
};
