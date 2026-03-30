import { createFileRoute } from "@tanstack/react-router";
import { addonsQueryOptions } from "@/hooks/useAddonsQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AddonsTable } from "@/components/pages/addons/addons-table";
import { Card, CardContent } from "@/components/ui/card";
import { PlusSquare } from "lucide-react";

export const Route = createFileRoute("/_protected/addons/")({
  component: RouteComponent,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(addonsQueryOptions()),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل الإضافات..." />
  ),
});

function RouteComponent() {
  const { data: addonsResponse } = useSuspenseQuery(
    addonsQueryOptions()
  );

  const addons = addonsResponse?.data || [];

  return (
    <>
      <div className="px-4 lg:px-6">
        <Card className="bg-linear-to-br from-primary/10 via-background to-background text-foreground shadow-none">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-inner">
                <PlusSquare className="size-6 text-primary-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  الإضافات (Addons)
                </h2>
                <p className="text-sm text-muted-foreground">
                  إدارة الإضافات واشتراكات المشروبات
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:border-r sm:pr-6">
              <div className="text-center sm:text-right">
                <p className="text-3xl font-black text-primary">
                  {addons.length}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  إجمالي الإضافات
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <AddonsTable data={addons} />
    </>
  );
}
