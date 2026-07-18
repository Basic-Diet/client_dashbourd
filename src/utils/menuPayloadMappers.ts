import type { MenuCategorySchemaType } from "@/lib/validations/menuCategorySchema";
import type { MenuOptionGroupSchemaType } from "@/lib/validations/menuOptionGroupSchema";
import type { MenuOptionSchemaType } from "@/lib/validations/menuOptionSchema";
import type { MenuProductSchemaType } from "@/lib/validations/menuProductSchema";
import type { MenuProteinSchemaType } from "@/lib/validations/menuProteinSchema";
import type { MenuPremiumProteinSchemaType } from "@/lib/validations/menuPremiumProteinSchema";
import type { MenuMealCategorySchemaType } from "@/lib/validations/menuMealCategorySchema";
import { normalizeAvailableForToApi } from "@/constants/menuCatalog";
import { optionalRiyalToHalala, riyalToHalala } from "@/utils/price";
import type {
  CreateMenuCategoryPayload,
  CreateMenuMealCategoryPayload,
  CreateMenuOptionGroupPayload,
  CreateMenuOptionPayload,
  CreateMenuPremiumProteinPayload,
  CreateMenuProductPayload,
  CreateMenuProteinPayload,
  UpdateMenuCategoryPayload,
  UpdateMenuMealCategoryPayload,
  UpdateMenuOptionGroupPayload,
  UpdateMenuOptionPayload,
  UpdateMenuPremiumProteinPayload,
  UpdateMenuProductPayload,
  UpdateWeightPricingPayload,
  UpdateMenuProteinPayload,
  UpdateSelectionRulesPayload,
} from "@/types/menuTypes";

const optionalKey = (key?: string) => {
  const value = key?.trim();
  return value ? value : undefined;
};

const withOptionalKey = <T extends object>(
  payload: T,
  key?: string
): T & { key?: string } => {
  const normalizedKey = optionalKey(key);
  return normalizedKey ? { ...payload, key: normalizedKey } : payload;
};

const mapAvailableFor = normalizeAvailableForToApi;

export const toCreateMenuCategoryPayload = (
  data: MenuCategorySchemaType
): CreateMenuCategoryPayload =>
  withOptionalKey(
    {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      isActive: data.isActive,
      isAvailable: data.isAvailable,
      isVisible: data.isVisible,
      sortOrder: data.sortOrder,
    },
    data.key
  );

export const toUpdateMenuCategoryPayload = (
  data: MenuCategorySchemaType
): UpdateMenuCategoryPayload => ({
  name: data.name,
  description: data.description,
  imageUrl: data.imageUrl,
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  sortOrder: data.sortOrder,
});

export const toCreateMenuMealCategoryPayload = (
  data: MenuMealCategorySchemaType
): CreateMenuMealCategoryPayload =>
  withOptionalKey(
    {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      isActive: data.isActive,
      isAvailable: data.isAvailable,
      isVisible: data.isVisible,
      sortOrder: data.sortOrder,
    },
    data.key
  );

export const toUpdateMenuMealCategoryPayload = (
  data: MenuMealCategorySchemaType
): UpdateMenuMealCategoryPayload => ({
  name: data.name,
  description: data.description,
  imageUrl: data.imageUrl,
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  sortOrder: data.sortOrder,
});

export const toCreateMenuProteinPayload = (
  data: MenuProteinSchemaType
): CreateMenuProteinPayload => ({
  name: data.name,
  description: data.description,
  imageUrl: data.imageUrl,
  categoryId: data.categoryId,
  proteinGrams: data.proteinGrams,
  carbGrams: data.carbGrams,
  fatGrams: data.fatGrams,
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  availableForOrder: data.availableForOrder,
  availableForSubscription: data.availableForSubscription,
  sortOrder: data.sortOrder,
});

export const toUpdateMenuProteinPayload = (
  data: MenuProteinSchemaType
): UpdateMenuProteinPayload => ({
  name: data.name,
  description: data.description,
  imageUrl: data.imageUrl,
  categoryId: data.categoryId,
  proteinGrams: data.proteinGrams,
  carbGrams: data.carbGrams,
  fatGrams: data.fatGrams,
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  availableForOrder: data.availableForOrder,
  availableForSubscription: data.availableForSubscription,
  sortOrder: data.sortOrder,
});

export const toCreateMenuPremiumProteinPayload = (
  data: MenuPremiumProteinSchemaType
): CreateMenuPremiumProteinPayload => ({
  ...toCreateMenuProteinPayload(data),
  currency: data.currency,
  extraFeeHalala: riyalToHalala(data.extraFeeSar),
});

export const toUpdateMenuPremiumProteinPayload = (
  data: MenuPremiumProteinSchemaType
): UpdateMenuPremiumProteinPayload => ({
  ...toUpdateMenuProteinPayload(data),
  currency: data.currency,
  extraFeeHalala: riyalToHalala(data.extraFeeSar),
});

export const toCreateMenuProductPayload = (
  data: MenuProductSchemaType
): CreateMenuProductPayload =>
  withOptionalKey(
    toOrdinaryProductPayload(data, { includePricing: true }) as CreateMenuProductPayload,
    data.key
  );

export const toUpdateMenuProductPayload = (
  data: MenuProductSchemaType
): UpdateMenuProductPayload =>
  toOrdinaryProductPayload(data, { includePricing: true });

export const toCreateModernWeightProductPayload = (
  data: MenuProductSchemaType
): CreateMenuProductPayload =>
  withOptionalKey(
    toOrdinaryProductPayload(data, {
      includePricing: false,
      includeCustomizable: false,
    }) as CreateMenuProductPayload,
    data.key
  );

