import { createFileRoute } from "@tanstack/react-router";
import { premiumMealsQueryOptions } from "@/hooks/usePremiumMealsQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PremiumMealsTable } from "@/components/pages/premium-meals/premium-meals-table";
import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_protected/premium-meals/")({
  component: RouteComponent,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(premiumMealsQueryOptions()),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل الوجبات المميزة..." />
  ),
});

function RouteComponent() {
  const { data: premiumMealsResponse } = useSuspenseQuery(
    premiumMealsQueryOptions()
  );

  const premiumMeals = premiumMealsResponse?.data || [];

  return (
    <>
      <div className="px-4 lg:px-6">
        <Card className="bg-linear-to-br from-primary/10 via-background to-background text-foreground shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-inner">
                <UtensilsCrossed className="size-6 text-primary-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  الوجبات المميزة (Premium Meals)
                </h2>
                <p className="text-sm text-muted-foreground">
                  إدارة الوجبات المميزة الإضافية والتعديل عليها
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:border-r sm:pr-6">
              <div className="text-center sm:text-right">
                <p className="text-3xl font-black text-primary">
                  {premiumMeals.length}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  إجمالي الوجبات
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <PremiumMealsTable data={premiumMeals} />
    </>
  );
}
