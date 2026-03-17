import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreatePackageForm from "@/hooks/useCreatePackageForm";
import { submitUpdatePackageForm } from "@/utils/submitUpdatePackageForm";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import {
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { fetchGetPlanById } from "@/utils/fetchGetPlanById";
import { Loader } from "@/components/global/loader";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Package, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { BasicInfoSection } from "@/components/pages/packages/BasicInfoSection";
import { FreezePolicySection } from "@/components/pages/packages/FreezePolicySection";
import { GramOptionsSection } from "@/components/pages/packages/GramOptionsSection";

const planQueryOptions = (planId: string) =>
  queryOptions({
    queryKey: ["plan", planId],
    queryFn: () => fetchGetPlanById(planId),
    staleTime: 1000 * 60 * 5,
  });

export const Route = createFileRoute("/_protected/packages/$planId/update")({
  component: UpdatePackagePage,
  loader: async ({ context: { queryClient }, params: { planId } }) =>
    queryClient.ensureQueryData(planQueryOptions(planId)),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل بيانات الباقة..." />
  ),
});

/* ─── Main Page ─── */
function UpdatePackagePage() {
  const router = useRouter();
  const { planId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: planResponse } = useSuspenseQuery(planQueryOptions(planId));
  const planData = planResponse.data;

  // Map API response to form shape
  const initialData: CreatePackageSchemaType = {
    name: planData.name,
    daysCount: planData.daysCount,
    currency: planData.currency || "SAR",
    sortOrder: planData.sortOrder,
    isActive: planData.isActive,
    skipAllowanceCompensatedDays: planData.skipAllowanceCompensatedDays || 0,
    freezePolicy: {
      enabled: planData.freezePolicy?.enabled ?? false,
      maxDays: planData.freezePolicy?.maxDays ?? 1,
      maxTimes: planData.freezePolicy?.maxTimes ?? 1,
    },
    gramsOptions: planData.gramsOptions.map((gram) => ({
      grams: gram.grams,
      sortOrder: gram.sortOrder,
      isActive: gram.isActive,
      mealsOptions: gram.mealsOptions.map((meal) => ({
        mealsPerDay: meal.mealsPerDay,
        sortOrder: meal.sortOrder,
        isActive: meal.isActive,
        priceHalala: meal.priceHalala,
        compareAtHalala: meal.compareAtHalala ?? "",
      })),
    })),
  };

  const { form, gramsFieldArray, addGram, removeGram, DEFAULT_MEAL } =
    useCreatePackageForm(initialData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: CreatePackageSchemaType) => {
    await submitUpdatePackageForm(data, {
      planId,
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
            <h1 className="text-2xl font-bold tracking-tight">تعديل الباقة</h1>
            <p className="text-sm text-muted-foreground">
              قم بتعديل بيانات الباقة ثم اضغط على حفظ التعديلات
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
                على حفظ التعديلات
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
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    حفظ التعديلات
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
