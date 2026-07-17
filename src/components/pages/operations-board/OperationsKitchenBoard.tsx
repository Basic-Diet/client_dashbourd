import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import type { PendingOperationsActions } from "@/hooks/useOperationsBoard";
import { buildKitchenV2Presentation } from "@/lib/operationsKitchenV2Presentation";
import { OperationsQueueCharts } from "./OperationsQueueCharts";
import { OperationsQueueTable } from "./OperationsQueueTable";

interface OperationsKitchenBoardProps {
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

type KitchenStatusFilter =
  | "all"
  | "not_prepared"
  | "open"
  | "locked"
  | "confirmed"
  | "in_preparation"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "fulfilled"
  | "no_show"
  | "pending_payment"
  | "cancelled"
  | "expired";

const statusOptions: { value: KitchenStatusFilter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "not_prepared", label: "لم يُحضّر" },
  { value: "open", label: "مفتوح" },
  { value: "locked", label: "مقفول" },
  { value: "confirmed", label: "مؤكد" },
  { value: "in_preparation", label: "قيد التحضير" },
  { value: "ready_for_pickup", label: "جاهز للاستلام" },
  { value: "out_for_delivery", label: "خرج للتوصيل" },
  { value: "fulfilled", label: "تم الاستلام" },
  { value: "no_show", label: "لم يحضر" },
  { value: "pending_payment", label: "بانتظار الدفع" },
  { value: "cancelled", label: "ملغي" },
  { value: "expired", label: "منتهي الصلاحية" },
];

function matchesKitchenFilter(
  itemStatus: string,
  filter: KitchenStatusFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "not_prepared") {
    return ["open", "locked", "confirmed"].includes(itemStatus);
  }
  return itemStatus === filter;
}

function pickupSearchText(item: UnifiedQueueItem) {
  const pickup = item.fulfillment?.pickup || item.pickup || {};
  const branch =
    typeof pickup.branchName === "string"
      ? pickup.branchName
      : pickup.branchName?.ar || pickup.branchName?.en || pickup.branchId || pickup.locationId || "";
  return [branch, pickup.pickupWindow, pickup.pickupCode, pickup.pickupCodeState]
    .filter(Boolean)
    .join(" ");
}

function canonicalSearchText(item: UnifiedQueueItem) {
  const kitchen = buildKitchenV2Presentation(item);
  return [
    item.customer?.name,
    item.customer?.phone,
    item.reference,
    item.orderNumber,
    item.status,
    item.statusLabel,
    pickupSearchText(item),
    kitchen.searchText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function OperationsKitchenBoard({
  items = [],
  isPending,
  pendingActions,
  onAction,
}: OperationsKitchenBoardProps) {
  const [statusFilter, setStatusFilter] = useState<KitchenStatusFilter>("all");
  const [localSearch, setLocalSearch] = useState("");

  const selectedStatus = statusOptions.find((opt) => opt.value === statusFilter);
  const filteredItems = items.filter((item) => {
    const matchesStatus = matchesKitchenFilter(item.status, statusFilter);
    const query = localSearch.trim().toLowerCase();
    const matchesSearch = query ? canonicalSearchText(item).includes(query) : true;
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <OperationsQueueCharts
        items={items}
        title="ضغط المطبخ اليوم"
        description="توزيع حالات التحضير ومصادر الطلبات بدلا من كروت أرقام كثيرة."
      />

      <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:p-4 lg:grid-cols-[minmax(16rem,1fr)_18rem_11rem] lg:items-center">
        <div className="relative w-full">
          <Input
            placeholder="ابحث في عناصر المطبخ..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="relative h-10 rounded-lg border-transparent bg-muted/50 pr-10 pl-10 transition-colors hover:border-border focus-visible:ring-1"
          />
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as KitchenStatusFilter)}
        >
          <SelectTrigger className="h-10 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="فلترة الحالة" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusOptions.map((opt) => {
                const count = items.filter((i) =>
                  matchesKitchenFilter(i.status, opt.value)
                ).length;
                return (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} ({count})
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm font-semibold text-muted-foreground">
          {selectedStatus?.label || "الكل"}: {filteredItems.length}
        </div>
      </div>

      <OperationsQueueTable
        items={filteredItems}
        isPending={isPending}
        pendingActions={pendingActions}
        onAction={onAction}
      />
    </div>
  );
}

export default OperationsKitchenBoard;
