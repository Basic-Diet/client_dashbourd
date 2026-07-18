import type { MenuProductSchemaType } from "@/lib/validations/menuProductSchema";
import {
  toCreateMenuProductPayload,
  toCreateModernWeightProductPayload,
  toCreateSafeModernWeightProductPayload,
  toLegacyWeightProductPayload,
  toUpdateModernWeightProductPayload,
  toUpdateMenuProductPayload,
  toUpdateSafeModernWeightProductPayload,
  toWeightPricingPayload,
} from "@/utils/menuPayloadMappers";
import {
  fetchCreateMenuProduct,
  fetchUpdateMenuProduct,
  fetchUpdateMenuProductWeightPricing,
} from "@/utils/fetchMenuProducts";
import type {
  DashboardWeightPricingResponse,
  MenuProduct,
  MenuProductMutationResponse,
  WeightPricingDescriptor,
} from "@/types/menuTypes";
import {
  requiresSafeModernTransition,
  shouldUseModernWeightPricing,
} from "@/utils/menuWeightPricingMode";

export type MenuProductMutationMode = "create" | "edit";

export type MenuProductSaveResult =
  | {
      status: "complete";
      product: MenuProduct;
      weightPricing?: WeightPricingDescriptor | null;
    }
  | {
      status: "partial_weight_pricing_failed";
      product: MenuProduct;
      productId: string;
      error: unknown;
      weightPricing?: WeightPricingDescriptor | null;
    };

export interface MenuProductSaveDependencies {
  createProduct?: (
    data: ReturnType<typeof toCreateMenuProductPayload>
  ) => Promise<MenuProductMutationResponse>;
  updateProduct?: (
    id: string,
    data: ReturnType<typeof toUpdateMenuProductPayload>
  ) => Promise<MenuProductMutationResponse>;
  updateWeightPricing?: (
    id: string,
    data: ReturnType<typeof toWeightPricingPayload>
  ) => Promise<DashboardWeightPricingResponse>;
}

export interface SaveMenuProductInput {
  mode: MenuProductMutationMode;
  values: MenuProductSchemaType;
  imageUrl: string;
  productId?: string;
  partialProductId?: string | null;
  initialProduct?: MenuProduct | null;
  dependencies?: MenuProductSaveDependencies;
}

export async function saveMenuProductWithWeightPricing({
  mode,
  values,
  imageUrl,
  productId,
  partialProductId,
  initialProduct,
  dependencies = {},
}: SaveMenuProductInput): Promise<MenuProductSaveResult> {
  const createProduct = dependencies.createProduct ?? fetchCreateMenuProduct;
  const updateProduct = dependencies.updateProduct ?? fetchUpdateMenuProduct;
  const updateWeightPricing =
    dependencies.updateWeightPricing ?? fetchUpdateMenuProductWeightPricing;
  const nextValues = { ...values, imageFile: undefined, imageUrl };
  const existingProductId = partialProductId ?? productId ?? "";
  const useModernPricing = shouldUseModernWeightPricing({
    mode,
    values: nextValues,
    initialProduct,
  });
  const useSafeTransition = requiresSafeModernTransition({
    mode,
    values: nextValues,
    initialProduct,
  });

  if (!useModernPricing) {
    const ordinaryResponse =
      mode === "create" && !partialProductId
        ? await createProduct(toCreateMenuProductPayload(nextValues))
        : await updateProduct(
            existingProductId,
            mode === "edit"
              ? toLegacyWeightProductPayload(nextValues)
              : toUpdateMenuProductPayload(nextValues)
          );

    return {
      status: "complete",
      product: assertSavedProduct(ordinaryResponse.data),
      weightPricing: null,
    };
  }

  const stagedResponse =
    mode === "create" && !partialProductId
      ? await createProduct(toCreateSafeModernWeightProductPayload(nextValues))
      : await updateProduct(
          existingProductId,
          useSafeTransition
            ? toUpdateSafeModernWeightProductPayload(nextValues)
            : toUpdateModernWeightProductPayload(nextValues)
        );
  const stagedProduct = assertSavedProduct(stagedResponse.data);

  try {
    const weightResponse = await updateWeightPricing(
      stagedProduct.id,
      toWeightPricingPayload(nextValues)
    );
    const finalResponse =
      mode === "create" || useSafeTransition
        ? await updateProduct(
            stagedProduct.id,
            mode === "create"
              ? toCreateModernWeightProductPayload(nextValues)
              : toUpdateModernWeightProductPayload(nextValues)
          )
        : null;
    const finalProduct = finalResponse
      ? assertSavedProduct(finalResponse.data)
      : weightResponse.data.product;

    return {
      status: "complete",
      product: {
        ...finalProduct,
        weightPricing: weightResponse.data.weightPricing,
        weightStepPriceHalala:
          weightResponse.data.product.weightStepPriceHalala ??
          weightResponse.data.weightPricing.stepPriceHalala,
      },
      weightPricing: weightResponse.data.weightPricing,
    };
  } catch (error) {
    return {
      status: "partial_weight_pricing_failed",
      product: stagedProduct,
      productId: stagedProduct.id,
      error,
      weightPricing: initialProduct?.weightPricing ?? stagedProduct.weightPricing ?? null,
    };
  }
}

function assertSavedProduct(product: MenuProduct): MenuProduct {
  if (!product.id) {
    throw new Error("لم يرجع الخادم معرف المنتج بعد الحفظ.");
  }
  return product;
}
