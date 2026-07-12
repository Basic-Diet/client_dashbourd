export interface LocalizedName {
  ar: string;
  en: string;
}

export type AddonCategory = "juice" | "snack" | "small_salad" | string;

export interface AddonMenuProduct {
  id: string;
  key?: string;
  name: LocalizedName;
  category?: string;
  image?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface AddonMenuCategory {
  id?: string;
  key: string;
  name: LocalizedName;
  isActive: boolean;
  isVisible?: boolean;
  isAvailable?: boolean;
  productsCount?: number;
}

export interface AddonPlanPrice {
  id?: string;
  _id?: string;
  addonPlanId?: string;
  addonPlanName?: LocalizedName;
  category?: string;
  basePlanId: string;
  basePlanName?: LocalizedName | string;
  daysCount?: number;
  mealsCount?: number;
  priceHalala: number;
  priceSar?: number;
  priceLabel?: string;
  currency?: string;
  isActive: boolean;
}

export interface Addon {
  id?: string;
  _id: string;
  kind?: "item" | "plan" | string;
  name: LocalizedName;
  description: LocalizedName;
  price: number;
  priceHalala: number;
  priceLabel?: string;
  priceSar?: number;
  category: AddonCategory;
  currency: string;
  type: "subscription" | "one_time";
  billingMode?: "per_day" | "per_meal" | string;
  maxPerDay?: number;
  menuProductIds: string[];
  menuCategoryKeys: string[];
  menuCategories: AddonMenuCategory[];
  resolvedMenuProductIds: string[];
  resolvedMenuProductsCount: number;
  menuProductsCount?: number;
  planPricesCount?: number;
  pricingMode?: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  legacyCompatibility?: Record<string, unknown>;
  menuProducts: AddonMenuProduct[];
  planPrices: AddonPlanPrice[];
}

export interface AddonsSummary {
  plansCount: number;
  matrixRowsCount: number;
  currency: string;
}

export interface AddonCategoryOption {
  key: AddonCategory;
  label: LocalizedName;
}

export interface AddonsMeta {
  addonPlanCategories: AddonCategoryOption[];
}

export interface AddonsResponse {
  status: boolean;
  data: Addon[];
  summary: AddonsSummary;
  meta: AddonsMeta;
}

export interface AddonDetailResponse {
  status: boolean;
  data: Addon;
}

export interface AddonPlanWritePayload {
  name: LocalizedName;
  category: AddonCategory;
  maxPerDay?: number;
  isActive?: boolean;
  menuProductIds: string[];
  /** Temporary compatibility field while the backend category-linking rollout is reverted. */
  menuCategoryKeys?: string[];
  planPrices: Array<{
    basePlanId: string;
    priceHalala: number;
    isActive?: boolean;
  }>;
}

export interface CreateAddonPayload extends AddonPlanWritePayload {
  kind?: "item" | "plan" | string;
  description?: LocalizedName;
  priceHalala?: number;
  currency?: string;
  imageUrl?: string;
  imageFile?: File;
  sortOrder?: number;
  type?: "subscription" | "one_time" | string;
  billingMode?: "per_day" | "per_meal" | string;
}

export interface AddonPlanPricesResponse {
  status: boolean;
  data: AddonPlanPrice[];
}

export type AddonPlansResponse = AddonsResponse;

export interface MenuProductPickerItem {
  id: string;
  key?: string;
  name: LocalizedName;
  category?: string;
  image?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface MenuProductPickerResponse {
  status: boolean;
  data: MenuProductPickerItem[];
}

export interface MenuCategoryPickerItem {
  id: string;
  key: string;
  name: LocalizedName;
  isActive: boolean;
  isVisible: boolean;
  isAvailable: boolean;
  productsCount: number;
}

export interface MenuCategoryPickerResponse {
  status: boolean;
  data: MenuCategoryPickerItem[];
}

export interface BasePlanPickerItem {
  id: string;
  name: string;
  daysCount?: number;
  mealsCount?: number;
  isActive: boolean;
}

export interface BasePlanPickerResponse {
  status: boolean;
  data: BasePlanPickerItem[];
}
