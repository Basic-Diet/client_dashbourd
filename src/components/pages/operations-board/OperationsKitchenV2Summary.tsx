import { AlertTriangle, ChefHat, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PresentedKitchenV2 } from "@/lib/operationsKitchenV2Presentation";
import { OperationsKitchenAddonGroups } from "./OperationsKitchenAddonGroups";
import { OperationsKitchenV2Card } from "./OperationsKitchenV2Card";
import { OperationsKitchenWarnings } from "./OperationsKitchenWarnings";

export function OperationsKitchenV2Summary({
  presentation,
  compact = true,
}: {
  presentation: PresentedKitchenV2;
  compact?: boolean;
}) {
  if (!presentation.supported) {
    return (
      <div className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{presentation.unsupportedMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <ChefHat className="h-4 w-4 text-primary" />
            {presentation.mealCount} وجبة
          </p>
          <Badge variant="outline">{presentation.cardCount} كروت</Badge>
          <Badge variant="outline" className="gap-1">
            <PlusCircle className="h-3 w-3" />
            {presentation.addonItemCount} إضافات
          </Badge>
          {presentation.isEmptyKitchenDay ? (
            <Badge variant="secondary">يوم بدون تحضير مطبخ</Badge>
          ) : null}
        </div>
      </div>

      {presentation.cards.length ? (
        <div className="grid gap-2">
          {presentation.cards.map((card) => (
            <OperationsKitchenV2Card key={card.key} card={card} compact={compact} />
          ))}
        </div>
      ) : null}

      <OperationsKitchenAddonGroups groups={presentation.addonGroups} compact={compact} />
      <OperationsKitchenWarnings warnings={presentation.warningMessages} />
    </div>
  );
}
