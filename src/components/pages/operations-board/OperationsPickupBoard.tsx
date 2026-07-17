import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { getPickupItems } from "@/lib/operationsBoard";
import { OperationsQueueCharts } from "./OperationsQueueCharts";
import { OperationsQueueTable } from "./OperationsQueueTable";

interface OperationsPickupBoardProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  pendingActionKey?: string | null;
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
  pendingActionKey,
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
        pendingActionKey={pendingActionKey}
        onAction={onAction}
        onFulfill={onFulfill}
      />
    </div>
  );
}
