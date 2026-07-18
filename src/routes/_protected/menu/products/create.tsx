import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { ToastMessage } from "@/components/global/ToastMessage";
import { getMenuProductCreateDefaults } from "@/utils/menuFormValues";
import { parseApiError } from "@/lib/apiErrors";
import type { WeightPricingDescriptor } from "@/types/menuTypes";
import { MENU_PRODUCT_INVALIDATION_KEYS } from "@/hooks/menu/menuProductInvalidation";

export const Route = createFileRoute("/_protected/menu/products/create")({
  component: CreateMenuProductPage,
});

type PartialCreateState = {
  productId: string;
  imageUrl: string;
  warning: string;
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

function CreateMenuProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [partialCreate, setPartialCreate] = useState<PartialCreateState | null>(
    null
  );
  const [weightPreview, setWeightPreview] =
    useState<WeightPricingDescriptor | null>(null);
  const [submitError, setSubmitError] = useState("");

  const form = useForm<MenuProductSchemaInput, unknown, MenuProductSchemaType>({
    resolver: zodResolver(menuProductSchema),
    defaultValues: getMenuProductCreateDefaults(),
  });

  const onSubmit = async (data: MenuProductSchemaType) => {
    if (isSaving) return;

    setIsSaving(true);
    setSubmitError("");

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
      });

      invalidateProductCaches(queryClient);

      if (result.status === "partial_weight_pricing_failed") {
        const warning = errorSummary(result.error);
        setPartialCreate({
          productId: result.productId,
          imageUrl,
          warning,
        });
        setSubmitError("");
        ToastMessage("تم إنشاء المنتج لكن فشل إعداد تسعير الوزن", "error");
        return;
      }

      if (data.pricingModel === "per_100g") {
        setWeightPreview(result.weightPricing ?? null);
        setPartialCreate(null);
        form.reset(getMenuProductCreateDefaults());
        ToastMessage("تم إنشاء المنتج وتسعير الوزن بنجاح", "success");
        invalidateProductCaches(queryClient);
        router.navigate({ to: "/menu", search: { tab: "catalog" } });
        return;
      }

      setPartialCreate(null);
      setWeightPreview(null);
      ToastMessage("تم إنشاء المنتج بنجاح", "success");
      router.navigate({ to: "/menu", search: { tab: "catalog" } });
    } catch (error) {
      const message = errorSummary(error) || "حدث خطأ أثناء الحفظ";
      setSubmitError(message);
      ToastMessage(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const showValidationSummary =
    form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;

  const pricingModel = form.watch("pricingModel");
  const showPreview = pricingModel === "per_100g";

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

        {partialCreate ? (
          <Alert className="text-right">
            <AlertCircle className="size-4" />
            <AlertTitle>تم إنشاء المنتج، لكن تسعير الوزن لم يكتمل</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                لن يتم إنشاء نسخة أخرى عند إعادة المحاولة. سيتم تحديث المنتج
                الحالي ثم إعادة إرسال إعداد تسعير الوزن.
              </p>
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
                  disabled={isSaving}
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
                      {partialCreate ? "إكمال تسعير الوزن" : "إضافة المنتج"}
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
