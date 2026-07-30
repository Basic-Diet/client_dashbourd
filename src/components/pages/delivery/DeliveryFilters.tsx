import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DashboardOpsStatusFilter,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";
import {
  countDeliveryByStatusFilter,
  getDeliveryOperationWindow,
  getDeliveryOperationZone,
  type DeliveryActionFilter,
  type DeliverySourceFilter,
} from "@/lib/deliveryOperations";

const FILTER_TABS: { label: string; value: DashboardOpsStatusFilter }[] = [
  { label: "الكل", value: "all" },
  { label: "قيد التحضير", value: "preparing" },
  { label: "في الطريق", value: "out_for_delivery" },
  { label: "تم التسليم", value: "delivered" },
  { label: "ملغي", value: "canceled" },
];

interface DeliveryFiltersProps {
  searchStr: string;
  onSearchChange: (val: string) => void;
  statusFilter: DashboardOpsStatusFilter;
  onStatusChange: (val: DashboardOpsStatusFilter) => void;
  sourceFilter: DeliverySourceFilter;
  onSourceFilterChange: (val: DeliverySourceFilter) => void;
  windowFilter: string;
  onWindowFilterChange: (val: string) => void;
  zoneFilter: string;
  onZoneFilterChange: (val: string) => void;
  actionFilter: DeliveryActionFilter;
  onActionFilterChange: (val: DeliveryActionFilter) => void;
  onReset: () => void;
  baseData: UnifiedQueueItem[];
  statusCountData: UnifiedQueueItem[];
  visibleCount: number;
}

function uniqueValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "ar"));
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-bold text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DeliveryFilters({
  searchStr,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceFilterChange,
  windowFilter,
  onWindowFilterChange,
  zoneFilter,
  onZoneFilterChange,
  actionFilter,
  onActionFilterChange,
  onReset,
  baseData,
  statusCountData,
  visibleCount,
}: DeliveryFiltersProps) {
  const windows = uniqueValues(baseData.map(getDeliveryOperationWindow));
  const zones = uniqueValues(baseData.map(getDeliveryOperationZone));

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-3 shadow-sm md:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="relative w-full">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو الهاتف أو المرجع أو العنوان أو المنطقة..."
            value={searchStr}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-h-11 w-full border-muted bg-background pr-10 text-sm shadow-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={onReset}
        >
          مسح الفلاتر
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>
          عرض <strong className="text-foreground">{visibleCount}</strong> من أصل{" "}
          <strong className="text-foreground">{baseData.length}</strong> توصيل
        </span>
        <span>أعداد الحالات تتحدث حسب باقي الفلاتر المختارة.</span>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="custom-scrollbar flex w-full overflow-x-auto rounded-full bg-muted/50 p-1">
          {FILTER_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const count = countDeliveryByStatusFilter(statusCountData, tab.value);
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={`flex min-w-max items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all md:px-5 md:text-sm ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] md:h-5 md:min-w-5 md:text-xs ${
                    isActive
                      ? "bg-muted text-muted-foreground"
                      : "bg-background/50 text-muted-foreground/70"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SelectFilter
          label="نوع الطلب"
          value={sourceFilter}
          onChange={(value) =>
            onSourceFilterChange(value as DeliverySourceFilter)
          }
          options={[
            { label: "كل الأنواع", value: "all" },
            { label: "اشتراكات", value: "subscription" },
            { label: "طلبات فردية", value: "one_time_order" },
          ]}
        />
        <SelectFilter
          label="نافذة التوصيل"
          value={windowFilter}
          onChange={onWindowFilterChange}
          options={[
            { label: "كل الأوقات", value: "all" },
            ...windows.map((value) => ({ label: value, value })),
          ]}
        />
        <SelectFilter
          label="المنطقة"
          value={zoneFilter}
          onChange={onZoneFilterChange}
          options={[
            { label: "كل المناطق", value: "all" },
            ...zones.map((value) => ({ label: value, value })),
          ]}
        />
        <SelectFilter
          label="الإجراء"
          value={actionFilter}
          onChange={(value) =>
            onActionFilterChange(value as DeliveryActionFilter)
          }
          options={[
            { label: "كل الإجراءات", value: "all" },
            { label: "يحتاج إجراء", value: "needs_action" },
            { label: "جاهز للخروج للتوصيل", value: "ready_to_collect" },
            { label: "في الطريق", value: "out_for_delivery" },
            { label: "بدون إجراءات", value: "no_actions" },
          ]}
        />
      </div>
    </div>
  );
}
