import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Package, Save } from "lucide-react";

import menuProductSchema, {
  type MenuProductSchemaInput,
  type MenuProductSchemaType,
} from "@/lib/validations/menuProductSchema";
import { useMenuProductDetailQuery } from "@/hooks/useMenuQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/global/loader";
import { MenuProductFormFields } from "@/components/pages/menu/products/MenuProductFormFields";
import { ProductCustomizationPanel } from "@/components/pages/menu/products/ProductCustomizationPanel";
import { ProductWeightPricingPreview } from "@/components/pages/menu/products/ProductWeightPricingPreview";
import { saveMenuProductWithWeightPricing } from "@/utils/menuProductMutationFlow";
import type {
  MenuProductRetryStage,
  ModernTransitionIntent,
} from "@/utils/menuProductMutationFlow";
import {
  deriveWeightPricingFormMode,
  isModernWeightPricingFormMode,
} from "@/utils/menuWeightPricingMode";
import {
  fetchUploadImage,
  resolveUploadedImageUrl,
} from "@/utils/fetchUploadImage";
import { ToastMessage } from "@/components/global/ToastMessage";
import { getMenuProductFormValues } from "@/utils/menuFormValues";
import { parseApiError } from "@/lib/apiErrors";
import type { MenuProduct, WeightPricingDescriptor } from "@/types/menuTypes";
import { MENU_PRODUCT_INVALIDATION_KEYS } from "@/hooks/menu/menuProductInvalidation";

export const Route = createFileRoute(
  "/_protected/menu/products/$productId/update"
)({
  component: UpdateMenuProductPage,
  pendingComponent: () => (
    <Loader variant="full-screen" label="جار تحميل المنتج..." />
  ),
});

const errorSummary = (error: unknown) => {
  const parsed = parseApiError(error);
  const details =
    parsed.details === undefined
      ? ""
      : typeof parsed.details === "string"
        ? parsed.details
        : JSON.stringify(parsed.details);
  return [parsed.message, parsed.code, details].filter(Boolean).join(" - ");
};

type PartialEditState = {
  warning: string;
  retryStage: MenuProductRetryStage;
  product: MenuProduct;
  weightPricing?: WeightPricingDescriptor | null;
  transitionIntent?: ModernTransitionIntent;
};

function invalidateProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  MENU_PRODUCT_INVALIDATION_KEYS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}

function UpdateMenuProductPage() {
  const { productId } = Route.useParams();
  const {
    data: productData,
    isLoading,
    isError,
    error,
  } = useMenuProductDetailQuery(productId);

  if (isLoading) {
    return <Loader variant="full-screen" label="جار تحميل المنتج..." />;
  }

  if (isError || !productData?.data?.id) {
    ToastMessage(errorSummary(error) || "تعذر تحميل بيانات المنتج", "error");
    return null;
  }

  return (
    <UpdateMenuProductForm
      key={productData.data.id || productId}
      product={productData.data.product ?? productData.data}
      productId={productId}
    />
  );
}

