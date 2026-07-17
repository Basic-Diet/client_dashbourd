import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import type { PendingOperationsActions } from "@/hooks/useOperationsBoard";
import { getPickupItems } from "@/lib/operationsBoard";
import { OperationsQueueCharts } from "./OperationsQueueCharts";
import { OperationsQueueTable } from "./OperationsQueueTable";

interface OperationsPickupBoardProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  pendingActions?: PendingOperationsActions;
  onAction: (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous?: boolean
  ) => void;
  onFulfill: (item: UnifiedQueueItem) => void;
}

export function OperationsPickupBoard({
  items = [],
  isPending,
  pendingActions,
  onAction,
  onFulfill,
}: OperationsPickupBoardProps) {
  const pickupItems = getPickupItems(items);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <OperationsQueueCharts
        items={pickupItems}
        title="استلام الفرع"
        description="ملخص بصري لحالات طلبات الاستلام والإجراءات المطلوبة."
      />
      <OperationsQueueTable
        items={pickupItems}
        isPending={isPending}
        pendingActions={pendingActions}
        onAction={onAction}
        onFulfill={onFulfill}
      />
    </div>
  );
}
