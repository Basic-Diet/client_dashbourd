import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreatePackageForm from "@/hooks/useCreatePackageForm";
import { submitPackageForm } from "@/utils/submitPackageForm";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { BasicInfoSection } from "@/components/pages/packages/BasicInfoSection";
import { FreezePolicySection } from "@/components/pages/packages/FreezePolicySection";
import { GramOptionsSection } from "@/components/pages/packages/GramOptionsSection";

export const Route = createFileRoute("/_protected/packages/create")({
  component: CreatePackagePage,
});

/* ─── Main Page ─── */
function CreatePackagePage() {
  const router = useRouter();
  const { form, gramsFieldArray, addGram, removeGram, DEFAULT_MEAL } =
    useCreatePackageForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: CreatePackageSchemaType) => {
    await submitPackageForm(data, {
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
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              إنشاء باقة جديدة
            </h1>
            <p className="text-sm text-muted-foreground">
              قم بتعبئة البيانات أدناه لإنشاء باقة جديدة
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <BasicInfoSection form={form} />

        <FreezePolicySection form={form} />

        <GramOptionsSection
          form={form}
          gramsFieldArray={gramsFieldArray}
          addGram={addGram}
          removeGram={removeGram}
          defaultMeal={DEFAULT_MEAL}
        />

        {/* ─── Submit ─── */}
        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4 sm:px-6">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                تأكد من مراجعة جميع البيانات والخيارات الخاصة بالباقة قبل النقر
                على الإنشاء
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
                    جارٍ الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    إنشاء الباقة
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
