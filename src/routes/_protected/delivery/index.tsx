import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ChefHat, Info, RefreshCw, Truck } from "lucide-react";
import { DeliveryDashboardCards } from "@/components/pages/delivery/DeliveryDashboardCards";
import { DeliveryFilters } from "@/components/pages/delivery/DeliveryFilters";
import { DeliveryList } from "@/components/pages/delivery/DeliveryList";
import { DeliveryOperationsBoard } from "@/components/pages/delivery/DeliveryOperationsBoard";
import {
  ReasonActionDialog,
  type ReasonDialogState,
} from "@/components/pages/pickup-board/ReasonActionDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCourierDeliveryActionMutation,
  useCourierDeliveryListQuery,
} from "@/hooks/useCourierDeliveriesQuery";
import {
  filterDeliveryOperations,
  getAllDeliveryOperationItems,
  type DeliveryActionFilter,
  type DeliverySourceFilter,
} from "@/lib/deliveryOperations";
import {
  buildOperationsActionPayload,
  safeText,
} from "@/lib/operationsBoard";
import type {
  DashboardOpsActionRequest,
  DashboardOpsStatusFilter,
  QueueAction,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";

export const Route = createFileRoute("/_protected/delivery/")({
  component: DeliveryDashboard,
});

const EMPTY_REASON_DIALOG: ReasonDialogState = {
  open: false,
  item: null,
  action: "",
  actionLabel: "",
  isDangerous: false,
};

type DeliveryWorkspace = "tracking" | "preparation";

function DeliveryDashboard() {
  const [activeWorkspace, setActiveWorkspace] =
    useState<DeliveryWorkspace>("tracking");
  const [statusFilter, setStatusFilter] =
    useState<DashboardOpsStatusFilter>("all");
  const [sourceFilter, setSourceFilter] =
    useState<DeliverySourceFilter>("all");
  const [windowFilter, setWindowFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [actionFilter, setActionFilter] =
    useState<DeliveryActionFilter>("all");
  const [searchStr, setSearchStr] = useState("");
  const [reasonDialog, setReasonDialog] =
    useState<ReasonDialogState>(EMPTY_REASON_DIALOG);

  const {
    data: listRes,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useCourierDeliveryListQuery();
  const actionMutation = useCourierDeliveryActionMutation();

  const baseData = useMemo(
    () => getAllDeliveryOperationItems(listRes?.data?.items ?? []),
    [listRes]
  );

  const displayData = useMemo(
    () =>
      filterDeliveryOperations(baseData, {
        search: searchStr,
        statusFilter,
        sourceFilter,
        windowFilter,
        zoneFilter,
        actionFilter,
      }),
    [
      actionFilter,
      baseData,
      searchStr,
      sourceFilter,
      statusFilter,
      windowFilter,
      zoneFilter,
    ]
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setSourceFilter("all");
    setWindowFilter("all");
    setZoneFilter("all");
    setActionFilter("all");
    setSearchStr("");
  };

  const runAction = (
    item: UnifiedQueueItem,
    action: string,
    payload: DashboardOpsActionRequest,
    actionDef?: QueueAction
  ) => {
    actionMutation.mutate({ action, payload, actionDef, itemId: item.id });
  };

  const handleActionClick = (
    item: UnifiedQueueItem,
    action: QueueAction,
    payload: DashboardOpsActionRequest
  ) => {
    if (action.requiresReason || action.id === "cancel") {
      setReasonDialog({
        open: true,
        item,
        action: action.id,
        actionLabel: safeText(action.label, "تعذر التوصيل"),
        isDangerous: true,
      });
      return;
    }
    runAction(item, action.id, payload, action);
  };

  const handleReasonSubmit = (values: { reason: string; notes?: string }) => {
    if (!reasonDialog.item || !reasonDialog.action) return;
    const actionDef = reasonDialog.item.allowedActions?.find(
      (entry) => entry.id === reasonDialog.action
    );
    runAction(
      reasonDialog.item,
      reasonDialog.action,
      buildOperationsActionPayload(
        reasonDialog.item,
        reasonDialog.action,
        values.reason,
        values.notes
      ),
      actionDef
    );
    setReasonDialog(EMPTY_REASON_DIALOG);
  };

  const businessDate = listRes?.data?.date || format(new Date(), "yyyy-MM-dd");
  const lastUpdated = dataUpdatedAt
    ? new Intl.DateTimeFormat("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(dataUpdatedAt)
    : "—";
  const pendingItemId = actionMutation.isPending
    ? actionMutation.variables?.itemId
    : null;
  const hasActiveFilters =
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    windowFilter !== "all" ||
    zoneFilter !== "all" ||
    actionFilter !== "all" ||
    Boolean(searchStr.trim());

  return (
    <div className="mx-auto flex min-h-[calc(100vh-var(--header-height))] w-full max-w-[1800px] flex-col gap-3 px-3 pb-6 sm:px-4 md:gap-4 md:px-6 md:pt-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            التوصيل
          </h1>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground md:text-sm">
            متابعة التوصيلات وتحضير الطلبات من شاشة واحدة لصلاحية التوصيل.
          </p>
        </div>
        {activeWorkspace === "tracking" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-xl border bg-muted/30 px-4 py-2 text-right">
              <span className="block text-[11px] font-bold text-muted-foreground">
                يوم التشغيل
              </span>
              <span dir="ltr" className="font-mono text-sm font-bold">
                {businessDate}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              disabled={isFetching}
              onClick={() => refetch()}
              aria-label="تحديث بيانات التوصيل"
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              {isFetching ? "جارٍ التحديث" : "تحديث"}
            </Button>
          </div>
        ) : null}
      </div>

      <Tabs
        value={activeWorkspace}
        onValueChange={(value) =>
          setActiveWorkspace(value as DeliveryWorkspace)
        }
        className="flex flex-col gap-4"
        dir="rtl"
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-sm sm:w-fit">
          <TabsTrigger
            value="tracking"
            className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5"
          >
            <Truck className="h-4 w-4" />
            متابعة التوصيل
          </TabsTrigger>
          <TabsTrigger
            value="preparation"
            className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5"
          >
            <ChefHat className="h-4 w-4" />
            تحضير طلبات التوصيل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="mt-0 flex flex-col gap-4">
          <div
            aria-live="polite"
            className="min-h-5 px-1 text-xs text-muted-foreground"
          >
            {isFetching && !isLoading
              ? "جارٍ جلب أحدث بيانات التوصيل من الخادم..."
              : `آخر تحديث: ${lastUpdated}`}
          </div>

          {isError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
              <h2 className="font-bold text-destructive">
                تعذر تحميل بيانات التوصيل
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {(error as Error)?.message ||
                  "حدث خطأ غير متوقع أثناء الاتصال بالخادم."}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => refetch()}>
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <DeliveryDashboardCards data={baseData} isLoading={isLoading} />
              </div>

              <DeliveryFilters
                searchStr={searchStr}
                onSearchChange={setSearchStr}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                windowFilter={windowFilter}
                onWindowFilterChange={setWindowFilter}
                zoneFilter={zoneFilter}
                onZoneFilterChange={setZoneFilter}
                actionFilter={actionFilter}
                onActionFilterChange={setActionFilter}
                onReset={resetFilters}
                baseData={baseData}
              />

              <div className="flex items-start gap-2 rounded-xl border border-blue-500/15 bg-blue-50/70 p-3 text-xs text-blue-800 md:text-sm dark:bg-blue-950/30 dark:text-blue-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  الإجراءات الظاهرة مملوكة للباكند ويتم تحديث الكارت بعد نجاح كل
                  إجراء.
                </span>
              </div>

              <div className="rounded-2xl border bg-muted/5 p-3 md:p-4">
                <DeliveryList
                  data={displayData}
                  isLoading={isLoading}
                  onActionClick={handleActionClick}
                  pendingItemId={pendingItemId}
                  emptyMessage={
                    hasActiveFilters
                      ? "لا توجد نتائج مطابقة للفلاتر الحالية. أعد ضبط الفلاتر لعرض كل التوصيلات."
                      : "لا توجد توصيلات في يوم التشغيل الحالي."
                  }
                />
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="preparation" className="mt-0">
          <div className="rounded-2xl border bg-card p-3 shadow-sm md:p-4">
            <DeliveryOperationsBoard />
          </div>
        </TabsContent>
      </Tabs>

      <ReasonActionDialog
        dialogState={reasonDialog}
        onOpenChange={(open) =>
          setReasonDialog((current) => (open ? current : EMPTY_REASON_DIALOG))
        }
        onSubmit={handleReasonSubmit}
        isPending={actionMutation.isPending}
      />
    </div>
  );
}
