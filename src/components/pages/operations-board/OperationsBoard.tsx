import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChefHat, Search, Store, Truck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { FulfillDialog } from "@/components/pages/pickup-board/FulfillDialog";
import { ReasonActionDialog } from "@/components/pages/pickup-board/ReasonActionDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { useOperationsBoard } from "@/hooks/useOperationsBoard";
import { useOperationsBoardDialog } from "@/hooks/useOperationsBoardDialog";
import { getSafeOperationsTab } from "@/lib/operationsBoard";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { OperationsBoardSkeleton } from "./OperationsBoardSkeleton";
import { OperationsCourierBoard } from "./OperationsCourierBoard";
import { OperationsKitchenBoard } from "./OperationsKitchenBoard";
import { OperationsPickupBoard } from "./OperationsPickupBoard";
import { Route } from "@/routes/_protected/operations";

export function OperationsBoard() {
  const { tab: tabFromUrl } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const { visibleScreens, itemsByScreen, isLoading, isPending, requestAction } =
    useOperationsBoard({ date, q: debouncedSearch });
  const { dialogState, openReasonDialog, openFulfillDialog, closeDialog } =
    useOperationsBoardDialog();
  const activeTab = getSafeOperationsTab(tabFromUrl, visibleScreens);

  const handleTabChange = (value: string) => {
    if (value === activeTab) {
      return;
    }

    navigate({ search: (prev) => ({ ...prev, tab: value }) });
  };

  const handleRequestAction = (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous = false
  ) => {
    const actionDef = item.allowedActions?.find((a) => a.id === action);

    if (actionDef?.requiresReason) {
      openReasonDialog(item, action, actionLabel, isDangerous);
      return;
    }

    requestAction(item, action, actionLabel, isDangerous);
  };

  const handleReasonConfirm = (reason?: string, notes?: string) => {
    if (dialogState.item && dialogState.action) {
      requestAction(
        dialogState.item,
        dialogState.action,
        dialogState.actionLabel,
        dialogState.isDangerous,
        reason,
        notes
      );
    }

    closeDialog();
  };

  const handleFulfillConfirm = (pickupCode?: string) => {
    if (dialogState.item) {
      requestAction(
        dialogState.item,
        "fulfill",
        "تم الاستلام",
        false,
        undefined,
        undefined,
        pickupCode
      );
    }

    closeDialog();
  };

  if (isLoading) {
    return <OperationsBoardSkeleton />;
  }

  if (visibleScreens.length === 0) {
    return (
      <div className="operations-board-rtl flex flex-col gap-4 p-6" dir="rtl">
        <h1 className="text-2xl font-bold tracking-tight">لوحة العمليات</h1>
        <p className="text-sm text-muted-foreground">
          حسابك الحالي لا يملك صلاحية عرض طوابير العمليات. تواصل مع المسؤول إذا
          كنت تحتاج الوصول.
        </p>
      </div>
    );
  }

  return (
    <div className="operations-board-rtl flex flex-col gap-5 p-4 text-right sm:gap-6 sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">لوحة العمليات</h1>
          <p className="text-sm text-muted-foreground">
            متابعة وتجهيز الطلبات اليومية وطلبات الاستلام والتوصيل
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[11rem_minmax(16rem,18rem)] sm:items-center">
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full pr-10 text-right sm:w-44"
              dir="rtl"
            />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالعميل أو الهاتف أو المرجع"
              className="h-10 w-full pr-10 text-right sm:w-72"
              dir="rtl"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} dir="rtl">
        <TabsList className="mb-4 h-auto max-w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1 sm:flex-wrap">
          {visibleScreens.includes("kitchen") && (
            <TabsTrigger value="kitchen" className="flex shrink-0 items-center gap-2">
              <ChefHat className="h-4 w-4" />
              التحضير
              <Badge variant="secondary" className="mr-1 min-w-5 justify-center">
                {(itemsByScreen.kitchen ?? []).length}
              </Badge>
            </TabsTrigger>
          )}
          {visibleScreens.includes("pickup") && (
            <TabsTrigger value="pickup" className="flex shrink-0 items-center gap-2">
              <Store className="h-4 w-4" />
              استلام الفرع
              <Badge variant="secondary" className="mr-1 min-w-5 justify-center">
                {(itemsByScreen.pickup ?? []).length}
              </Badge>
            </TabsTrigger>
          )}
          {visibleScreens.includes("courier") && (
            <TabsTrigger value="courier" className="flex shrink-0 items-center gap-2">
              <Truck className="h-4 w-4" />
              التوصيل
              <Badge variant="secondary" className="mr-1 min-w-5 justify-center">
                {(itemsByScreen.courier ?? []).length}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="kitchen">
          <OperationsKitchenBoard
            items={itemsByScreen.kitchen ?? []}
            isPending={isPending}
            onAction={handleRequestAction}
          />
        </TabsContent>
        <TabsContent value="pickup">
          <OperationsPickupBoard
            items={itemsByScreen.pickup ?? []}
            isPending={isPending}
            onAction={handleRequestAction}
            onFulfill={openFulfillDialog}
          />
        </TabsContent>
        <TabsContent value="courier">
          <OperationsCourierBoard
            items={itemsByScreen.courier ?? []}
            isPending={isPending}
            onAction={handleRequestAction}
          />
        </TabsContent>
      </Tabs>

      <ReasonActionDialog
        dialogState={{
          open:
            !!dialogState.item &&
            !!dialogState.action &&
            !dialogState.isFulfillOpen,
          item: dialogState.item,
          action: dialogState.action,
          actionLabel: dialogState.actionLabel,
          isDangerous: dialogState.isDangerous,
        }}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSubmit={(values) => handleReasonConfirm(values.reason, values.notes)}
        isPending={isPending}
      />

      <FulfillDialog
        item={dialogState.isFulfillOpen ? dialogState.item : null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSubmit={(values) => handleFulfillConfirm(values.pickupCode)}
        isPending={isPending}
      />
    </div>
  );
}

export default OperationsBoard;
