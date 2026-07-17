import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Layers3,
  ListChecks,
  PackageCheck,
  ReceiptText,
  Store,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

const STATUS_LABELS: Record<string, string> = {
  open: "مفتوح",
  locked: "مقفول",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  in_preparation: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  ready_for_delivery: "جاهز للتوصيل",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التوصيل",
  fulfilled: "مكتمل",
  no_show: "لم يحضر",
  canceled: "ملغي",
  cancelled: "ملغي",
  delivery_canceled: "ملغي",
  pending_payment: "بانتظار الدفع",
  expired: "منتهي الصلاحية",
  "your order is ready": "طلبك جاهز",
  "kitchen is preparing your meals": "المطبخ يجهز طلبك",
};

const ACTION_LABELS: Record<string, string> = {
  prepare: "بدء التحضير",
  start_preparation: "بدء التحضير",
  ready_for_pickup: "تجهيز للاستلام",
  ready_for_delivery: "تجهيز للتوصيل",
  dispatch: "إرسال للتوصيل",
  fulfill: "إتمام العملية",
  no_show: "لم يحضر",
  cancel: "إلغاء",
  lock: "قفل",
  reopen: "إعادة فتح",
};

function translateLabel(value: unknown, fallback = "غير محدد") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;

  const key = text.toLowerCase();
  return STATUS_LABELS[key] ?? ACTION_LABELS[key] ?? text;
}

function getStatusLabel(item: UnifiedQueueItem) {
  return translateLabel(item.statusLabel || item.ui?.label || item.status);
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
    (action) => translateLabel(action.label || action.id, "إجراء")
  );
  return getTopLabel(actionRows);
}

function getSourceIcon(label: string): LucideIcon {
  if (label.includes("استلام")) return Store;
  if (label.includes("فردي")) return ReceiptText;
  return PackageCheck;
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
  const valueText = typeof value === "number" ? formatCount(value) : value;
  const accentClass =
    emphasis === "action"
      ? "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-300"
      : emphasis === "calm"
        ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300"
        : "bg-primary/10 text-primary ring-primary/15";

  return (
    <div
      dir="rtl"
      className="group relative overflow-hidden rounded-xl border border-border/55 bg-gradient-to-br from-background/90 to-muted/20 p-3.5 text-right shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-primary/25 via-transparent to-transparent" />
      <div className="flex items-start gap-2.5">
        <span className={`shrink-0 rounded-full p-2 ring-1 ${accentClass}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-bold text-muted-foreground">{title}</p>
          <p className="truncate text-[1.7rem] font-black leading-none text-foreground tabular-nums">
            {valueText}
          </p>
        </div>
      </div>
      <p className="mt-2 min-h-9 text-xs leading-5 text-muted-foreground">
        {helper}
      </p>
    </div>
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
      className="rounded-2xl border border-border/55 bg-card/35 p-3 shadow-sm sm:p-4"
    >
      <div className="mb-3 flex flex-col gap-2 text-right lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <Badge
            variant="outline"
            className="mb-1 w-fit gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
          >
            <ListChecks className="size-3.5" />
            ملخص المرحلة
          </Badge>
          <h2 className="text-base font-extrabold text-foreground">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="w-fit gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
        >
          <Layers3 className="size-3.5" />
          {formatCount(total)} طلب في هذه المرحلة
        </Badge>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          title="إجمالي الطابور"
          value={total}
          helper={
            total > 0
              ? "الطلبات الظاهرة لهذا الدور والفلتر."
              : "لا توجد طلبات في هذه المرحلة."
          }
          icon={Layers3}
        />
        <SummaryTile
          title="يتطلب إجراء"
          value={needsAction}
          helper={
            needsAction > 0
              ? `الإجراء الأكثر ظهوراً: ${primaryAction}`
              : "لا توجد إجراءات مطلوبة الآن."
          }
          icon={AlertCircle}
          emphasis="action"
        />
        <SummaryTile
          title="متابعة فقط"
          value={stable}
          helper="لا تحتاج إجراء الآن."
          icon={CheckCircle2}
          emphasis="calm"
        />
        <SummaryTile
          title="الحالة الأبرز"
          value={topStatus}
          helper={`المصدر الأكثر ظهوراً: ${topSource}.`}
          icon={Clock3}
        />
      </div>

      {sourceRows.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-start gap-1.5 border-t border-border/45 pt-3 text-right">
          {sourceRows.map((row) => {
            const Icon = getSourceIcon(row.label);

            return (
              <Badge
                key={row.label}
                variant="outline"
                className="gap-1.5 rounded-full border-border/60 bg-background/70 px-2.5 py-1 text-xs font-semibold"
              >
                <Icon className="size-3.5 text-muted-foreground" />
                <span>{row.label}</span>
                <span className="font-bold tabular-nums text-foreground">
                  {formatCount(row.count)}
                </span>
              </Badge>
            );
          })}
        </div>
      )}
    </section>
  );
}