export const toCreateSafeModernWeightProductPayload = (
  data: MenuProductSchemaType
): CreateMenuProductPayload => ({
  ...toCreateModernWeightProductPayload(data),
  isActive: data.isActive,
  isVisible: false,
  isAvailable: false,
});

export const toUpdateModernWeightProductPayload = (
  data: MenuProductSchemaType
): UpdateMenuProductPayload =>
  toOrdinaryProductPayload(data, {
    includePricing: false,
    includeCustomizable: false,
  });

export const toUpdateSafeModernWeightProductPayload = (
  data: MenuProductSchemaType
): UpdateMenuProductPayload => ({
  ...toUpdateModernWeightProductPayload(data),
  isActive: data.isActive,
  isVisible: false,
  isAvailable: false,
});

export const toLegacyWeightProductPayload = (
  data: MenuProductSchemaType
): UpdateMenuProductPayload =>
  toOrdinaryProductPayload(data, { includePricing: true });

function toOrdinaryProductPayload(
  data: MenuProductSchemaType,
  {
    includePricing,
    includeCustomizable = true,
  }: { includePricing: boolean; includeCustomizable?: boolean }
): UpdateMenuProductPayload {
  const payload: UpdateMenuProductPayload = {
    categoryId: data.categoryId,
    itemType: data.itemType,
    name: data.name,
    description: data.description,
    imageUrl: data.imageUrl,
    pricingModel: data.pricingModel,
    isActive: data.isActive,
    isAvailable: data.isAvailable,
    isVisible: data.isVisible,
    availableFor: mapAvailableFor(data.availableFor),
    ui: {
      cardSize: data.ui.cardSize,
    },
    sortOrder: data.sortOrder,
  };

  if (includeCustomizable) {
    payload.isCustomizable = data.isCustomizable;
  }

  if (!includePricing) return payload;

  return {
    ...payload,
    priceHalala: riyalToHalala(data.priceSar),
    baseUnitGrams: data.baseUnitGrams,
    defaultWeightGrams: data.defaultWeightGrams,
    minWeightGrams: data.minWeightGrams,
    maxWeightGrams: data.maxWeightGrams,
    weightStepGrams: data.weightStepGrams,
  };
}

export const toWeightPricingPayload = (
  data: MenuProductSchemaType
): UpdateWeightPricingPayload => ({
  priceHalala: riyalToHalala(data.priceSar),
  baseUnitGrams: data.baseUnitGrams ?? 0,
  defaultWeightGrams: data.defaultWeightGrams ?? 0,
  minWeightGrams: data.minWeightGrams ?? 0,
  maxWeightGrams: data.maxWeightGrams ?? 0,
  weightStepGrams: data.weightStepGrams ?? 0,
  weightStepPriceHalala: riyalToHalala(data.weightStepPriceSar ?? 0),
});

export const toCreateMenuOptionGroupPayload = (
  data: MenuOptionGroupSchemaType
): CreateMenuOptionGroupPayload =>
  withOptionalKey(
    {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      isAvailable: data.isAvailable,
      isVisible: data.isVisible,
      ui: data.ui,
      sortOrder: data.sortOrder,
    },
    data.key
  );

export const toUpdateMenuOptionGroupPayload = (
  data: MenuOptionGroupSchemaType
): UpdateMenuOptionGroupPayload => ({
  name: data.name,
  description: data.description,
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  ui: data.ui,
  sortOrder: data.sortOrder,
});

export const toCreateMenuOptionPayload = (
  data: MenuOptionSchemaType
): CreateMenuOptionPayload =>
  withOptionalKey(
    {
      groupId: data.groupId,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      extraPriceHalala: riyalToHalala(data.extraPriceSar),
      extraWeightUnitGrams: data.extraWeightUnitGrams,
      extraWeightPriceHalala: optionalRiyalToHalala(
        data.extraWeightPriceSar
      ),
      isActive: data.isActive,
      isAvailable: data.isAvailable,
      isVisible: data.isVisible,
      extraFeeHalala:
        data.extraFeeSar === undefined || data.extraFeeSar === null
          ? 0
          : riyalToHalala(data.extraFeeSar),
      availableFor: mapAvailableFor(data.availableFor),
      availableForSubscription: data.availableForSubscription,
      sortOrder: data.sortOrder,
    },
    data.key
  );

export const toUpdateMenuOptionPayload = (
  data: MenuOptionSchemaType
): UpdateMenuOptionPayload => ({
  name: data.name,
  description: data.description,
  imageUrl: data.imageUrl,
  extraPriceHalala: riyalToHalala(data.extraPriceSar),
  extraWeightUnitGrams: data.extraWeightUnitGrams,
  extraWeightPriceHalala: optionalRiyalToHalala(data.extraWeightPriceSar),
  isActive: data.isActive,
  isAvailable: data.isAvailable,
  isVisible: data.isVisible,
  extraFeeHalala:
    data.extraFeeSar === undefined || data.extraFeeSar === null
      ? 0
      : riyalToHalala(data.extraFeeSar),
  availableFor: mapAvailableFor(data.availableFor),
  availableForSubscription: data.availableForSubscription,
  sortOrder: data.sortOrder,
});

export const toUpdateSelectionRulesPayload = (data: {
  minSelections: string | number;
  maxSelections: string | number | null | undefined;
  isRequired: boolean;
  sortOrder?: string | number;
}): UpdateSelectionRulesPayload => ({
  minSelections: Number(data.minSelections),
  maxSelections: parseOptionalSelectionLimit(data.maxSelections),
  isRequired: data.isRequired,
  sortOrder: data.sortOrder !== undefined ? Number(data.sortOrder) : undefined,
});

export const parseOptionalSelectionLimit = (
  value: string | number | null | undefined
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return Number(value);
};
