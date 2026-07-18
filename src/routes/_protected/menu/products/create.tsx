import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import menuProductSchema, {
  type MenuProductSchemaInput,
  type MenuProductSchemaType,
} from "@/lib/validations/menuProductSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Package, Save, Loader2, AlertCircle } from "lucide-react";
import { MenuProductFormFields } from "@/components/pages/menu/products/MenuProductFormFields";
import { ProductWeightPricingPreview } from "@/components/pages/menu/products/ProductWeightPricingPreview";
import {
  fetchUploadImage,
  resolveUploadedImageUrl,
} from "@/utils/fetchUploadImage";
import { saveMenuProductWithWeightPricing } from "@/utils/menuProductMutationFlow";
import type {
  MenuProductRetryStage,
  ModernTransitionIntent,
} from "@/utils/menuProductMutationFlow";
import { ToastMessage } from "@/components/global/ToastMessage";
import {
  getMenuProductCreateDefaults,
  getMenuProductFormValues,
} from "@/utils/menuFormValues";
import { parseApiError } from "@/lib/apiErrors";
import type { MenuProduct, WeightPricingDescriptor } from "@/types/menuTypes";
import { MENU_PRODUCT_INVALIDATION_KEYS } from "@/hooks/menu/menuProductInvalidation";

export const Route = createFileRoute("/_protected/menu/products/create")({
  component: CreateMenuProductPage,
});

type PartialCreateState = {
  productId: string;
  imageUrl: string;
  warning: string;
  retryStage: MenuProductRetryStage;
  product: MenuProduct;
  weightPricing?: WeightPricingDescriptor | null;
  transitionIntent?: ModernTransitionIntent;
};

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

function invalidateProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  MENU_PRODUCT_INVALIDATION_KEYS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}

export function CreateMenuProductPage({
  initialValues,
}: {
  initialValues?: MenuProductSchemaInput;
} = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [partialCreate, setPartialCreate] = useState<PartialCreateState | null>(
    null
  );
  const [weightPreview, setWeightPreview] =
    useState<WeightPricingDescriptor | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [modernSuccess, setModernSuccess] = useState(false);
  const [completedProductId, setCompletedProductId] = useState("");
  const savingRef = useRef(false);

  const form = useForm<MenuProductSchemaInput, unknown, MenuProductSchemaType>({
    resolver: zodResolver(menuProductSchema),
    defaultValues: initialValues ?? getMenuProductCreateDefaults(),
  });

  const onSubmit = async (data: MenuProductSchemaType) => {
    if (savingRef.current || modernSuccess) return;

    savingRef.current = true;
    setIsSaving(true);
    setSubmitError("");
    setModernSuccess(false);

    try {
      let imageUrl =
        typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

      if (!partialCreate && data.imageFile instanceof File) {
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
      } else if (partialCreate?.imageUrl) {
        imageUrl = partialCreate.imageUrl;
      }

      const result = await saveMenuProductWithWeightPricing({
        mode: "create",
        values: data,
        imageUrl,
        partialProductId: partialCreate?.productId ?? null,
        retryStage: partialCreate?.retryStage ?? "full",
        restoredWeightPricing: partialCreate?.weightPricing ?? null,
        restoredProduct: partialCreate?.product ?? null,
        transitionIntent: partialCreate?.transitionIntent ?? null,
      });

      invalidateProductCaches(queryClient);

      if (result.status === "partial_weight_pricing_failed") {
        const warning = errorSummary(result.error);
        setPartialCreate({
          productId: result.productId,
          imageUrl,
          warning,
          retryStage: "full",
          product: result.product,
          weightPricing: result.weightPricing ?? null,
          transitionIntent: result.transitionIntent,
        });
        setSubmitError("");
        ToastMessage("تم إنشاء المنتج لكن فشل إعداد تسعير الوزن", "error");
        return;
      }

      if (result.status === "partial_final_metadata_restore_failed") {
        const warning = errorSummary(result.error);
        setPartialCreate({
          productId: result.productId,
          imageUrl,
          warning,
          retryStage: "final_metadata_restore",
          product: result.product,
          weightPricing: result.weightPricing,
          transitionIntent: result.transitionIntent,
        });
        setWeightPreview(result.weightPricing);
        setSubmitError("");
        ToastMessage("تم حفظ تسعير الوزن لكن فشل إظهار المنتج أو استعادة حالته", "error");
        return;
      }

      if (result.pricingOutcome === "modern_weight") {
        setWeightPreview(result.weightPricing ?? null);
        setPartialCreate(null);
        form.reset(getMenuProductFormValues(result.product));
        setModernSuccess(true);
        setCompletedProductId(result.product.id);
        ToastMessage("تم إنشاء المنتج وتسعير الوزن بنجاح", "success");
        invalidateProductCaches(queryClient);
        return;
      }

      setPartialCreate(null);
      setWeightPreview(null);
      setCompletedProductId("");
      ToastMessage("تم إنشاء المنتج بنجاح", "success");
      router.navigate({ to: "/menu", search: { tab: "catalog" } });
    } catch (error) {
      const message = errorSummary(error) || "حدث خطأ أثناء الحفظ";
      setSubmitError(message);
      ToastMessage(message, "error");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const showValidationSummary =
    form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;

  const pricingModel = form.watch("pricingModel");
  const showPreview = pricingModel === "per_100g";
  const submitLabel = partialCreate
    ? partialCreate.retryStage === "final_metadata_restore"
      ? "إكمال إظهار المنتج"
      : "إكمال تسعير الوزن"
    : "إضافة المنتج";

  return (
    <div className="w-full px-4 py-8 lg:px-8" dir="rtl">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              إضافة منتج جديد
            </h1>
            <p className="text-sm text-muted-foreground">
              قم بتعبئة البيانات أدناه لإضافة منتج للقائمة
            </p>
          </div>
        </div>
      </div>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <MenuProductFormFields form={form} />

        {showPreview ? (
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
              {completedProductId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    router.navigate({
                      to: "/menu/products/$productId/update",
                      params: { productId: completedProductId },
                    })
                  }
                >
                  تعديل المنتج
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {partialCreate ? (
          <Alert className="text-right">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {partialCreate.retryStage === "final_metadata_restore"
                ? "تم حفظ تسعير الوزن، لكن فشل إظهار المنتج"
                : "تم إنشاء المنتج، لكن تسعير الوزن لم يكتمل"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              {partialCreate.retryStage === "final_metadata_restore" ? (
                <p>
                  لن يتم إنشاء نسخة أخرى أو إعادة إرسال تسعير الوزن. سيتم فقط
                  إكمال إظهار المنتج واستعادة حالته النهائية.
                </p>
              ) : (
                <p>
                  لن يتم إنشاء نسخة أخرى عند إعادة المحاولة. سيتم تحديث المنتج
                  الحالي ثم إعادة إرسال إعداد تسعير الوزن.
                </p>
              )}
              <p dir="ltr" className="break-words text-xs">
                {partialCreate.warning}
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
                    يرجى مراجعة الحقول المحددة ثم المحاولة مرة أخرى.
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                  تأكد من مراجعة جميع البيانات
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
