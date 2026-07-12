import api from "@/lib/apis";
import type {
  Addon,
  AddonCategoryOption,
  AddonMenuCategory,
  AddonMenuProduct,
  AddonPlanPrice,
  AddonPlanPricesResponse,
  AddonPlanWritePayload,
  AddonPlansResponse,
  AddonsResponse,
  BasePlanPickerItem,
  BasePlanPickerResponse,
  LocalizedName,
  MenuCategoryPickerItem,
  MenuCategoryPickerResponse,
  MenuProductPickerItem,
  MenuProductPickerResponse,
} from "@/types/addonTypes";

const FALLBACK_CATEGORIES: AddonCategoryOption[] = [
  { key: "juice", label: { ar: "اشتراك العصير", en: "Juice subscription" } },
  { key: "snack", label: { ar: "اشتراك السناك", en: "Snack subscription" } },
  {
    key: "small_salad",
    label: { ar: "اشتراك السلطة الصغيرة", en: "Small salad subscription" },
  },
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asLocalized = (value: unknown): LocalizedName => {
  const record = asRecord(value);
  if (Object.keys(record).length > 0) {
    return {
      ar: String(record.ar ?? record.arabic ?? record.name_ar ?? ""),
      en: String(record.en ?? record.english ?? record.name_en ?? ""),
    };
  }

  return {
    ar: typeof value === "string" ? value : "",
    en: typeof value === "string" ? value : "",
  };
};

const extractCollection = (payload: unknown, preferredKey: string): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  if (Array.isArray(record.data)) return record.data;

  const data = asRecord(record.data);
  const preferred = data[preferredKey] ?? record[preferredKey];
  if (Array.isArray(preferred)) return preferred;

  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.docs)) return data.docs;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.addons)) return data.addons;
  if (Array.isArray(record.items)) return record.items;
  if (Array.isArray(record.docs)) return record.docs;
  if (Array.isArray(record.rows)) return record.rows;

  return [];
};

const normalizePlanPrice = (value: unknown): AddonPlanPrice => {
  const price = asRecord(value);
  const basePlanName = price.basePlanName;

  return {
    id: price.id === undefined ? undefined : String(price.id),
    _id: price._id === undefined ? undefined : String(price._id),
    addonPlanId:
      price.addonPlanId === undefined ? undefined : String(price.addonPlanId),
    addonPlanName:
      price.addonPlanName === undefined
        ? undefined
        : asLocalized(price.addonPlanName),
    category: price.category === undefined ? undefined : String(price.category),
    basePlanId: String(price.basePlanId ?? ""),
    basePlanName:
      typeof basePlanName === "string"
        ? basePlanName
        : Object.keys(asRecord(basePlanName)).length > 0
          ? asLocalized(basePlanName)
          : undefined,
    daysCount:
      price.daysCount === undefined ? undefined : asNumber(price.daysCount),
    mealsCount:
      price.mealsCount === undefined ? undefined : asNumber(price.mealsCount),
    priceHalala: asNumber(price.priceHalala),
    priceSar:
      price.priceSar === undefined
        ? asNumber(price.priceHalala) / 100
        : asNumber(price.priceSar),
    priceLabel:
      price.priceLabel === undefined ? undefined : String(price.priceLabel),
    currency: price.currency === undefined ? "SAR" : String(price.currency),
    isActive: price.isActive !== false,
  };
};

const normalizeMenuProduct = (value: unknown): AddonMenuProduct => {
  const product = asRecord(value);
  const id = String(product.id ?? product._id ?? "");

  return {
    id,
    key: product.key === undefined ? undefined : String(product.key),
    name: asLocalized(product.name),
    category: product.category === undefined ? undefined : String(product.category),
    image:
      product.image === undefined
        ? product.imageUrl === undefined
          ? undefined
          : String(product.imageUrl)
        : String(product.image),
    imageUrl:
      product.imageUrl === undefined
        ? product.image === undefined
          ? undefined
          : String(product.image)
        : String(product.imageUrl),
    isActive: product.isActive !== false,
  };
};

const normalizeMenuCategory = (value: unknown): AddonMenuCategory => {
  const category = asRecord(value);
  return {
    id:
      category.id === undefined && category._id === undefined
        ? undefined
        : String(category.id ?? category._id),
    key: String(category.key ?? ""),
    name: asLocalized(category.name),
    isActive: category.isActive !== false,
    isVisible:
      category.isVisible === undefined ? undefined : category.isVisible !== false,
    isAvailable:
      category.isAvailable === undefined ? undefined : category.isAvailable !== false,
    productsCount:
      category.productsCount === undefined
        ? undefined
        : asNumber(category.productsCount),
  };
};