export function UpdateMenuProductForm({
  product,
  productId,
  initialValues,
}: {
  product: MenuProduct;
  productId: string;
  initialValues?: MenuProductSchemaInput;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [canonicalProduct, setCanonicalProduct] = useState(product);
  const [isSaving, setIsSaving] = useState(false);
  const [partialEdit, setPartialEdit] = useState<PartialEditState | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [weightPreview, setWeightPreview] =
    useState<WeightPricingDescriptor | null>(product.weightPricing ?? null);
  const [modernSuccess, setModernSuccess] = useState(false);
  const savingRef = useRef(false);

  const form = useForm<MenuProductSchemaInput, unknown, MenuProductSchemaType>({
    resolver: zodResolver(menuProductSchema),
    defaultValues: initialValues ?? getMenuProductFormValues(product),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = useCallback(
    async (data: MenuProductSchemaType) => {
      if (savingRef.current || modernSuccess) return;

      savingRef.current = true;
      setIsSaving(true);
      setSubmitError("");
      setModernSuccess(false);

      try {
        let imageUrl =
          typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

        if (data.imageFile instanceof File) {
          const uploadRes = await fetchUploadImage(data.imageFile);
          imageUrl = resolveUploadedImageUrl(uploadRes);

          form.setValue("imageUrl", imageUrl, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue("imageFile", undefined, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }

        const result = await saveMenuProductWithWeightPricing({
          mode: "edit",
          values: data,
          imageUrl,
          productId,
          initialProduct: canonicalProduct,
          retryStage: partialEdit?.retryStage ?? "full",
          restoredWeightPricing: partialEdit?.weightPricing ?? null,
          restoredProduct: partialEdit?.product ?? canonicalProduct,
          transitionIntent: partialEdit?.transitionIntent ?? null,
        });

        invalidateProductCaches(queryClient);

        if (result.status === "partial_weight_pricing_failed") {
          const warning = errorSummary(result.error);
          setCanonicalProduct(result.product);
          setPartialEdit({
            warning,
            retryStage: "full",
            product: result.product,
            weightPricing:
              result.weightPricing ?? canonicalProduct.weightPricing ?? null,
            transitionIntent: result.transitionIntent,
          });
          setWeightPreview(
            result.weightPricing ?? canonicalProduct.weightPricing ?? null
          );
          ToastMessage("تم حفظ بيانات المنتج لكن فشل تسعير الوزن", "error");
          invalidateProductCaches(queryClient);
          return;
        }

        if (result.status === "partial_final_metadata_restore_failed") {
          const warning = errorSummary(result.error);
          setCanonicalProduct(result.product);
          setPartialEdit({
            warning,
            retryStage: "final_metadata_restore",
            product: result.product,
            weightPricing: result.weightPricing,
            transitionIntent: result.transitionIntent,
          });
          setWeightPreview(result.weightPricing);
          ToastMessage("تم حفظ تسعير الوزن لكن فشل إظهار المنتج أو استعادة حالته", "error");
          invalidateProductCaches(queryClient);
          return;
        }

        if (result.pricingOutcome === "modern_weight") {
          setCanonicalProduct(result.product);
          setWeightPreview(result.weightPricing ?? null);
          setPartialEdit(null);
          form.reset(getMenuProductFormValues(result.product));
          setModernSuccess(true);
          ToastMessage("تم تحديث المنتج وتسعير الوزن بنجاح", "success");
          invalidateProductCaches(queryClient);
          return;
        }

        setCanonicalProduct(result.product);
        setPartialEdit(null);
        setWeightPreview(null);
        form.reset(getMenuProductFormValues(result.product));
        ToastMessage("تم تحديث المنتج بنجاح", "success");
        router.navigate({ to: "/menu", search: { tab: "catalog" } });
      } catch (submitError) {
        const message = errorSummary(submitError) || "تعذر حفظ المنتج";
        setSubmitError(message);
        ToastMessage(message, "error");
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [
      canonicalProduct,
      form,
      modernSuccess,
      partialEdit,
      productId,
      queryClient,
      router,
    ]
  );

  const showValidationSummary =
    form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;
  const isCustomizable = form.watch("isCustomizable") ?? false;
  const pricingModel = form.watch("pricingModel");
  const useWeightStepPricing = form.watch("useWeightStepPricing") ?? false;
  const effectiveWeightPricingMode = deriveWeightPricingFormMode({
    pageMode: "edit",
    pricingModel: pricingModel ?? "fixed",
    initialProduct: canonicalProduct,
    useWeightStepPricing,
  });
  const showWeightPreview =
    pricingModel === "per_100g" &&
    isModernWeightPricingFormMode(effectiveWeightPricingMode);
  const productDisplayName =
    canonicalProduct.name.ar || canonicalProduct.name.en || canonicalProduct.key;
  const submitLabel = partialEdit
    ? partialEdit.retryStage === "final_metadata_restore"
      ? "إكمال إظهار المنتج"
      : "إكمال تسعير الوزن"
    : "حفظ التعديلات";

  return (
    <div className="w-full px-4 py-8 lg:px-8" dir="rtl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">تعديل المنتج</h1>
            <p className="text-sm text-muted-foreground">
              تعديل بيانات "{productDisplayName}"
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <MenuProductFormFields
          form={form}
          isEdit
          initialProduct={canonicalProduct}
        />

        {showWeightPreview ? (
          <ProductWeightPricingPreview weightPricing={weightPreview} />
        ) : null}

        {modernSuccess ? (
          <Alert className="text-right">
            <AlertCircle className="size-4" />
            <AlertTitle>تم حفظ تسعير الوزن بنجاح</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>راجع اختيارات الوزن التي رجعت من الخادم قبل الرجوع للكتالوج.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.navigate({ to: "/menu", search: { tab: "catalog" } })
                }
              >
                الرجوع للكتالوج
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <ProductCustomizationPanel
          productId={productId}
          isCustomizable={isCustomizable}
          onEnableCustomization={() =>
            form.setValue("isCustomizable", true, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        {partialEdit ? (
          <Alert className="text-right">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {partialEdit.retryStage === "final_metadata_restore"
                ? "تم حفظ تسعير الوزن، لكن فشل إظهار المنتج"
                : "تم حفظ بيانات المنتج، لكن فشل تسعير الوزن"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              {partialEdit.retryStage === "final_metadata_restore" ? (
                <p>
                  تم حفظ تسعير الوزن واختياراته من الخادم، لكن فشل إظهار المنتج أو استعادة حالته. أعد المحاولة لإكمال هذه الخطوة فقط.
                </p>
              ) : null}
              {partialEdit.retryStage === "final_metadata_restore" ? null : (
                <p>
                  لن يتم مغادرة الصفحة. راجع الإعدادات ثم أعد المحاولة لإكمال
                  تسعير الوزن.
                </p>
              )}
              <p dir="ltr" className="break-words text-xs">
                {partialEdit.warning}
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        {submitError ? (
          <Alert variant="destructive" className="text-right">
            <AlertCircle className="size-4" />
            <AlertTitle>تعذر حفظ المنتج</AlertTitle>
            <AlertDescription dir="ltr" className="break-words text-xs">
              {submitError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md">
            <CardContent className="space-y-3 p-4 sm:px-6">
              {showValidationSummary ? (
                <Alert variant="destructive" className="text-right">
                  <AlertCircle className="size-4" />
                  <AlertTitle>بيانات مطلوبة ناقصة أو غير صحيحة</AlertTitle>
                  <AlertDescription>
                    يرجى مراجعة الحقول المحددة ثم إعادة الحفظ.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                  تأكد من مراجعة التعديلات قبل الحفظ.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving || modernSuccess}
                  className="w-full gap-2 px-10 text-base font-semibold shadow-md sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جار الحفظ...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      {submitLabel}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
