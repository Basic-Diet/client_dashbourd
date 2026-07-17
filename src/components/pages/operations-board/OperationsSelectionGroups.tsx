import { Badge } from "@/components/ui/badge";
import type { OperationsSelectionGroup } from "@/lib/operationsOrderPresentation";
import { formatOperationsSar } from "@/lib/operationsOrderPresentation";

interface OperationsSelectionGroupsProps {
  groups: OperationsSelectionGroup[];
  preview?: boolean;
  limit?: number;
}

export function OperationsSelectionGroups({
  groups,
  preview = false,
  limit = 8,
}: OperationsSelectionGroupsProps) {
  const visibleGroups = preview ? groups.slice(0, 3) : groups;
  const visibleCount = visibleGroups.reduce((sum, group) => {
    return sum + (preview ? Math.min(group.options.length, limit) : group.options.length);
  }, 0);
  const totalCount = groups.reduce((sum, group) => sum + group.options.length, 0);

  if (!groups.length) {
    return (
      <p className="rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
        لا توجد مكونات محددة لهذا الصنف.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {visibleGroups.map((group) => {
        const options = preview ? group.options.slice(0, limit) : group.options;
        return (
          <div
            key={group.name}
            className="rounded-lg border border-border/70 bg-background/70 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="break-words text-xs font-bold text-foreground">
                {group.name}
              </p>
              <Badge variant="outline" className="shrink-0 rounded-md text-[10px]">
                {group.options.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {options.map((option) => (
                <Badge
                  key={option.signature}
                  variant={option.paidAmountHalala > 0 ? "secondary" : "outline"}
                  className="max-w-full rounded-md px-2 py-1 text-[11px]"
                >
                  <span className="break-words">
                    {option.optionName}
                    {option.quantity > 1 ? ` ×${option.quantity}` : ""}
                    {option.paidAmountHalala > 0
                      ? ` +${formatOperationsSar(option.paidAmountHalala)}`
                      : ""}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
      {preview && totalCount > visibleCount ? (
        <p className="text-xs font-semibold text-muted-foreground">
          +{totalCount - visibleCount} أخرى
        </p>
      ) : null}
    </div>
  );
}
