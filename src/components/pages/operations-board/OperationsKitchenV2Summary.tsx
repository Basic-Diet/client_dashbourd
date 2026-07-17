import { AlertTriangle, ChefHat, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PresentedKitchenV2 } from "@/lib/operationsKitchenV2Presentation";
import { OperationsKitchenAddonGroups } from "./OperationsKitchenAddonGroups";
import { OperationsKitchenV2Card } from "./OperationsKitchenV2Card";
import { OperationsKitchenWarnings } from "./OperationsKitchenWarnings";

type PaidExtra = PresentedKitchenV2["cards"][number]["paidExtras"][number];

function dedupeValues(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function paidExtraKey(extra: PaidExtra) {
  return `${extra.sectionLabel}|${extra.name}|${extra.amount}|${extra.grams ?? ""}`;
}

function dedupePaidExtras(extras: PaidExtra[]) {
  const seen = new Set<string>();
  return extras.filter((extra) => {
    const key = paidExtraKey(extra);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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

  const visibleCards = compact ? presentation.cards.slice(0, 2) : presentation.cards;
  const hiddenCards = compact ? presentation.cards.slice(2) : [];
  const hiddenPaidExtras = dedupePaidExtras(hiddenCards.flatMap((card) => card.paidExtras));
  const compactWarnings = compact
    ? dedupeValues([
        ...visibleCards.flatMap((card) => card.warnings),
        ...hiddenCards.flatMap((card) => card.warnings),
        ...presentation.warningMessages,
      ])
    : presentation.warningMessages;

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
          {visibleCards.map((card) => (
            <OperationsKitchenV2Card key={card.key} card={card} compact={compact} />
          ))}
          {hiddenCards.length ? (
            <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
              <p>+{hiddenCards.length} بطاقات تحضير أخرى</p>
              {hiddenPaidExtras.length ? (
                <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                  إضافات مدفوعة في البطاقات المخفية:{" "}
                  {hiddenPaidExtras
                    .slice(0, 2)
                    .map((extra) => `${extra.name} - ${extra.label}`)
                    .join("، ")}
                </p>
              ) : null}
              {hiddenPaidExtras.length > 2 ? (
                <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                  +{hiddenPaidExtras.length - 2} إضافات مدفوعة أخرى
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <OperationsKitchenAddonGroups groups={presentation.addonGroups} compact={compact} />
      {compact && compactWarnings.length ? (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
          {compactWarnings.slice(0, 2).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
          {compactWarnings.length > 2 ? (
            <p>+{compactWarnings.length - 2} تنبيهات أخرى</p>
          ) : null}
        </div>
      ) : (
        <OperationsKitchenWarnings warnings={presentation.warningMessages} />
      )}
    </div>
  );
}
