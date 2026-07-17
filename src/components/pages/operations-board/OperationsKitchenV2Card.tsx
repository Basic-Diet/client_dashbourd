import { Badge } from "@/components/ui/badge";
import type { PresentedKitchenCard } from "@/lib/operationsKitchenV2Presentation";
import { OperationsKitchenSectionList } from "./OperationsKitchenSectionList";
import { OperationsKitchenWarnings } from "./OperationsKitchenWarnings";

export function OperationsKitchenV2Card({
  card,
  compact = false,
}: {
  card: PresentedKitchenCard;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-bold">{card.title}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {card.badge ? <Badge variant="secondary">{card.badge}</Badge> : null}
            <Badge variant="outline">x{card.quantity}</Badge>
            <Badge variant="outline">{card.sectionCount} أقسام</Badge>
            <Badge variant="outline">{card.itemCount} مكوّن</Badge>
          </div>
        </div>
      </div>

      {card.lines.length || card.componentLines.length ? (
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {[...card.lines, ...card.componentLines].slice(0, compact ? 3 : undefined).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}

      {card.paidExtras.length ? (
        <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          {card.paidExtras.slice(0, compact ? 2 : undefined).map((extra) => (
            <p key={`${extra.sectionLabel}-${extra.name}`}>
              إضافة مدفوعة: {extra.name}
              {extra.grams ? ` - ${extra.grams} جم` : ""} - {extra.label}
            </p>
          ))}
        </div>
      ) : null}

      {card.notes && !compact ? (
        <p className="mt-3 rounded-lg bg-muted/35 px-3 py-2 text-sm">{card.notes}</p>
      ) : null}

      {!compact ? (
        <div className="mt-3 space-y-3">
          <OperationsKitchenSectionList sections={card.sections} />
          <OperationsKitchenWarnings warnings={card.warnings} />
        </div>
      ) : null}
    </div>
  );
}
