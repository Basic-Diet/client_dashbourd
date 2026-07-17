import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import type { PendingOperationsActions } from "@/hooks/useOperationsBoard";
import { getCourierItems } from "@/lib/operationsBoard";
import { OperationsQueueCharts } from "./OperationsQueueCharts";
import { OperationsQueueTable } from "./OperationsQueueTable";

interface OperationsCourierBoardProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  pendingActions?: PendingOperationsActions;
  onAction: (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous?: boolean
  ) => void;
}

export function OperationsCourierBoard({
  items = [],
  isPending,
  pendingActions,
  onAction,
}: OperationsCourierBoardProps) {
  const courierItems = getCourierItems(items);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <OperationsQueueCharts
        items={courierItems}
        title="التوصيل من العمليات"
        description="توزيع سريع لحالات التوصيل وما يحتاج إجراء قبل تسليم الطلبات."
      />
      <OperationsQueueTable
        items={courierItems}
        isPending={isPending}
        pendingActions={pendingActions}
        onAction={onAction}
      />
    </div>
  );
}
