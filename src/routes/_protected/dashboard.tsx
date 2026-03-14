/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/pages/dashboard/data-table";
import { createFileRoute } from "@tanstack/react-router";

import { SectionCards } from "@/components/custom/section-cards";
import { dashboardSectionCards } from "@/constants/SectionCardsData";
import { recentSubscriptions, recentOrders } from "@/constants/recent-activity";
import {
  subscriptionColumns,
  orderColumns,
} from "@/components/pages/dashboard/activity-columns";

export const Route = createFileRoute("/_protected/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const [activeTab, setActiveTab] = React.useState("subscriptions");

  const data =
    activeTab === "subscriptions" ? recentSubscriptions : recentOrders;
  const columns =
    activeTab === "subscriptions" ? subscriptionColumns : orderColumns;

  return (
    <>
      <SectionCards cardsData={dashboardSectionCards} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <DataTable
        columns={columns as any}
        data={data as any}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </>
  );
}
