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
export type MenuProductSavePricingOutcome =
  | "fixed"
  | "legacy_weight"
  | "modern_weight";
export type MenuProductRetryStage = "full" | "final_metadata_restore";

export type MenuProductSaveResult =
  | {
      status: "complete";
      pricingOutcome: MenuProductSavePricingOutcome;
      product: MenuProduct;
      weightPricing?: WeightPricingDescriptor | null;
    }
  | {
      status: "partial_weight_pricing_failed";
      product: MenuProduct;
      productId: string;
      error: unknown;
      weightPricing?: WeightPricingDescriptor | null;
    }
  | {
      status: "partial_final_metadata_restore_failed";
      product: MenuProduct;
      productId: string;
      error: unknown;
      weightPricing: WeightPricingDescriptor;
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
  retryStage?: MenuProductRetryStage;
  restoredWeightPricing?: WeightPricingDescriptor | null;
  restoredProduct?: MenuProduct | null;
  dependencies?: MenuProductSaveDependencies;
}

export async function saveMenuProductWithWeightPricing({
  mode,
  values,
  imageUrl,
  productId,
  partialProductId,
  initialProduct,
  retryStage = "full",
  restoredWeightPricing,
  restoredProduct,
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
      pricingOutcome:
        nextValues.pricingModel === "per_100g" ? "legacy_weight" : "fixed",
      product: assertSavedProduct(ordinaryResponse.data),
      weightPricing: null,
    };
  }

  if (retryStage === "final_metadata_restore") {
    try {
      const finalResponse = await updateProduct(
        existingProductId,
        mode === "create"
          ? toCreateModernWeightProductPayload(nextValues)
          : toUpdateModernWeightProductPayload(nextValues)
      );
      return {
        status: "complete",
        pricingOutcome: "modern_weight",
        product: {
          ...assertSavedProduct(finalResponse.data),
          weightPricing: restoredWeightPricing ?? null,
          weightStepPriceHalala:
            restoredWeightPricing?.stepPriceHalala ??
            finalResponse.data.weightStepPriceHalala,
        },
        weightPricing: restoredWeightPricing ?? null,
      };
    } catch (error) {
      const retryProduct = assertSavedProduct(
        restoredProduct ?? initialProduct ?? ({ id: existingProductId } as MenuProduct)
      );
      const retryWeightPricing =
        restoredWeightPricing ?? retryProduct.weightPricing;
      if (!retryWeightPricing) {
        throw error;
      }
      return {
        status: "partial_final_metadata_restore_failed",
        product: {
          ...retryProduct,
          weightPricing: retryWeightPricing,
          weightStepPriceHalala:
            retryWeightPricing.stepPriceHalala ?? retryProduct.weightStepPriceHalala,
        },
        productId: existingProductId,
        error,
        weightPricing: retryWeightPricing,
      };
    }
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
    let finalResponse: MenuProductMutationResponse | null = null;
    try {
      finalResponse =
        mode === "create" || useSafeTransition
          ? await updateProduct(
              stagedProduct.id,
              mode === "create"
                ? toCreateModernWeightProductPayload(nextValues)
                : toUpdateModernWeightProductPayload(nextValues)
            )
          : null;
    } catch (error) {
      return {
        status: "partial_final_metadata_restore_failed",
        product: weightResponse.data.product,
        productId: stagedProduct.id,
        error,
        weightPricing: weightResponse.data.weightPricing,
      };
    }

    const finalProduct = finalResponse
      ? assertSavedProduct(finalResponse.data)
      : weightResponse.data.product;

    return {
      status: "complete",
      pricingOutcome: "modern_weight",
      product: {
        ...finalProduct,
        isCustomizable:
          weightResponse.data.product.isCustomizable ??
          finalProduct.isCustomizable,
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
