import { Badge } from "@/components/ui/badge";
import type { PresentedKitchenAddonGroup } from "@/lib/operationsKitchenV2Presentation";

export function OperationsKitchenAddonGroups({
  groups,
  compact = false,
}: {
  groups: PresentedKitchenAddonGroup[];
  compact?: boolean;
}) {
  if (!groups.length) return null;

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.key} className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-sm font-bold">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.items.slice(0, compact ? 4 : undefined).map((item) => (
              <Badge key={`${group.key}-${item.name}`} variant="secondary" className="rounded-md">
                {item.name} x{item.quantity}
                {item.paidAmountHalala > 0 ? ` - ${item.paidLabel}` : ""}
              </Badge>
            ))}
            {compact && group.items.length > 4 ? (
              <Badge variant="outline">+{group.items.length - 4}</Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
