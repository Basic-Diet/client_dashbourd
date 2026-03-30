import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreatePremiumMealForm from "@/hooks/useCreatePremiumMealForm";
import { submitUpdatePremiumMealForm } from "@/utils/submitUpdatePremiumMealForm";
import type { PremiumMealSchemaType } from "@/lib/validations/premiumMealSchema";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { fetchPremiumMealById } from "@/utils/fetchPremiumMealById";
import { queryOptions } from "@tanstack/react-query";
import { Loader } from "@/components/global/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { PremiumMealFormFields } from "@/components/pages/premium-meals/PremiumMealFormFields";

const premiumMealDetailQueryOptions = (mealId: string) =>
  queryOptions({
    queryKey: ["premium-meal", mealId],
    queryFn: () => fetchPremiumMealById(mealId),
    staleTime: 1000 * 60 * 5, // 5 min
  });

export const Route = createFileRoute("/_protected/premium-meals/$mealId/update")({
  loader: async ({ context, params: { mealId } }) => {
    return context.queryClient.ensureQueryData(
      premiumMealDetailQueryOptions(mealId)
    );
  },
  component: UpdatePremiumMealPage,
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل بيانات الوجبة..." />
  ),
});

function UpdatePremiumMealPage() {
  const router = useRouter();
  const { mealId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: mealData } = useSuspenseQuery(
    premiumMealDetailQueryOptions(mealId)
  );
  
  const { form } = useCreatePremiumMealForm(mealData.data);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: PremiumMealSchemaType) => {
    await submitUpdatePremiumMealForm(data, {
      mealId,
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
            <UtensilsCrossed className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              تعديل الوجبة المميزة
            </h1>
            <p className="text-sm text-muted-foreground">
              تعديل بيانات الوجبة "{mealData.data.name.ar}"
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
        <PremiumMealFormFields form={form} />

        {/* ─── Submit ─── */}
        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4 sm:px-6">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                تأكد من مراجعة الحقول المعدلة قبل النقر على الحفظ
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
