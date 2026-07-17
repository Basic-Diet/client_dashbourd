import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  Phone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildOperationsActionPayload, safeText } from "@/lib/operationsBoard";
import type {
  DashboardOpsActionRequest,
  QueueAction,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";
import { getBadgeClasses } from "@/types/dashboardOpsTypes";
import { DeliveryTimeline } from "./DeliveryTimeline";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

interface ActionConfig {
  label: string;
  variant: ButtonVariant;
  className?: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  dispatch: {
    label: "استلام للتوصيل",
    variant: "default",
    className:
      "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700",
  },
  notify_arrival: {
    label: "قريب من العميل",
    variant: "secondary",
  },
  fulfill: {
    label: "تم التسليم",
    variant: "default",
    className:
      "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700",
  },
  cancel: {
    label: "تعذر التوصيل",
    variant: "ghost",
    className:
      "text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30",
  },
};

interface DeliveryCardProps {
  item: UnifiedQueueItem;
  onActionClick: (
    item: UnifiedQueueItem,
    action: QueueAction,
    payload: DashboardOpsActionRequest
  ) => void;
  isActionLoading: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function numericValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMapUrl(item: UnifiedQueueItem) {
  const address = asRecord(item.delivery?.address);
  const lat = numericValue(address?.lat ?? address?.latitude);
  const lng = numericValue(address?.lng ?? address?.longitude);

  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const query =
    item.context.addressSummary || item.delivery?.addressSummary || "";

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

function getMealRows(item: UnifiedQueueItem) {
  if (item.kitchen?.version === "v2" && item.kitchen.cards.length) {
    return item.kitchen.cards.map((card, index) => ({
      id: String(card.id || `${card.type}-${index}`),
      title: safeText(card.title, "وجبة"),
      quantity: Number(card.quantity || 1),
    }));
  }

  if (item.items?.length) {
    return item.items.map((entry, index) => ({
      id: entry.id || `item-${index}`,
      title: safeText(entry.name, "وجبة"),
      quantity: Number(entry.quantity || 1),
    }));
  }

  return [];
}

function getActionConfig(actionId: string): ActionConfig {
  return ACTION_CONFIG[actionId] ?? { label: actionId, variant: "outline" };
}

function getActionLabel(action: QueueAction) {
  return safeText(action.label, ACTION_CONFIG[action.id]?.label || action.id);
}

export function DeliveryCard({
  item,
  onActionClick,
  isActionLoading,
}: DeliveryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const mealRows = getMealRows(item);
  const mapUrl = getMapUrl(item);
  const mealCount =
    item.orderSummary?.mealCount ??
    item.context?.mealCount ??
    item.plan?.selectedMealsPerDay ??
    mealRows.length;
  const addressNotes = item.context.addressNotes || "";
  const deliveryWindow =
    item.context.window ||
    item.delivery?.window ||
    item.delivery?.deliveryWindow;
  const hasDetails =
    Boolean(
      item.context.notes ||
      item.context.addressNotes
    ) ||
    mealRows.length > 0 ||
    Boolean(item.dataQuality?.warnings?.length);

  const handleAction = (action: QueueAction) => {
    if (action.disabled) return;

    onActionClick(
      item,
      action,
      buildOperationsActionPayload(item, action.id)
    );
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary"
            >
              {item.source === "one_time_order" ? "طلب لمرة واحدة" : "اشتراك"}
            </Badge>
            <span className="truncate font-mono text-[11px] font-bold tracking-tight text-muted-foreground">
              #{item.orderNumber || item.reference}
            </span>
          </div>
          <h3 className="line-clamp-1 text-lg font-black tracking-tight">
            {item.customer.name}
          </h3>
        </div>

        {item.ui?.label ? (
          <div
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${getBadgeClasses(item.ui.color || "blue")}`}
          >
            {item.statusLabel || item.ui.label}
          </div>
        ) : null}
      </div>

      <div className="mb-3 flex flex-col gap-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Phone className="h-4 w-4" />
          </div>
          <span dir="ltr" className="font-mono font-bold text-foreground/80">
            {item.customer.phone || "-"}
          </span>
        </div>

        <div className="flex items-start gap-3 text-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <p className="mt-1.5 line-clamp-2 leading-relaxed font-medium text-muted-foreground">
            {item.context.addressSummary || "لا يوجد عنوان مسجل"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          {deliveryWindow ? (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                <Clock className="h-4 w-4" />
              </div>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {deliveryWindow}
              </span>
            </div>
          ) : null}

          {mapUrl ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-2.5 text-xs"
            >
              <a href={mapUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                الخريطة
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 rounded-xl border bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-black text-muted-foreground">
            الوجبات
          </span>
          <Badge variant="secondary" className="rounded-md">
            {`${mealCount} وجبة`}
          </Badge>
        </div>
        {mealRows.length ? (
          <div className="flex flex-wrap gap-1.5">
            {mealRows.slice(0, 4).map((meal) => (
              <span
                key={meal.id}
                className="rounded-md border bg-secondary/50 px-2 py-1 text-[11px] font-bold"
              >
                {meal.title} x{meal.quantity}
              </span>
            ))}
            {mealRows.length > 4 ? (
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                +{mealRows.length - 4}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs font-semibold text-muted-foreground">
            {mealCount > 0 ? `${mealCount} وجبة` : "لا توجد وجبات معروضة"}
          </p>
        )}
      </div>

      <div className="flex-1" />

      <div className="mb-4 space-y-2.5 rounded-xl bg-muted/30 p-3">
        <DeliveryTimeline status={item.status} variant="compact" />
        <div className="flex justify-between px-0.5 text-[10px] font-black text-muted-foreground">
          <span>تحضير</span>
          <span>في الطريق</span>
          <span>تسليم</span>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t pt-3">
        <div className="flex flex-1 items-center gap-2">
          {item.allowedActions?.length ? (
            item.allowedActions.map((action) => {
              const config = getActionConfig(action.id);

              return (
                <Button
                  key={action.id}
                  variant={config.variant}
                  size="sm"
                  className={`h-10 flex-1 rounded-xl px-3 text-xs font-bold active:scale-95 ${config.className ?? ""}`}
                  disabled={isActionLoading || action.disabled}
                  title={action.disabledReason || undefined}
                  onClick={() => handleAction(action)}
                >
                  {getActionLabel(action)}
                </Button>
              );
            })
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/10 py-2.5">
              <Package className="h-4 w-4 text-muted-foreground/50" />
              <span className="text-xs font-bold text-muted-foreground">
                لا توجد إجراءات متاحة
              </span>
            </div>
          )}
        </div>

        {hasDetails ? (
          <Button
            variant="outline"
            size="icon"
            className={`h-10 w-10 shrink-0 rounded-xl ${isExpanded ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-4 animate-in space-y-3 rounded-xl bg-muted/40 p-4 duration-200 fade-in slide-in-from-top-2">
          {addressNotes ? (
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs dark:border-sky-900/50 dark:bg-sky-950/30">
              <span className="mb-1.5 block font-black text-sky-700 dark:text-sky-400">
                ملاحظات العنوان:
              </span>
              <p className="leading-relaxed font-medium text-sky-800 dark:text-sky-300">
                {addressNotes}
              </p>
            </div>
          ) : null}

          {item.context.notes ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs dark:border-blue-900/50 dark:bg-blue-950/30">
              <span className="mb-1.5 block font-black text-blue-700 dark:text-blue-400">
                ملاحظة:
              </span>
              <p className="leading-relaxed font-medium text-blue-800 dark:text-blue-300">
                {item.context.notes}
              </p>
            </div>
          ) : null}

          {mealRows.length ? (
            <div className="rounded-xl border bg-background/50 p-3 text-xs shadow-sm">
              <span className="mb-1.5 block font-black text-foreground/80">
                تفاصيل الوجبات:
              </span>
              <div className="space-y-1.5">
                {mealRows.map((meal, index) => (
                  <p
                    key={meal.id}
                    className="leading-relaxed font-medium text-muted-foreground"
                  >
                    {index + 1}. {meal.title} x{meal.quantity}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {item.dataQuality?.warnings?.length ? (
            <div className="rounded-xl border bg-background/50 p-3 text-xs shadow-sm">
              <span className="mb-1.5 block font-black text-foreground/80">
                تنبيهات:
              </span>
              <div className="space-y-1.5">
                {item.dataQuality.warnings.map((warning, index) => (
                  <p
                    key={`${warning.code}-${index}`}
                    className="leading-relaxed font-medium text-muted-foreground"
                  >
                    {warning.messageAr || warning.messageEn || warning.code}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
