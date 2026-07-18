/**
 * ── Menu API Response Normalizers ──
 *
 * The backend returns flat field names (nameAr, nameEn, active, order, etc.)
 * while the frontend expects nested/structured shapes (name: {ar, en}, isActive, sortOrder, etc.).
 *
 * Additionally, the backend returns `data: [...]` (a direct array) instead of
 * `data: { items: [...], pagination: {...} }`.
 *
 * These normalizers bridge that gap at the fetch boundary so the rest of the
 * app can work with the documented types.
 */

import type {
  MenuCategory,
  MenuMealCategory,
  MenuProtein,
  MenuPremiumProtein,
  MenuProduct,
  MenuOptionGroup,
  MenuOption,
  MenuCategoriesResponse,
  MenuMealCategoriesResponse,
  MenuProteinsResponse,
  MenuPremiumProteinsResponse,
  MenuProductsResponse,
  MenuOptionGroupsResponse,
  MenuOptionsResponse,
  MenuCategoryDetailResponse,
  MenuMealCategoryDetailResponse,
  MenuProteinDetailResponse,
  MenuPremiumProteinDetailResponse,
  MenuProductDetailResponse,
  MenuOptionGroupDetailResponse,
  MenuOptionDetailResponse,
  MenuProductComposerResponse,
  MenuProductMutationResponse,
  DashboardWeightPricingResponse,
  WeightPricingDescriptor,
  WeightPricingChoice,
  CategoryProductAssignmentResponse,
  BulkUpdateProductsResponse,
  PaginationMeta,
} from "@/types/menuTypes";

import { normalizeAvailableForFromApi } from "@/constants/menuCatalog";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Safely extract an array from the backend response `data` field */
function extractItems(raw: any): any[] {
  if (!raw) return [];
  const data = raw.data ?? raw;

  // Shape A: { data: { items: [...] } }  (already normalized)
  if (data?.items && Array.isArray(data.items)) return data.items;

  // Shape B: { data: [...] }  (backend flat array)
  if (Array.isArray(data)) return data;

  // Shape C: single object (detail endpoint)
  return [];
}

/** Wrap an array into the paginated response shape the frontend expects */
function extractPagination(raw: any, itemCount: number): PaginationMeta {
  const data = raw?.data ?? raw;
  const pagination =
    data?.pagination ?? raw?.pagination ?? raw?.meta?.pagination ?? raw?.meta;

  if (pagination) {
    const limit = Number(pagination.limit ?? pagination.perPage ?? (itemCount || 25));
    const total = Number(pagination.total ?? pagination.totalItems ?? itemCount);
    const pages = Number(
      pagination.pages ?? pagination.totalPages ?? Math.max(1, Math.ceil(total / limit))
    );

    return {
      page: Number(pagination.page ?? pagination.currentPage ?? 1),
      limit,
      total,
      pages,
    };
  }

  return { page: 1, limit: itemCount || 25, total: itemCount, pages: 1 };
}

function toPaginatedResponse<T>(raw: any, items: T[]): {
  items: T[];
  pagination: PaginationMeta;
} {
  return {
    items,
    pagination: extractPagination(raw, items.length),
  };
}

function idFromRef(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const id = value.id ?? value._id;
  if (id) return String(id);
  if (typeof value.toHexString === "function") return value.toHexString();
  return "";
}

function nonEmptyString(value: any): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

function firstNonEmptyString(...values: any[]): string {
  for (const value of values) {
    const normalized = nonEmptyString(value);
    if (normalized) return normalized;
  }
  return "";
}

function productPriceHalala(raw: any): number {
  const halala = raw.priceHalala ?? raw.price_halala;
  if (typeof halala === "number" && Number.isFinite(halala)) return halala;

  const sar = raw.price;
  if (typeof sar === "number" && Number.isFinite(sar)) return Math.round(sar * 100);

  return 0;
}

