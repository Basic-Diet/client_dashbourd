import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { getCourierItems } from "@/lib/operationsBoard";
import { OperationsQueueCharts } from "./OperationsQueueCharts";
import { OperationsQueueTable } from "./OperationsQueueTable";

interface OperationsCourierBoardProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  pendingActionKey?: string | null;
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
  pendingActionKey,
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
        pendingActionKey={pendingActionKey}
        onAction={onAction}
      />
    </div>
  );
}
