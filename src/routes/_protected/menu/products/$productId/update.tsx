/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Package, Save } from "lucide-react";

import menuProductSchema, {
  type MenuProductSchemaInput,
  type MenuProductSchemaType,
} from "@/lib/validations/menuProductSchema";
import {
  useMenuProductComposerQuery,
  useUpdateMenuProductMutation,
} from "@/hooks/useMenuQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/global/loader";
import { MenuProductFormFields } from "@/components/pages/menu/products/MenuProductFormFields";
import { ProductCustomizationPanel } from "@/components/pages/menu/products/ProductCustomizationPanel";
import { toUpdateMenuProductPayload } from "@/utils/menuPayloadMappers";
import {
  fetchUploadImage,
  resolveUploadedImageUrl,
} from "@/utils/fetchUploadImage";
import { ToastMessage } from "@/components/global/ToastMessage";
import { getMenuProductFormValues } from "@/utils/menuFormValues";
import type { MenuProductComposer } from "@/types/menuTypes";

export const Route = createFileRoute(
  "/_protected/menu/products/$productId/update"
)({
  component: UpdateMenuProductPage,
  pendingComponent: () => (
    <Loader variant="full-screen" label="جار تحميل المنتج..." />
  ),
});

function UpdateMenuProductPage() {
  const { productId } = Route.useParams();
  const {
    data: composerData,
    isLoading,
    isError,
    error,
  } = useMenuProductComposerQuery(productId);

  if (isLoading) {
    return <Loader variant="full-screen" label="جار تحميل المنتج..." />;
  }

  if (isError || !composerData?.data?.product) {
    ToastMessage(
      (error as any)?.response?.data?.message || "تعذر تحميل بيانات المنتج",
      "error"
    );
    return null;
  }

  const product = composerData.data.product;

  return (
    <UpdateMenuProductForm
      key={product.id || productId}
      composer={composerData.data}
      productId={productId}
    />
  );
}

function UpdateMenuProductForm({
  composer,
  productId,
}: {
  composer: MenuProductComposer;
  productId: string;
}) {
  const router = useRouter();
  const mutation = useUpdateMenuProductMutation();
  const product = composer.product;

  const form = useForm<MenuProductSchemaInput, unknown, MenuProductSchemaType>({
    resolver: zodResolver(menuProductSchema),
    defaultValues: getMenuProductFormValues(product),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = useCallback(
    async (data: MenuProductSchemaType) => {
      let updateStarted = false;

      try {
        let imageUrl =
          typeof data.imageUrl === "string" ? data.imageUrl.trim() : "";

        if (data.imageFile instanceof File) {
          const uploadRes = await fetchUploadImage(data.imageFile);
          imageUrl = resolveUploadedImageUrl(uploadRes);

          // Keep the uploaded URL in form state. If the product PATCH fails,
          // retrying will reuse this upload instead of creating a duplicate.
          form.setValue("imageUrl", imageUrl, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue("imageFile", undefined, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }

        updateStarted = true;
        await mutation.mutateAsync({
          id: productId,
          data: toUpdateMenuProductPayload({ ...data, imageFile: undefined, imageUrl }),
        });

        router.navigate({
          to: "/menu",
          search: { tab: "catalog" },
        });
      } catch (submitError: unknown) {
        // Product mutation errors are already shown by useMutationWithToast.
        // Only show a local error when upload/response parsing failed first.
        if (!updateStarted) {
          ToastMessage(
            (submitError as {
              normalizedMessage?: string;
              response?: { data?: { message?: string } };
            })?.normalizedMessage ||
              (submitError as { response?: { data?: { message?: string } } })
                ?.response?.data?.message ||
              "تعذر رفع الصورة الجديدة. حاول مرة أخرى.",
            "error"
          );
        }
      }
    },
    [form, mutation, productId, router]
  );

  const showValidationSummary =
    form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0;
  const isCustomizable = form.watch("isCustomizable") ?? false;
  const isSaving = mutation.isPending || form.formState.isSubmitting;

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
              تعديل بيانات "{product.name.ar || product.name.en || product.key}"
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <MenuProductFormFields form={form} isEdit />
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

        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md">
            <CardContent className="space-y-3 p-4 sm:px-6">
              {showValidationSummary ? (
                <Alert variant="destructive" className="text-right">
                  <AlertCircle className="size-4" />
                  <AlertTitle>بيانات مطلوبة ناقصة أو غير صحيحة</AlertTitle>
                  <AlertDescription>
                    يرجى مراجعة الحقول المحددة وتعبئة البيانات المطلوبة بشكل
                    صحيح ثم إعادة الحفظ.
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
                      حفظ التعديلات
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
