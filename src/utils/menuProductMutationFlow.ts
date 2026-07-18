import type { MenuProductSchemaType } from "@/lib/validations/menuProductSchema";
import {
  toCreateMenuProductPayload,
  toUpdateMenuProductPayload,
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
  dependencies?: MenuProductSaveDependencies;
}

export async function saveMenuProductWithWeightPricing({
  mode,
  values,
  imageUrl,
  productId,
  partialProductId,
  dependencies = {},
}: SaveMenuProductInput): Promise<MenuProductSaveResult> {
  const createProduct = dependencies.createProduct ?? fetchCreateMenuProduct;
  const updateProduct = dependencies.updateProduct ?? fetchUpdateMenuProduct;
  const updateWeightPricing =
    dependencies.updateWeightPricing ?? fetchUpdateMenuProductWeightPricing;
  const nextValues = { ...values, imageFile: undefined, imageUrl };

  const ordinaryResponse =
    mode === "create" && !partialProductId
      ? await createProduct(toCreateMenuProductPayload(nextValues))
      : await updateProduct(
          partialProductId ?? productId ?? "",
          toUpdateMenuProductPayload(nextValues)
        );

  const savedProduct = ordinaryResponse.data;
  if (!savedProduct.id) {
    throw new Error("لم يرجع الخادم معرف المنتج بعد الحفظ.");
  }

  if (values.pricingModel !== "per_100g") {
    return {
      status: "complete",
      product: savedProduct,
      weightPricing: null,
    };
  }

  try {
    const weightResponse = await updateWeightPricing(
      savedProduct.id,
      toWeightPricingPayload(nextValues)
    );

    return {
      status: "complete",
      product: weightResponse.data.product,
      weightPricing: weightResponse.data.weightPricing,
    };
  } catch (error) {
    return {
      status: "partial_weight_pricing_failed",
      product: savedProduct,
      productId: savedProduct.id,
      error,
    };
  }
}
