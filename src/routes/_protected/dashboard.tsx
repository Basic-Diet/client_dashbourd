import * as React from "react";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/pages/dashboard/data-table";
import { createFileRoute } from "@tanstack/react-router";

import { SectionCards } from "@/components/custom/section-cards";
import { dashboardSectionCards } from "@/constants/SectionCardsData";
import {
  subscriptionColumns,
  orderColumns,
} from "@/components/pages/dashboard/activity-columns";
import { dashboardQueryOptions } from "@/hooks/useDashboardQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_protected/dashboard")({
  component: RouteComponent,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(dashboardQueryOptions()),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل البيانات..." />
  ),
});

function RouteComponent() {
  const { data: dashboardResponse } = useSuspenseQuery(dashboardQueryOptions());
  const [activeTab, setActiveTab] = React.useState("subscriptions");

  const dashboardData = dashboardResponse?.data;
  const stats = dashboardData?.stats;

  // Map stats to section cards
  const mappedCardsData = dashboardSectionCards.map((card) => {
    return {
      ...card,
      value: stats?.activeSubscriptions?.toString() || "0",
    };
  });

  const tableData =
    activeTab === "subscriptions"
      ? dashboardData?.recentSubscriptions || []
      : dashboardData?.recentOrders || [];

  const columns =
    activeTab === "subscriptions" ? subscriptionColumns : orderColumns;

  return (
    <>
      <SectionCards cardsData={mappedCardsData} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable
        columns={columns as unknown as React.ComponentProps<typeof DataTable>["columns"]}
        data={tableData as unknown as React.ComponentProps<typeof DataTable>["data"]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
