import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { OperationsBoardSkeleton } from "@/components/pages/operations-board/OperationsBoardSkeleton";
import { OperationsCourierBoard } from "@/components/pages/operations-board/OperationsCourierBoard";
import { ReasonActionDialog } from "@/components/pages/pickup-board/ReasonActionDialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { useOperationsBoard } from "@/hooks/useOperationsBoard";
import { useOperationsBoardDialog } from "@/hooks/useOperationsBoardDialog";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";

export function DeliveryOperationsBoard() {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const {
    visibleScreens,
    itemsByScreen,
    isLoading,
    isPending,
    pendingActions,
    requestAction,
  } = useOperationsBoard({ date, q: debouncedSearch });
  const { dialogState, openReasonDialog, closeDialog } =
    useOperationsBoardDialog();
  const dialogOrderPending = Boolean(
    dialogState.item && pendingActions?.[dialogState.item.id]
  );

  const handleRequestAction = (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous = false
  ) => {
    const actionDef = item.allowedActions?.find((entry) => entry.id === action);

    if (actionDef?.requiresReason) {
      openReasonDialog(item, action, actionLabel, isDangerous);
      return;
    }

    requestAction(item, action, actionLabel, isDangerous);
  };

  const handleReasonConfirm = async (reason?: string, notes?: string) => {
    if (!dialogState.item || !dialogState.action) return;

    const didSubmit = await requestAction(
      dialogState.item,
      dialogState.action,
      dialogState.actionLabel,
      dialogState.isDangerous,
      reason?.trim(),
      notes?.trim()
    );

    if (didSubmit) closeDialog();
  };

  if (isLoading) {
    return <OperationsBoardSkeleton />;
  }

  if (!visibleScreens.includes("courier")) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-right" dir="rtl">
        <h2 className="text-lg font-bold">تحضير طلبات التوصيل</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          حسابك الحالي لا يملك صلاحية عرض عمليات التوصيل.
        </p>
      </div>
    );
  }

  return (
    <div
      className="operations-board-rtl flex flex-col gap-5 text-right sm:gap-6"
      dir="rtl"
    >
      <div className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            تحضير طلبات التوصيل
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            نفس طابور التوصيل الموجود في لوحة العمليات، مع إجراءات التحضير المرسلة
            من الخادم قبل خروج الطلب للتسليم.
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

      <OperationsCourierBoard
        items={itemsByScreen.courier ?? []}
        isPending={isPending}
        pendingActions={pendingActions}
        onAction={handleRequestAction}
      />

      <ReasonActionDialog
        dialogState={{
          open: !!dialogState.item && !!dialogState.action,
          item: dialogState.item,
          action: dialogState.action,
          actionLabel: dialogState.actionLabel,
          isDangerous: dialogState.isDangerous,
        }}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        onSubmit={(values) => handleReasonConfirm(values.reason, values.notes)}
        isPending={dialogOrderPending}
      />
    </div>
  );
}