function createMalformedMenuResponseError(message: string): Error & {
  normalizedMessage: string;
  code: string;
} {
  const error = new Error(message) as Error & {
    normalizedMessage: string;
    code: string;
  };
  error.normalizedMessage = message;
  error.code = "MALFORMED_MENU_RESPONSE";
  return error;
}

function assertProductId(product: MenuProduct, context: string): MenuProduct {
  if (!product.id) {
    throw createMalformedMenuResponseError(
      `${context}: backend response did not include a product id`
    );
  }
  return product;
}

function normalizeWeightPricingChoice(raw: any): WeightPricingChoice {
  return {
    weightGrams: Number(raw?.weightGrams ?? raw?.weight_grams ?? 0),
    priceHalala: Number(raw?.priceHalala ?? raw?.price_halala ?? 0),
  };
}

function normalizeWeightPricingDescriptor(raw: any): WeightPricingDescriptor | null {
  if (!raw || typeof raw !== "object") return null;

  const choices = Array.isArray(raw.choices)
    ? raw.choices.map(normalizeWeightPricingChoice)
    : Array.isArray(raw.weightChoices)
      ? raw.weightChoices.map(normalizeWeightPricingChoice)
      : [];

  return {
    contractVersion: raw.contractVersion ?? raw.contract_version ?? "weight_pricing.v1",
    strategy: raw.strategy ?? "base_plus_steps",
    requiresWeightSelection: Boolean(raw.requiresWeightSelection ?? raw.requires_weight_selection),
    basePriceHalala: Number(raw.basePriceHalala ?? raw.base_price_halala ?? 0),
    baseWeightGrams: Number(raw.baseWeightGrams ?? raw.base_weight_grams ?? 0),
    defaultWeightGrams: Number(raw.defaultWeightGrams ?? raw.default_weight_grams ?? 0),
    minWeightGrams: Number(raw.minWeightGrams ?? raw.min_weight_grams ?? 0),
    maxWeightGrams: Number(raw.maxWeightGrams ?? raw.max_weight_grams ?? 0),
    stepGrams: Number(raw.stepGrams ?? raw.step_grams ?? 0),
    stepPriceHalala: Number(raw.stepPriceHalala ?? raw.step_price_halala ?? 0),
    choices,
  };
}

function assertNonEmptyString(value: any, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw createMalformedMenuResponseError(
      `Weight pricing response was missing ${field}`
    );
  }
  return value.trim();
}

function assertBoolean(value: any, field: string): boolean {
  if (typeof value !== "boolean") {
    throw createMalformedMenuResponseError(
      `Weight pricing response had invalid ${field}`
    );
  }
  return value;
}

function assertNonNegativeInteger(value: any, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw createMalformedMenuResponseError(
      `Weight pricing response had invalid ${field}`
    );
  }
  return value;
}

function assertPositiveInteger(value: any, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw createMalformedMenuResponseError(
      `Weight pricing response had invalid ${field}`
    );
  }
  return value;
}

