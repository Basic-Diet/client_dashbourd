import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Layers3,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";

const OPERATION_LABEL_TRANSLATIONS: Record<string, string> = {
  "your order is ready": "طلبك جاهز",
  ready: "جاهز",
  pending: "قيد الانتظار",
  "pending preparation": "بانتظار التحضير",
  "in preparation": "قيد التحضير",
  preparing: "قيد التحضير",
  prepared: "تم التحضير",
  "ready for pickup": "جاهز لاستلام الفرع",
  "ready for delivery": "جاهز للتوصيل",
  dispatched: "خرج للتوصيل",
  delivered: "تم التوصيل",
  fulfilled: "مكتمل",
  completed: "مكتمل",
  cancelled: "ملغي",
  canceled: "ملغي",
  "picked up": "تم استلام الفرع",
  prepare: "بدء التحضير",
  "start preparation": "بدء التحضير",
  dispatch: "إرسال للتوصيل",
  fulfill: "إنهاء الطلب",
  lock: "قفل",
  reopen: "إعادة فتح",
  cancel: "إلغاء",
};

function formatCount(value: number) {
  return value.toLocaleString("ar-EG");
}

function normalizeLabelKey(label: string) {
  return label.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function translateOperationLabel(label?: string | null, fallback = "غير محدد") {
  const rawLabel = label?.trim();
  if (!rawLabel) return fallback;

  const translated = OPERATION_LABEL_TRANSLATIONS[normalizeLabelKey(rawLabel)];
  if (translated) return translated;

  if (/^[a-z0-9_\-\s]+$/i.test(rawLabel) && /[a-z]/i.test(rawLabel)) {
    return rawLabel.replace(/[_-]+/g, " ");
  }

  return rawLabel;
}

function getStatusLabel(item: UnifiedQueueItem) {
  return translateOperationLabel(item.statusLabel || item.ui?.label || item.status);
}

function getSourceLabel(item: UnifiedQueueItem) {
  if (isPickupRequest(item)) return "استلام فرع";
  if (isOneTimeOrder(item)) return "طلب فردي";
  return "اشتراك يومي";
}

function countByLabel<T>(items: T[], getLabel: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const label = getLabel(item) || "غير محدد";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function getTopLabel(rows: Array<{ label: string; count: number }>) {
  return rows[0]?.label || "لا يوجد";
}

function getActionCounts(items: UnifiedQueueItem[]) {
  const needsAction = items.filter((item) => item.allowedActions?.length).length;
  return {
    needsAction,
    stable: Math.max(0, items.length - needsAction),
  };
}

function getPrimaryActionLabel(items: UnifiedQueueItem[]) {
  const actionRows = countByLabel(
    items.flatMap((item) => item.allowedActions || []),
    (action) => translateOperationLabel(action.label || action.id, "إجراء")
  );
  return getTopLabel(actionRows);
}

function SummaryTile({
  title,
  value,
  helper,
  icon: Icon,
  emphasis = "default",
}: {
  title: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  emphasis?: "default" | "action" | "calm";
}) {
  const isNumber = typeof value === "number";
  const valueText = isNumber ? formatCount(value) : value;
  const accentClass =
    emphasis === "action"
      ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400"
      : emphasis === "calm"
        ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400"
        : "bg-primary/10 text-primary ring-primary/20";
  const railClass =
    emphasis === "action"
      ? "from-amber-500/70 to-amber-500/10"
      : emphasis === "calm"
        ? "from-emerald-500/70 to-emerald-500/10"
        : "from-primary/70 to-primary/10";

  return (
    <article className="group relative overflow-hidden rounded-[1.7rem] border border-border/60 bg-background/55 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/75 hover:shadow-md">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-5 right-0 w-1 rounded-l-full bg-gradient-to-b",
          railClass
        )}
      />
      <div className="relative flex items-start justify-between gap-3 pr-2">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-bold text-muted-foreground">{title}</p>
          <p
            className={cn(
              "tracking-tight text-foreground",
              isNumber
                ? "text-4xl font-black leading-none tabular-nums sm:text-[2.6rem]"
                : "text-xl font-extrabold leading-7 sm:text-2xl"
            )}
          >
            {valueText}
          </p>
        </div>
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-transform group-hover:scale-105",
            accentClass
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p className="relative mt-3 line-clamp-2 min-h-10 pr-2 text-xs leading-5 text-muted-foreground">
        {helper}
      </p>
    </article>
  );
}

export function OperationsQueueCharts({
  items,
  title = "قراءة سريعة للطابور",
  description = "ملخص تشغيلي بسيط يوضح المرحلة بدون تشتيت عن جدول الطلبات.",
}: {
  items: UnifiedQueueItem[];
  title?: string;
  description?: string;
}) {
  const total = items.length;
  const sourceRows = countByLabel(items, getSourceLabel);
  const statusRows = countByLabel(items, getStatusLabel);
  const { needsAction, stable } = getActionCounts(items);
  const primaryAction = getPrimaryActionLabel(items);
  const topStatus = getTopLabel(statusRows);
  const topSource = getTopLabel(sourceRows);

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/60 p-4 shadow-sm sm:p-5"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
      <div className="pointer-events-none absolute -left-16 -top-20 size-48 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-10 size-52 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="w-fit rounded-full border border-border/50 bg-background/60 px-3.5 py-1.5 text-xs font-bold shadow-sm"
        >
          {formatCount(total)} طلب في هذه المرحلة
        </Badge>
      </div>

      <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          title="إجمالي الطابور"
          value={total}
          helper={
            total > 0
              ? "كل الطلبات الظاهرة بعد صلاحيات الدور والفلاتر الحالية."
              : "لا توجد طلبات مطابقة في هذه المرحلة حالياً."
          }
          icon={Layers3}
        />
        <SummaryTile
          title="يحتاج إجراء"
          value={needsAction}
          helper={
            needsAction > 0
              ? `أقرب إجراء متكرر: ${primaryAction}`
              : "لا توجد أزرار إجراءات مطلوبة الآن."
          }
          icon={AlertCircle}
          emphasis="action"
        />
        <SummaryTile
          title="متابعة فقط"
          value={stable}
          helper="طلبات مستقرة أو لا تحتوي على إجراء مباشر من الباك إند."
          icon={CheckCircle2}
          emphasis="calm"
        />
        <SummaryTile
          title="الحالة الأبرز"
          value={topStatus}
          helper={`أكثر مصدر ظاهر الآن: ${topSource}.`}
          icon={Clock3}
        />
      </div>

      {sourceRows.length > 0 && (
        <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="ml-1 text-xs font-bold text-muted-foreground">
            مصادر الطابور
          </span>
          {sourceRows.map((row) => (
            <Badge
              key={row.label}
              variant="outline"
              className="rounded-full bg-background/50 px-3 py-1 text-xs font-semibold shadow-sm"
            >
              {row.label}: {formatCount(row.count)}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
