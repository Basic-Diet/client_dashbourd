import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreateMealForm from "@/hooks/useCreateMealForm";
import { submitUpdateMealForm } from "@/utils/submitUpdateMealForm";
import type { MealSchemaType } from "@/lib/validations/mealSchema";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { fetchMealById } from "@/utils/fetchMealById";
import { queryOptions } from "@tanstack/react-query";
import { Loader } from "@/components/global/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { MealFormFields } from "@/components/pages/meals/MealFormFields";

const mealDetailQueryOptions = (mealId: string) =>
  queryOptions({
    queryKey: ["meal", mealId],
    queryFn: () => fetchMealById(mealId),
    staleTime: 1000 * 60 * 5,
  });

export const Route = createFileRoute("/_protected/meals/$mealId/update")({
  loader: async ({ context, params: { mealId } }) => {
    return context.queryClient.ensureQueryData(
      mealDetailQueryOptions(mealId)
    );
  },
  component: UpdateMealPage,
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل بيانات الوجبة..." />
  ),
});

function UpdateMealPage() {
  const router = useRouter();
  const { mealId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: mealData } = useSuspenseQuery(
    mealDetailQueryOptions(mealId)
  );

  const { form } = useCreateMealForm(mealData.data);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: MealSchemaType) => {
    await submitUpdateMealForm(data, {
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
            <Utensils className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              تعديل الوجبة
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
        <MealFormFields form={form} />

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