function normalizeStrictWeightPricingDescriptor(raw: any): WeightPricingDescriptor {
  if (!raw || typeof raw !== "object") {
    throw createMalformedMenuResponseError(
      "Weight pricing response was missing the backend preview"
    );
  }
  if (!Array.isArray(raw.choices)) {
    throw createMalformedMenuResponseError(
      "Weight pricing response choices must be an array"
    );
  }
  if (raw.choices.length === 0) {
    throw createMalformedMenuResponseError(
      "Weight pricing response choices must not be empty"
    );
  }

  return {
    contractVersion: assertNonEmptyString(
      raw.contractVersion ?? raw.contract_version,
      "weightPricing.contractVersion"
    ),
    strategy: assertNonEmptyString(raw.strategy, "weightPricing.strategy"),
    requiresWeightSelection: assertBoolean(
      raw.requiresWeightSelection ?? raw.requires_weight_selection,
      "weightPricing.requiresWeightSelection"
    ),
    basePriceHalala: assertNonNegativeInteger(
      raw.basePriceHalala ?? raw.base_price_halala,
      "weightPricing.basePriceHalala"
    ),
    baseWeightGrams: assertPositiveInteger(
      raw.baseWeightGrams ?? raw.base_weight_grams,
      "weightPricing.baseWeightGrams"
    ),
    defaultWeightGrams: assertPositiveInteger(
      raw.defaultWeightGrams ?? raw.default_weight_grams,
      "weightPricing.defaultWeightGrams"
    ),
    minWeightGrams: assertPositiveInteger(
      raw.minWeightGrams ?? raw.min_weight_grams,
      "weightPricing.minWeightGrams"
    ),
    maxWeightGrams: assertPositiveInteger(
      raw.maxWeightGrams ?? raw.max_weight_grams,
      "weightPricing.maxWeightGrams"
    ),
    stepGrams: assertPositiveInteger(
      raw.stepGrams ?? raw.step_grams,
      "weightPricing.stepGrams"
    ),
    stepPriceHalala: assertNonNegativeInteger(
      raw.stepPriceHalala ?? raw.step_price_halala,
      "weightPricing.stepPriceHalala"
    ),
    choices: raw.choices.map((choice: any, index: number) => ({
      weightGrams: assertPositiveInteger(
        choice?.weightGrams ?? choice?.weight_grams,
        `weightPricing.choices[${index}].weightGrams`
      ),
      priceHalala: assertNonNegativeInteger(
        choice?.priceHalala ?? choice?.price_halala,
        `weightPricing.choices[${index}].priceHalala`
      ),
    })),
  };
}

// ── Category Normalizer ──

