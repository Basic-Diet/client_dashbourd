import type { MenuProduct } from "@/types/menuTypes";
import type { MenuProductSchemaType } from "@/lib/validations/menuProductSchema";

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

export function shouldUseModernWeightPricing({
  mode,
  values,
  initialProduct,
}: {
  mode: "create" | "edit";
  values: Pick<MenuProductSchemaType, "pricingModel" | "useWeightStepPricing">;
  initialProduct?: MenuProduct | null;
}): boolean {
  if (values.pricingModel !== "per_100g") return false;
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
  values: Pick<MenuProductSchemaType, "pricingModel" | "useWeightStepPricing">;
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
