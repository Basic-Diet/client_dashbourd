import { Badge } from "@/components/ui/badge";
import type { OperationsPresentedItem } from "@/lib/operationsOrderPresentation";
import { formatOperationsSar } from "@/lib/operationsOrderPresentation";

interface OperationsOrderItemSummaryProps {
  item: OperationsPresentedItem;
  compact?: boolean;
}

export function OperationsOrderItemSummary({
  item,
  compact = false,
}: OperationsOrderItemSummaryProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-foreground">{item.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="rounded-md text-[11px]">
              ×{item.quantity}
            </Badge>
            <Badge variant="outline" className="rounded-md text-[11px]">
              {item.uniqueSelectionCount} اختيار
            </Badge>
            <Badge variant="outline" className="rounded-md text-[11px]">
              {item.selectionGroups.length} مجموعات
            </Badge>
          </div>
        </div>
        {item.lineTotalHalala !== null ? (
          <div className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary">
            {formatOperationsSar(item.lineTotalHalala)}
          </div>
        ) : null}
      </div>

      {item.paidSelections.length ? (
        <div className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            اختيارات مدفوعة
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.paidSelections.map((option) => (
              <Badge
                key={option.signature}
                variant="secondary"
                className="rounded-md text-[10px]"
              >
                {option.optionName} +{formatOperationsSar(option.priceHalala)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && item.notes ? (
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800">
          ملاحظة: {item.notes}
        </p>
      ) : null}
    </div>
  );
}