function normalizeCategory(raw: any): MenuCategory {
  const availability = raw.availability ?? {};
  return {
    id: raw.id ?? raw._id ?? "",
    key: raw.key ?? "",
    name: {
      ar: raw.name?.ar ?? raw.nameAr ?? raw.name_ar ?? "",
      en: raw.name?.en ?? raw.nameEn ?? raw.name_en ?? "",
    },
    description: {
      ar: raw.description?.ar ?? raw.descriptionAr ?? raw.description_ar ?? "",
      en: raw.description?.en ?? raw.descriptionEn ?? raw.description_en ?? "",
    },
    imageUrl: raw.imageUrl ?? raw.image ?? "",
    isActive: raw.isActive ?? raw.active ?? raw.is_active ?? true,
    isAvailable: raw.isAvailable ?? raw.available ?? raw.is_available ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? raw.is_visible ?? true,
    ui: {
      cardVariant: raw.ui?.cardVariant ?? raw.ui?.card_variant ?? raw.cardVariant ?? raw.card_variant ?? "meal_builder",
    },
    availability: {
      branchIds: raw.branchIds ?? availability.branchIds ?? availability.branch_ids ?? [],
    },
    sortOrder: raw.sortOrder ?? raw.order ?? raw.sort_order ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function normalizeCategoriesResponse(raw: any): MenuCategoriesResponse {
  const items = extractItems(raw).map(normalizeCategory);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeCategoryDetailResponse(raw: any): MenuCategoryDetailResponse {
  const data = raw.data ?? raw;
  const category = normalizeCategory(data.category ?? data);
  const products = Array.isArray(data.products)
    ? data.products.map(normalizeProduct)
    : undefined;

  return {
    status: raw.status ?? true,
    data: {
      ...category,
      contractVersion: data.contractVersion,
      category,
      products,
      assignment: data.assignment,
      actions: data.actions,
    },
  };
}

export function normalizeCategoryProductAssignmentResponse(
  raw: any
): CategoryProductAssignmentResponse {
  const data = raw.data ?? raw;
  return {
    status: raw.status ?? true,
    data: {
      contractVersion: data.contractVersion,
      category: normalizeCategory(data.category ?? {}),
      assignedCount: data.assignedCount ?? data.products?.length ?? 0,
      products: Array.isArray(data.products)
        ? data.products.map(normalizeProduct)
        : [],
      relationOwner: data.relationOwner ?? "product.categoryId",
    },
  };
}

// â”€â”€ Meal Category Normalizer â”€â”€

function normalizeMealCategory(raw: any): MenuMealCategory {
  const normalized = normalizeCategory(raw);
  return {
    ...normalized,
    isAvailable: raw.isAvailable ?? raw.available ?? normalized.isAvailable ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? normalized.isVisible ?? true,
  };
}

export function normalizeMealCategoriesResponse(raw: any): MenuMealCategoriesResponse {
  const items = extractItems(raw).map(normalizeMealCategory);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeMealCategoryDetailResponse(
  raw: any
): MenuMealCategoryDetailResponse {
  const data = raw.data ?? raw;
  return {
    status: raw.status ?? true,
    data: normalizeMealCategory(data),
  };
}

// â”€â”€ Protein Normalizer â”€â”€

function normalizeProtein(raw: any): MenuProtein {
  return {
    id: raw.id ?? raw._id ?? "",
    name: {
      ar: raw.name?.ar ?? raw.nameAr ?? raw.name_ar ?? "",
      en: raw.name?.en ?? raw.nameEn ?? raw.name_en ?? "",
    },
    description: {
      ar: raw.description?.ar ?? raw.descriptionAr ?? raw.description_ar ?? "",
      en: raw.description?.en ?? raw.descriptionEn ?? raw.description_en ?? "",
    },
    imageUrl: raw.imageUrl ?? raw.image ?? "",
    categoryId: raw.categoryId ?? raw.category_id ?? raw.category?._id ?? raw.category?.id ?? "",
    category: raw.category ? normalizeMealCategory(raw.category) : undefined,
    proteinGrams: raw.proteinGrams ?? raw.protein_grams ?? 0,
    carbGrams: raw.carbGrams ?? raw.carb_grams ?? 0,
    fatGrams: raw.fatGrams ?? raw.fat_grams ?? 0,
    isActive: raw.isActive ?? raw.active ?? raw.is_active ?? true,
    isAvailable: raw.isAvailable ?? raw.availableForOrder ?? raw.available ?? raw.is_available ?? raw.active ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? raw.is_visible ?? true,
    availableForOrder: raw.availableForOrder ?? raw.isAvailable ?? raw.available ?? raw.is_available ?? true,
    availableForSubscription: raw.availableForSubscription ?? raw.available_for_subscription ?? true,
    sortOrder: raw.sortOrder ?? raw.order ?? raw.sort_order ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function normalizeProteinsResponse(raw: any): MenuProteinsResponse {
  const items = extractItems(raw).map(normalizeProtein);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeProteinDetailResponse(raw: any): MenuProteinDetailResponse {
  const data = raw.data ?? raw;
  return {
    status: raw.status ?? true,
    data: normalizeProtein(data),
  };
}

// â”€â”€ Premium Protein Normalizer â”€â”€

function normalizePremiumProtein(raw: any): MenuPremiumProtein {
  const protein = normalizeProtein(raw);
  return {
    ...protein,
    extraFeeHalala: raw.extraFeeHalala ?? raw.extra_fee_halala ?? raw.extraFee ?? 0,
    currency: raw.currency ?? "SAR",
  };
}

export function normalizePremiumProteinsResponse(
  raw: any
): MenuPremiumProteinsResponse {
  const items = extractItems(raw).map(normalizePremiumProtein);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizePremiumProteinDetailResponse(
  raw: any
): MenuPremiumProteinDetailResponse {
  const data = raw.data ?? raw;
  return {
    status: raw.status ?? true,
    data: normalizePremiumProtein(data),
  };
}

// ── Product Normalizer ──

function normalizeProduct(raw: any): MenuProduct {
  const weightPricing =
    normalizeWeightPricingDescriptor(raw.weightPricing ?? raw.weight_pricing);

  return {
    id: raw.id ?? raw._id ?? "",
    categoryId:
      idFromRef(raw.categoryId) ||
      idFromRef(raw.category_id) ||
      idFromRef(raw.category),
    key: raw.key ?? "",
    itemType: firstNonEmptyString(raw.itemType, raw.item_type, raw.type) || "product",
    name: {
      ar: raw.name?.ar ?? raw.nameAr ?? raw.name_ar ?? "",
      en: raw.name?.en ?? raw.nameEn ?? raw.name_en ?? "",
    },
    description: {
      ar: raw.description?.ar ?? raw.descriptionAr ?? raw.description_ar ?? "",
      en: raw.description?.en ?? raw.descriptionEn ?? raw.description_en ?? "",
    },
    imageUrl: raw.imageUrl ?? raw.image ?? "",
    pricingModel: raw.pricingModel ?? raw.pricing_model ?? raw.pricingType ?? "fixed",
    priceHalala: productPriceHalala(raw),
    baseUnitGrams: raw.baseUnitGrams ?? raw.base_unit_grams ?? undefined,
    defaultWeightGrams: raw.defaultWeightGrams ?? raw.default_weight_grams ?? undefined,
    minWeightGrams: raw.minWeightGrams ?? raw.min_weight_grams ?? undefined,
    maxWeightGrams: raw.maxWeightGrams ?? raw.max_weight_grams ?? undefined,
    weightStepGrams: raw.weightStepGrams ?? raw.weight_step_grams ?? undefined,
    weightStepPriceHalala:
      raw.weightStepPriceHalala ?? raw.weight_step_price_halala ?? null,
    weightPricing,
    isActive: raw.isActive ?? raw.active ?? raw.is_active ?? true,
    isAvailable: raw.isAvailable ?? raw.available ?? raw.is_available ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? raw.is_visible ?? true,
    isCustomizable: raw.isCustomizable ?? raw.is_customizable ?? false,
    availableFor: normalizeAvailableForFromApi(raw.availableFor ?? raw.available_for),
    branchAvailability: raw.branchAvailability ?? raw.branch_availability ?? raw.branchIds ?? [],
    catalogItemId: idFromRef(raw.catalogItemId ?? raw.catalog_item_id) || null,
    ui: {
      cardVariant: raw.ui?.cardVariant ?? raw.ui?.card_variant ?? raw.cardVariant ?? raw.card_variant ?? "standard",
      cardSize: raw.ui?.cardSize ?? raw.ui?.card_size ?? raw.cardSize ?? raw.card_size ?? "medium",
      badge: raw.ui?.badge ?? raw.badge ?? "",
      ctaLabel: raw.ui?.ctaLabel ?? raw.ui?.cta_label ?? raw.ctaLabel ?? raw.cta_label ?? "",
      imageRatio: raw.ui?.imageRatio ?? raw.ui?.image_ratio ?? raw.imageRatio ?? raw.image_ratio ?? "square",
    },
    sortOrder: raw.sortOrder ?? raw.order ?? raw.sort_order ?? 0,
    groups: raw.groups,
    optionGroups: raw.optionGroups ?? raw.option_groups,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function normalizeProductsResponse(raw: any): MenuProductsResponse {
  const items = extractItems(raw).map(normalizeProduct);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeProductDetailResponse(raw: any): MenuProductDetailResponse {
  const data = raw.data ?? raw;
  const product = normalizeProduct(data.product ?? data);

  return {
    status: raw.status ?? true,
    data: {
      ...product,
      contractVersion: data.contractVersion,
      product,
      category: data.category ? normalizeCategory(data.category) : null,
      groupSummary: data.groupSummary,
    },
  };
}

export function normalizeMenuProductMutationResponse(
  raw: any,
  context = "menu product mutation"
): MenuProductMutationResponse {
  const data = raw?.data ?? raw;
  const product = assertProductId(normalizeProduct(data.product ?? data), context);

  return {
    status: raw?.status ?? true,
    data: product,
  };
}

export function normalizeDashboardWeightPricingResponse(
  raw: any
): DashboardWeightPricingResponse {
  if (raw?.status === false) {
    throw createMalformedMenuResponseError(
      "Weight pricing response reported failure"
    );
  }
  const data = raw?.data;
  if (!data || typeof data !== "object") {
    throw createMalformedMenuResponseError(
      "Weight pricing response was missing data"
    );
  }
  const contractVersion = assertNonEmptyString(
    data.contractVersion,
    "contractVersion"
  );

  const product = assertProductId(
    normalizeProduct(data.product ?? {}),
    "weight pricing mutation"
  );
  const weightPricing = normalizeStrictWeightPricingDescriptor(data.weightPricing);

  return {
    status: true,
    data: {
      contractVersion,
      product: {
        ...product,
        weightPricing,
        weightStepPriceHalala:
          product.weightStepPriceHalala ?? weightPricing.stepPriceHalala,
      },
      weightPricing,
    },
  };
}

export function normalizeBulkUpdateProductsResponse(raw: any): BulkUpdateProductsResponse {
  const data = raw.data ?? raw;
  return {
    status: raw.status ?? true,
    data: {
      action: data.action ?? "move_to_category",
      category: normalizeCategory(data.category ?? {}),
      count: data.count ?? data.products?.length ?? 0,
      products: Array.isArray(data.products)
        ? data.products.map(normalizeProduct)
        : [],
      relationOwner: data.relationOwner ?? "product.categoryId",
    },
  };
}

function normalizeComposerLinkedOption(raw: any): any {
  const optionId = raw.optionId ?? raw.option_id ?? raw.option?.id ?? raw.option?._id ?? "";
  return {
    id: raw.relationId ?? raw.id,
    optionId,
    option: raw.option
      ? normalizeOption(raw.option)
      : {
          id: optionId,
          groupId: "",
          key: raw.key ?? "",
          name: raw.name ?? { ar: "", en: "" },
          extraPriceHalala: raw.defaultPricing?.extraPriceHalala ?? 0,
          isActive: raw.status?.isActive ?? true,
          isAvailable: raw.status?.isAvailable ?? true,
          isVisible: raw.status?.isVisible ?? true,
          sortOrder: raw.sortOrder ?? 0,
        },
    extraPriceHalala: raw.overridePricing?.extraPriceHalala ?? raw.extraPriceHalala ?? undefined,
    extraWeightUnitGrams:
      raw.overridePricing?.extraWeightUnitGrams ?? raw.extraWeightUnitGrams ?? undefined,
    extraWeightPriceHalala:
      raw.overridePricing?.extraWeightPriceHalala ?? raw.extraWeightPriceHalala ?? undefined,
    isActive: raw.status?.isActive ?? raw.isActive ?? true,
    isAvailable: raw.status?.isAvailable ?? raw.isAvailable ?? true,
    isVisible: raw.status?.isVisible ?? raw.isVisible ?? true,
    sortOrder: raw.sortOrder ?? 0,
  };
}

function normalizeComposerLinkedGroup(raw: any): any {
  const groupId = raw.groupId ?? raw.group_id ?? raw.group?.id ?? raw.group?._id ?? "";
  const normalizedGroup = raw.group
    ? normalizeOptionGroup(raw.group)
    : {
        id: groupId,
        key: raw.key ?? "",
        name: raw.name ?? { ar: "", en: "" },
        description: { ar: "", en: "" },
        isActive: raw.status?.isActive ?? true,
        isAvailable: raw.status?.isAvailable ?? true,
        isVisible: raw.status?.isVisible ?? true,
        ui: raw.ui ?? { displayStyle: "chips" },
        sortOrder: raw.sortOrder ?? 0,
      };

  return {
    id: raw.relationId ?? raw.id,
    groupId,
    group: normalizedGroup,
    minSelections: raw.rules?.minSelections ?? raw.minSelections ?? 0,
    maxSelections: raw.rules?.maxSelections ?? raw.maxSelections ?? null,
    isRequired: raw.rules?.isRequired ?? raw.isRequired ?? false,
    isActive: raw.status?.isActive ?? raw.isActive ?? true,
    isAvailable: raw.status?.isAvailable ?? raw.isAvailable ?? true,
    isVisible: raw.status?.isVisible ?? raw.isVisible ?? true,
    sortOrder: raw.sortOrder ?? 0,
    options: Array.isArray(raw.options)
      ? raw.options.map(normalizeComposerLinkedOption)
      : [],
  };
}

export function normalizeProductComposerResponse(raw: any): MenuProductComposerResponse {
  const data = raw.data ?? raw;
  const product = normalizeProduct(data.product ?? {});
  const customization = data.customization ?? {};
  const linkedOptionGroups = Array.isArray(data.customization?.linkedGroups)
    ? data.customization.linkedGroups.map(normalizeComposerLinkedGroup)
    : Array.isArray(customization.groups)
      ? customization.groups.map(normalizeComposerLinkedGroup)
    : Array.isArray(data.linkedOptionGroups)
      ? data.linkedOptionGroups.map(normalizeComposerLinkedGroup)
      : [];

  return {
    status: raw.status ?? true,
    data: {
      contractVersion: data.contractVersion ?? "dashboard_product_composer.v3",
      product,
      category: data.category ? normalizeCategory(data.category) : null,
      publishState: data.publishState ?? {
        isPublished: Boolean((product as any).publishedAt),
        publishedAt: (product as any).publishedAt ?? null,
        versionId: (product as any).versionId ?? null,
      },
      availability: data.availability ?? {
        isCustomizable:
          customization.enabled ??
          customization.isCustomizable ??
          product.isCustomizable,
        isActive: product.isActive,
        isVisible: product.isVisible ?? true,
        isAvailable: product.isAvailable,
        availableFor: product.availableFor ?? [],
        branchAvailability: product.branchAvailability ?? [],
      },
      pricing: data.pricing ?? {
        pricingModel: product.pricingModel,
        priceHalala: product.priceHalala,
        baseUnitGrams: product.baseUnitGrams ?? 0,
        defaultWeightGrams: product.defaultWeightGrams ?? 0,
        minWeightGrams: product.minWeightGrams ?? 0,
        maxWeightGrams: product.maxWeightGrams ?? 0,
        weightStepGrams: product.weightStepGrams ?? 0,
        currency: "SAR",
      },
      ui: data.ui ?? product.ui ?? { cardVariant: "standard" },
      linkedOptionGroups,
      customization: {
        isCustomizable:
          customization.enabled ??
          customization.isCustomizable ??
          product.isCustomizable,
        linkedGroups: linkedOptionGroups,
      },
      availableActions: data.availableActions,
      validation: data.validation ?? { errors: [], warnings: [] },
    },
  };
}

// ── Option Group Normalizer ──

function normalizeOptionGroup(raw: any): MenuOptionGroup {
  return {
    id: raw.id ?? raw._id ?? "",
    key: raw.key ?? "",
    name: {
      ar: raw.name?.ar ?? raw.nameAr ?? raw.name_ar ?? "",
      en: raw.name?.en ?? raw.nameEn ?? raw.name_en ?? "",
    },
    description: {
      ar: raw.description?.ar ?? raw.descriptionAr ?? raw.description_ar ?? "",
      en: raw.description?.en ?? raw.descriptionEn ?? raw.description_en ?? "",
    },
    isActive: raw.isActive ?? raw.active ?? raw.is_active ?? true,
    isAvailable: raw.isAvailable ?? raw.available ?? raw.is_available ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? raw.is_visible ?? true,
    ui: {
      displayStyle: raw.ui?.displayStyle ?? raw.ui?.display_style ?? raw.displayStyle ?? raw.display_style ?? "chips",
    },
    sortOrder: raw.sortOrder ?? raw.order ?? raw.sort_order ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function normalizeOptionGroupsResponse(raw: any): MenuOptionGroupsResponse {
  const items = extractItems(raw).map(normalizeOptionGroup);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeOptionGroupDetailResponse(raw: any): MenuOptionGroupDetailResponse {
  const data = raw.data ?? raw;
  const optionGroup = normalizeOptionGroup(data.optionGroup ?? data);
  const options = Array.isArray(data.options)
    ? data.options.map(normalizeOption)
    : undefined;

  return {
    status: raw.status ?? true,
    data: {
      ...optionGroup,
      contractVersion: data.contractVersion,
      optionGroup,
      options,
      usage: data.usage,
      actions: data.actions,
    },
  };
}

// ── Option Normalizer ──

function normalizeOption(raw: any): MenuOption {
  return {
    id: raw.id ?? raw._id ?? "",
    groupId: raw.groupId ?? raw.group_id ?? raw.group ?? "",
    key: raw.key ?? "",
    name: {
      ar: raw.name?.ar ?? raw.nameAr ?? raw.name_ar ?? "",
      en: raw.name?.en ?? raw.nameEn ?? raw.name_en ?? "",
    },
    description: {
      ar: raw.description?.ar ?? raw.descriptionAr ?? raw.description_ar ?? "",
      en: raw.description?.en ?? raw.descriptionEn ?? raw.description_en ?? "",
    },
    imageUrl: raw.imageUrl ?? raw.image ?? "",
    extraPriceHalala: raw.extraPriceHalala ?? raw.extra_price_halala ?? raw.extraPrice ?? 0,
    extraWeightUnitGrams: raw.extraWeightUnitGrams ?? raw.extra_weight_unit_grams ?? undefined,
    extraWeightPriceHalala: raw.extraWeightPriceHalala ?? raw.extra_weight_price_halala ?? undefined,
    isActive: raw.isActive ?? raw.active ?? raw.is_active ?? true,
    isAvailable: raw.isAvailable ?? raw.available ?? raw.is_available ?? true,
    isVisible: raw.isVisible ?? raw.visible ?? raw.is_visible ?? true,
    displayCategoryKey: raw.displayCategoryKey ?? raw.display_category_key ?? raw.displayCategory ?? undefined,
    proteinFamilyKey: raw.proteinFamilyKey ?? raw.protein_family_key ?? raw.proteinFamily ?? undefined,
    premiumKey: raw.premiumKey ?? raw.premium_key ?? undefined,
    extraFeeHalala: raw.extraFeeHalala ?? raw.extra_fee_halala ?? raw.extraFee ?? undefined,
    ruleTags: raw.ruleTags ?? raw.rule_tags ?? undefined,
    selectionType: raw.selectionType ?? raw.selection_type ?? undefined,
    availableFor: normalizeAvailableForFromApi(raw.availableFor ?? raw.available_for),
    availableForSubscription: raw.availableForSubscription ?? raw.available_for_subscription ?? true,
    sortOrder: raw.sortOrder ?? raw.order ?? raw.sort_order ?? 0,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function normalizeOptionsResponse(raw: any): MenuOptionsResponse {
  const items = extractItems(raw).map(normalizeOption);
  return {
    status: raw.status ?? true,
    data: toPaginatedResponse(raw, items),
  };
}

export function normalizeOptionDetailResponse(raw: any): MenuOptionDetailResponse {
  const data = raw.data ?? raw;
  const option = normalizeOption(data.option ?? data);

  return {
    status: raw.status ?? true,
    data: {
      ...option,
      contractVersion: data.contractVersion,
      option,
      optionGroup: data.optionGroup ? normalizeOptionGroup(data.optionGroup) : null,
    },
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