const normalizeAddon = (value: unknown): Addon => {
  const addon = asRecord(value);
  const legacy = asRecord(addon.legacyCompatibility);
  const id = String(addon.id ?? addon._id ?? "");
  const planPrices = asArray(addon.planPrices).map(normalizePlanPrice);
  const menuProducts = asArray(addon.menuProducts).map(normalizeMenuProduct);
  const menuCategories = asArray(addon.menuCategories)
    .map(normalizeMenuCategory)
    .filter((category) => category.key);
  const explicitMenuProductIds = asArray(addon.menuProductIds)
    .map((item) => String(item))
    .filter(Boolean);
  const menuCategoryKeys = asArray(addon.menuCategoryKeys)
    .map((item) => String(item))
    .filter(Boolean);
  const resolvedMenuProductIds = asArray(addon.resolvedMenuProductIds)
    .map((item) => String(item))
    .filter(Boolean);
  const displayMenuProductIds =
    explicitMenuProductIds.length > 0
      ? explicitMenuProductIds
      : resolvedMenuProductIds.length > 0
        ? resolvedMenuProductIds
        : menuProducts.map((item) => item.id).filter(Boolean);
  const resolvedMenuProductsCount = asNumber(
    addon.resolvedMenuProductsCount,
    resolvedMenuProductIds.length || displayMenuProductIds.length
  );
  const priceHalala = asNumber(
    addon.priceHalala ??
      legacy.priceHalala ??
      addon.price_halala ??
      planPrices[0]?.priceHalala
  );

  return {
    ...(addon as Partial<Addon>),
    id,
    _id: String(addon._id ?? id),
    name: asLocalized(addon.name),
    description: asLocalized(addon.description),
    price: asNumber(addon.price ?? addon.priceSar ?? priceHalala / 100),
    priceHalala,
    priceLabel:
      addon.priceLabel === undefined ? undefined : String(addon.priceLabel),
    priceSar:
      addon.priceSar === undefined ? priceHalala / 100 : asNumber(addon.priceSar),
    category: String(addon.category ?? "snack"),
    currency: String(addon.currency ?? legacy.currency ?? "SAR"),
    type: "subscription",
    billingMode:
      addon.billingMode === undefined ? "per_day" : String(addon.billingMode),
    maxPerDay: asNumber(addon.maxPerDay, 1),
    menuProductIds: displayMenuProductIds,
    menuCategoryKeys,
    menuCategories,
    resolvedMenuProductIds,
    resolvedMenuProductsCount,
    menuProductsCount:
      addon.menuProductsCount === undefined
        ? resolvedMenuProductsCount || menuProducts.length
        : asNumber(addon.menuProductsCount),
    planPricesCount:
      addon.planPricesCount === undefined
        ? planPrices.length
        : asNumber(addon.planPricesCount),
    imageUrl: String(addon.imageUrl ?? addon.image ?? ""),
    isActive: addon.isActive !== false,
    sortOrder: asNumber(addon.sortOrder),
    createdAt: String(addon.createdAt ?? ""),
    updatedAt: String(addon.updatedAt ?? ""),
    menuProducts,
    planPrices,
  };
};

const normalizeCategories = (payload: unknown): AddonCategoryOption[] => {
  const data = asRecord(asRecord(payload).data);
  const meta = asRecord(data.meta ?? asRecord(payload).meta);
  const categories = asArray(meta.addonPlanCategories)
    .map((item) => {
      const category = asRecord(item);
      const key = String(category.key ?? "");
      if (!key) return null;

      return {
        key,
        label: asLocalized(category.label),
      };
    })
    .filter((item): item is AddonCategoryOption => item !== null);

  return categories.length > 0 ? categories : FALLBACK_CATEGORIES;
};

const normalizeAddonsResponse = (payload: unknown): AddonsResponse => {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const plans = extractCollection(payload, "plans").map(normalizeAddon);
  const summary = asRecord(data.summary ?? record.summary);

  return {
    status: record.status !== false,
    data: plans,
    summary: {
      plansCount: asNumber(summary.plansCount, plans.length),
      matrixRowsCount: asNumber(
        summary.matrixRowsCount,
        plans.reduce((total, plan) => total + plan.planPrices.length, 0)
      ),
      currency: String(summary.currency ?? plans[0]?.currency ?? "SAR"),
    },
    meta: {
      addonPlanCategories: normalizeCategories(payload),
    },
  };
};

