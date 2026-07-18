import type { MenuProduct } from "@/types/menuTypes";
import type { MenuProductSchemaType } from "@/lib/validations/menuProductSchema";

export type WeightPricingFormMode =
  | "fixed"
  | "new_modern"
  | "legacy"
  | "legacy_migration"
  | "existing_modern"
  | "fixed_to_modern";

export const MODERN_WEIGHT_PRICING_FORM_MODES: WeightPricingFormMode[] = [
  "new_modern",
  "legacy_migration",
  "existing_modern",
  "fixed_to_modern",
];

export function hasModernWeightPricing(
  product?: Pick<MenuProduct, "weightStepPriceHalala" | "weightPricing"> | null
): boolean {
  if (!product) return false;
  return (
    product.weightStepPriceHalala !== null &&
      product.weightStepPriceHalala !== undefined
  ) || product.weightPricing?.strategy === "base_plus_steps";
}

export function isLegacyWeightedProduct(
  product?: Pick<
    MenuProduct,
    "pricingModel" | "weightStepPriceHalala" | "weightPricing"
  > | null
): boolean {
  return product?.pricingModel === "per_100g" && !hasModernWeightPricing(product);
}

export function isModernWeightPricingFormMode(
  mode: WeightPricingFormMode | undefined
): boolean {
  return Boolean(mode && MODERN_WEIGHT_PRICING_FORM_MODES.includes(mode));
}

export function deriveWeightPricingFormMode({
  pageMode,
  pricingModel,
  initialProduct,
  useWeightStepPricing,
}: {
  pageMode: "create" | "edit";
  pricingModel: MenuProductSchemaType["pricingModel"];
  initialProduct?: MenuProduct | null;
  useWeightStepPricing?: boolean;
}): WeightPricingFormMode {
  if (pricingModel !== "per_100g") return "fixed";
  if (pageMode === "create") return "new_modern";
  if (hasModernWeightPricing(initialProduct)) return "existing_modern";
  if (initialProduct?.pricingModel !== "per_100g") return "fixed_to_modern";
  return useWeightStepPricing ? "legacy_migration" : "legacy";
}

export function isWeightPricingModeLocked(mode: WeightPricingFormMode): boolean {
  return (
    mode === "new_modern" ||
    mode === "existing_modern" ||
    mode === "fixed_to_modern"
  );
}

export function shouldUseModernWeightPricing({
  mode,
  values,
  initialProduct,
}: {
  mode: "create" | "edit";
  values: Pick<
    MenuProductSchemaType,
    "pricingModel" | "useWeightStepPricing" | "weightPricingFormMode"
  >;
  initialProduct?: MenuProduct | null;
}): boolean {
  if (values.pricingModel !== "per_100g") return false;
  if (isModernWeightPricingFormMode(values.weightPricingFormMode)) return true;
  if (values.weightPricingFormMode === "legacy") return false;
  if (mode === "create") return true;
  if (hasModernWeightPricing(initialProduct)) return true;
  if (initialProduct?.pricingModel !== "per_100g") return true;
  return Boolean(values.useWeightStepPricing);
}

export function requiresSafeModernTransition({
  mode,
  values,
  initialProduct,
}: {
  mode: "create" | "edit";
  values: Pick<
    MenuProductSchemaType,
    "pricingModel" | "useWeightStepPricing" | "weightPricingFormMode"
  >;
  initialProduct?: MenuProduct | null;
}): boolean {
  if (!shouldUseModernWeightPricing({ mode, values, initialProduct })) {
    return false;
  }
  return (
    mode === "create" ||
    initialProduct?.pricingModel !== "per_100g" ||
    isLegacyWeightedProduct(initialProduct)
  );
}
