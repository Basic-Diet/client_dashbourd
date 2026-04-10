import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreateMealForm from "@/hooks/useCreateMealForm";
import { submitMealForm } from "@/utils/submitMealForm";
import type { MealSchemaType } from "@/lib/validations/mealSchema";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { MealFormFields } from "@/components/pages/meals/MealFormFields";

export const Route = createFileRoute("/_protected/meals/create")({
  component: CreateMealPage,
});

/* ─── Main Page ─── */
function CreateMealPage() {
  const router = useRouter();
  const { form } = useCreateMealForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: MealSchemaType) => {
    await submitMealForm(data, {
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
            <Utensils className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              إضافة وجبة جديدة
            </h1>
            <p className="text-sm text-muted-foreground">
              قم بتعبئة البيانات أدناه لإضافة وجبة جديدة
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <MealFormFields form={form} />

        {/* ─── Submit ─── */}
        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4 sm:px-6">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                تأكد من مراجعة جميع البيانات والخيارات الخاصة بالوجبة قبل النقر
                على الإضافة
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
                    إضافة الوجبة
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
