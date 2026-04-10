import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreateCategoryForm from "@/hooks/useCreateCategoryForm";
import { submitCategoryForm } from "@/utils/submitCategoryForm";
import type { CategorySchemaType } from "@/lib/validations/categorySchema";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { CategoryFormFields } from "@/components/pages/categories/CategoryFormFields";

export const Route = createFileRoute("/_protected/categories/create")({
  component: CreateCategoryPage,
});

function CreateCategoryPage() {
  const router = useRouter();
  const { form } = useCreateCategoryForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: CategorySchemaType) => {
    await submitCategoryForm(data, {
      queryClient,
      routerNavigate: router.navigate,
      setIsSubmitting,
    });
  };

  return (
    <div className="w-full px-4 py-8 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderOpen className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              إضافة تصنيف جديد
            </h1>
            <p className="text-sm text-muted-foreground">
              قم بتعبئة البيانات أدناه لإضافة تصنيف جديد
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <CategoryFormFields form={form} />

        {/* ─── Submit ─── */}
        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4 sm:px-6">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                تأكد من مراجعة جميع البيانات قبل النقر على الإضافة
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full gap-2 px-10 text-base font-semibold shadow-md sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    جارٍ الإضافة...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    إضافة التصنيف
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