const normalizeProductPickerResponse = (
  payload: unknown
): MenuProductPickerResponse => ({
  status: asRecord(payload).status !== false,
  data: extractCollection(payload, "items").map((item): MenuProductPickerItem => {
    const product = normalizeMenuProduct(item);
    return {
      id: product.id,
      key: product.key,
      name: product.name,
      category: product.category,
      image: product.image,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
    };
  }),
});

const normalizeCategoryPickerResponse = (
  payload: unknown
): MenuCategoryPickerResponse => ({
  status: asRecord(payload).status !== false,
  data: extractCollection(payload, "items")
    .map((item): MenuCategoryPickerItem => {
      const category = asRecord(item);
      return {
        id: String(category.id ?? category._id ?? ""),
        key: String(category.key ?? ""),
        name: asLocalized(category.name),
        isActive: category.isActive !== false,
        isVisible: category.isVisible !== false,
        isAvailable: category.isAvailable !== false,
        productsCount: asNumber(category.productsCount),
      };
    })
    .filter((category) => category.key),
});

const normalizeBasePlanPickerResponse = (
  payload: unknown
): BasePlanPickerResponse => ({
  status: asRecord(payload).status !== false,
  data: extractCollection(payload, "items").map((item): BasePlanPickerItem => {
    const plan = asRecord(item);
    const name = plan.name;
    const id = String(plan.id ?? plan._id ?? "");

    return {
      id,
      name:
        typeof name === "string"
          ? name
          : asLocalized(name).ar || asLocalized(name).en || id,
      daysCount: plan.daysCount === undefined ? undefined : asNumber(plan.daysCount),
      mealsCount:
        plan.mealsCount === undefined
          ? plan.mealsPerDay === undefined
            ? undefined
            : asNumber(plan.mealsPerDay)
          : asNumber(plan.mealsCount),
      isActive: plan.isActive !== false && plan.active !== false,
    };
  }).filter((plan) => plan.id),
});

export const fetchAddons = async (): Promise<AddonsResponse> => {
  const response = await api.get("/api/dashboard/addons");
  return normalizeAddonsResponse(response.data);
};

export const fetchAddonPlans = async (): Promise<AddonPlansResponse> => {
  return fetchAddons();
};

export const fetchAddonPrices =
  async (): Promise<AddonPlanPricesResponse> => {
    const response = await fetchAddons();
    return {
      status: response.status,
      data: response.data.flatMap((plan) =>
        plan.planPrices.map((price) => ({
          ...price,
          addonPlanId: plan.id || plan._id,
          addonPlanName: plan.name,
          category: plan.category,
        }))
      ),
    };
  };

export const fetchAddonItems = async (): Promise<AddonsResponse> => {
  return fetchAddons();
};

export const fetchAddonProductPicker =
  async (): Promise<MenuProductPickerResponse> => {
    const response = await api.get(
      "/api/dashboard/menu/products?view=picker&availableFor=subscription&isVisible=true&isAvailable=true&limit=100"
    );
    return normalizeProductPickerResponse(response.data);
  };

export const fetchAddonCategoryPicker =
  async (): Promise<MenuCategoryPickerResponse> => {
    const response = await api.get(
      "/api/dashboard/menu/categories?view=picker&availableFor=subscription&isVisible=true&isAvailable=true&limit=100"
    );
    return normalizeCategoryPickerResponse(response.data);
  };

export const fetchAddonBasePlanPicker =
  async (): Promise<BasePlanPickerResponse> => {
    const response = await api.get("/api/dashboard/plans?view=picker");
    return normalizeBasePlanPickerResponse(response.data);
  };

export const createAddonPlan = async (
  payload: AddonPlanWritePayload
): Promise<{ status: boolean; data: Addon }> => {
  const response = await api.post("/api/dashboard/addons", payload);
  return {
    status: asRecord(response.data).status !== false,
    data: normalizeAddon(asRecord(response.data).data),
  };
};

export const updateAddonPlan = async (
  id: string,
  payload: AddonPlanWritePayload
): Promise<{ status: boolean; data: Addon }> => {
  const response = await api.put(`/api/dashboard/addons/${id}`, payload);
  return {
    status: asRecord(response.data).status !== false,
    data: normalizeAddon(asRecord(response.data).data),
  };
};
