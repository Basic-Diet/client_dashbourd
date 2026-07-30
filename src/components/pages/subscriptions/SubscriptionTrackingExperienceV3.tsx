import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionDetailsQuery } from "@/hooks/useSubscriptionsQuery";
import { useSubscriptionTrackingQuery } from "@/hooks/useSubscriptionTrackingQuery";
import type {
  AddonSummaryItem,
  PremiumSummaryItem,
  Subscription,
} from "@/types/subscriptionTypes";
import type {
  SubscriptionTrackingDay,
  SubscriptionTrackingDayState,
  SubscriptionTrackingMealItem,
} from "@/types/subscriptionTrackingTypes";
import type {
  MealMovementConfidence,
  SubscriptionMealMovement,
  SubscriptionTrackingDataWithProvenance,
} from "@/types/subscriptionMovementProvenanceTypes";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
  User,
  UserRoundCheck,
  Utensils,
} from "lucide-react";

interface SubscriptionTrackingExperienceProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimelineFilter =
  | "all"
  | "received"
  | "planned"
  | "in_progress"
  | "upcoming"
  | "exceptions";

type MovementFilter = "all" | "consumed" | "reserved" | "unknown";

const TIMELINE_FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "received", label: "تم الاستلام" },
  { value: "planned", label: "تم الاختيار" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "upcoming", label: "القادم" },
  { value: "exceptions", label: "استثناءات" },
];

const MOVEMENT_FILTERS: Array<{ value: MovementFilter; label: string }> = [
  { value: "all", label: "كل الحركات" },
  { value: "consumed", label: "المستهلك" },
  { value: "reserved", label: "المحجوز" },
  { value: "unknown", label: "غير المعروف" },
];

const EXCEPTION_STATES = new Set<SubscriptionTrackingDayState>([
  "consumed_without_preparation",
  "exception",
  "missed_selection",
]);

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  return !Array.isArray(value) || value.length > 0;
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime
    ? date.toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: value.length === 10 ? "UTC" : undefined,
      });
}

function formatLongDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonth(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function subscriptionStatusLabel(status?: string) {
  switch (status) {
    case "active":
      return "نشط";
    case "pending":
    case "pending_payment":
      return "قيد الانتظار";
    case "canceled":
      return "ملغى";
    case "expired":
      return "منتهي";
    case "ended":
    case "completed":
      return "انتهى";
    case "frozen":
      return "مجمّد";
    default:
      return status || "غير محدد";
  }
}

function subscriptionStatusClass(status?: string) {
  switch (status) {
    case "active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
    case "pending":
    case "pending_payment":
      return "border-amber-500/20 bg-amber-500/10 text-amber-600";
    case "canceled":
      return "border-red-500/20 bg-red-500/10 text-red-600";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function fulfillmentLabel(mode?: string | null) {
  if (mode === "delivery") return "توصيل";
  if (mode === "pickup") return "استلام من الفرع";
  return mode || "غير محدد";
}

function actorRoleLabel(role?: string | null) {
  if (role === "admin" || role === "superadmin") return "الإدارة";
  if (role === "cashier") return "الكاشير";
  if (role === "restaurant") return "المطعم";
  if (role === "kitchen") return "المطبخ";
  if (role === "courier") return "التوصيل";
  if (role === "client") return "العميل";
  if (role === "system") return "النظام";
  return role || "غير مسجل";
}

function confidenceLabel(confidence: MealMovementConfidence) {
  if (confidence === "exact") return "موثق بسجل مباشر";
  if (confidence === "derived") return "مستنتج من سجل تاريخي";
  return "المصدر غير معروف";
}

function confidenceClass(confidence: MealMovementConfidence) {
  if (confidence === "exact") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (confidence === "derived") {
    return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
}

function movementIcon(movement: SubscriptionMealMovement) {
  if (movement.sourceCode === "delivery_fulfillment") return <Truck className="h-5 w-5" />;
  if (movement.sourceCode === "branch_pickup_fulfillment") return <Store className="h-5 w-5" />;
  if (movement.sourceCode === "dashboard_manual_deduction") return <LayoutDashboard className="h-5 w-5" />;
  if (movement.sourceCode === "legacy_unattributed_consumption") return <CircleHelp className="h-5 w-5" />;
  if (movement.balanceEffect === "reserved") return <Clock3 className="h-5 w-5" />;
  return <History className="h-5 w-5" />;
}

function movementTone(movement: SubscriptionMealMovement) {
  if (movement.confidence === "unknown") {
    return "border-red-500/30 bg-red-500/[0.06]";
  }
  if (movement.balanceEffect === "reserved") {
    return "border-blue-500/25 bg-blue-500/[0.05]";
  }
  if (movement.sourceCode === "dashboard_manual_deduction") {
    return "border-violet-500/25 bg-violet-500/[0.05]";
  }
  if (movement.sourceCode === "delivery_fulfillment" || movement.sourceCode === "branch_pickup_fulfillment") {
    return "border-emerald-500/25 bg-emerald-500/[0.05]";
  }
  return "border-border bg-card";
}

function addressSummary(subscription: Subscription) {
  const address = subscription.deliveryAddress;
  if (!address) return "";
  return [
    address.line1,
    address.line2,
    address.building ? `مبنى ${address.building}` : null,
    address.apartment ? `شقة ${address.apartment}` : null,
    address.street,
    address.district,
    address.city,
  ]
    .filter(Boolean)
    .join("، ");
}

function DetailRow({
  label,
  value,
  dir,
}: {
  label: string;
  value?: ReactNode;
  dir?: "rtl" | "ltr";
}) {
  if (!hasValue(value)) return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-left font-medium" dir={dir}>
        {value}
      </span>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black">
        {icon}
        {title}
      </div>
      <Separator className="my-3" />
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  percent,
  description,
}: {
  label: string;
  value: number;
  total: number;
  percent: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="text-left">
          <p className="font-black tabular-nums">{value} / {total}</p>
          <p className="text-xs text-muted-foreground">{percent}%</p>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function mealDescription(item: SubscriptionTrackingMealItem) {
  const parts: string[] = [];
  if (item.protein?.name && item.protein.name !== item.name) parts.push(item.protein.name);
  for (const carb of item.carbs) {
    parts.push(carb.grams ? `${carb.name} ${carb.grams}g` : carb.name);
  }
  return parts.join(" + ");
}

function MovementCard({ movement }: { movement: SubscriptionMealMovement }) {
  const isReservation = movement.balanceEffect === "reserved";
  return (
    <article className={`rounded-xl border p-4 shadow-sm ${movementTone(movement)}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg border bg-background/70 p-2 text-primary">
            {movementIcon(movement)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black">{movement.sourceLabel}</h4>
              <Badge variant={isReservation ? "outline" : "secondary"}>
                {movement.quantity} {movement.quantity === 1 ? "وجبة" : "وجبات"}
              </Badge>
              <Badge variant="outline" className={confidenceClass(movement.confidence)}>
                {confidenceLabel(movement.confidence)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {movement.date ? formatLongDate(movement.date) : "بدون تاريخ يوم محدد"}
              {movement.occurredAt ? ` · ${formatDate(movement.occurredAt, true)}` : ""}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {isReservation ? "حجز فقط" : movement.completion.label}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-background/70 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            {movement.selection.code === "mobile_app" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <LayoutDashboard className="h-4 w-4" />
            )}
            مصدر الاختيار
          </div>
          <p className="mt-2 text-sm font-semibold">{movement.selection.label}</p>
        </div>
        <div className="rounded-lg border bg-background/70 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <UserRoundCheck className="h-4 w-4" />
            منفذ الإجراء النهائي
          </div>
          <p className="mt-2 text-sm font-semibold">
            {movement.actor.email || actorRoleLabel(movement.actor.role)}
          </p>
          {movement.actor.email && movement.actor.role ? (
            <p className="mt-1 text-xs text-muted-foreground">{actorRoleLabel(movement.actor.role)}</p>
          ) : null}
        </div>
        <div className="rounded-lg border bg-background/70 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Store className="h-4 w-4" />
            طريقة التنفيذ
          </div>
          <p className="mt-2 text-sm font-semibold">
            {movement.fulfillmentMode ? fulfillmentLabel(movement.fulfillmentMode) : movement.completion.label}
          </p>
        </div>
      </div>

      {movement.mealItems.length ? (
        <div className="mt-3 rounded-lg border bg-background/70 p-3">
          <p className="mb-2 text-xs font-black text-muted-foreground">الوجبات المرتبطة بالحركة</p>
          <div className="grid gap-2 md:grid-cols-2">
            {movement.mealItems.map((item) => {
              const description = mealDescription(item);
              return (
                <div key={`${movement.id}-${item.id}`} className="rounded-lg border bg-card px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <Badge variant={item.isPremium ? "default" : "outline"}>{item.typeLabel}</Badge>
                  </div>
                  {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-dashed bg-background/50 px-3 py-2 text-sm text-muted-foreground">
          {movement.sourceCode === "dashboard_manual_deduction"
            ? "الخصم اليدوي خفّض الرصيد مباشرة ولا يرتبط بأسماء وجبات محددة."
            : movement.confidence === "unknown"
              ? "السجل التاريخي لا يحتوي على يوم أو طلب يحدد أسماء الوجبات."
              : "لا توجد أسماء وجبات محفوظة لهذه الحركة التاريخية."}
        </div>
      )}

      {movement.reason || movement.notes ? (
        <p className="mt-3 rounded-lg border bg-background/70 px-3 py-2 text-xs leading-5">
          {[movement.reason, movement.notes].filter(Boolean).join(" — ")}
        </p>
      ) : null}

      {movement.operations.length ? (
        <details className="mt-3 rounded-lg border bg-background/60 p-3">
          <summary className="cursor-pointer text-sm font-black">سجل مراحل العملية ({movement.operations.length})</summary>
          <div className="mt-3 space-y-2">
            {movement.operations.map((operation, index) => (
              <div key={`${movement.id}-${operation.action}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-xs">
                <div>
                  <p className="font-bold">{operation.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    {operation.actor.email || actorRoleLabel(operation.actor.role)}
                    {operation.fromStatus || operation.toStatus
                      ? ` · ${operation.fromStatus || "—"} ← ${operation.toStatus || "—"}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-left text-muted-foreground">
                  {formatDate(operation.at, true)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {movement.confidence !== "exact" ? (
        <details className="mt-3 rounded-lg border border-dashed bg-background/50 p-3 text-xs">
          <summary className="cursor-pointer font-bold">لماذا هذه النتيجة؟</summary>
          <div className="mt-2 space-y-1 text-muted-foreground">
            {movement.evidence.map((evidence, index) => (
              <p key={`${movement.id}-evidence-${index}`}>• {evidence}</p>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function movementMatches(movement: SubscriptionMealMovement, filter: MovementFilter) {
  if (filter === "all") return true;
  if (filter === "reserved") return movement.balanceEffect === "reserved";
  if (filter === "unknown") return movement.confidence === "unknown";
  return movement.balanceEffect === "consumed";
}

function dayState(day: SubscriptionTrackingDay): SubscriptionTrackingDayState {
  if (day.trackingState) return day.trackingState;
  if (day.receivedMeals > 0) return "received";
  if ((day.consumedWithoutPreparationMeals ?? 0) > 0) return "consumed_without_preparation";
  if (day.forfeitedMeals > 0) return "exception";
  if (day.selectedMeals > 0 && !day.isPast) return "planned";
  return day.isPast ? "historical_empty" : "upcoming";
}

function dayTone(state: SubscriptionTrackingDayState) {
  if (state === "received") return "border-emerald-500/25 bg-emerald-500/[0.05]";
  if (state === "in_progress") return "border-blue-500/25 bg-blue-500/[0.05]";
  if (state === "planned") return "border-violet-500/25 bg-violet-500/[0.05]";
  if (EXCEPTION_STATES.has(state)) return "border-amber-500/25 bg-amber-500/[0.05]";
  return "border-border bg-card";
}

function timelineMatches(day: SubscriptionTrackingDay, filter: TimelineFilter) {
  const state = dayState(day);
  if (filter === "all") return true;
  if (filter === "received") return state === "received";
  if (filter === "planned") return state === "planned";
  if (filter === "in_progress") return state === "in_progress";
  if (filter === "upcoming") return state === "upcoming" || state === "available_today";
  return EXCEPTION_STATES.has(state) || state === "exception";
}

function TimelineDay({ day }: { day: SubscriptionTrackingDay }) {
  const state = dayState(day);
  const title = day.calendar?.fullDateLabels?.ar || formatLongDate(day.date);
  const consumedWithoutPreparation = day.consumedWithoutPreparationMeals ?? 0;
  const openByDefault = day.isToday || state === "received" || EXCEPTION_STATES.has(state);

  return (
    <details className={`group rounded-xl border p-4 shadow-sm ${dayTone(state)}`} open={openByDefault}>
      <summary className="flex cursor-pointer list-none flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black">{title}</span>
            {day.isToday ? <Badge>اليوم</Badge> : null}
            <Badge variant="outline" className="bg-background/70">{day.statusLabel}</Badge>
            <Badge variant="secondary">{day.sourceLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">{day.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">الاختيار</p>
              <p className="font-black tabular-nums">{day.selectedMeals}/{day.requiredMeals}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">استلام فعلي</p>
              <p className="font-black tabular-nums">{day.receivedMeals}</p>
            </div>
            <div className="rounded-lg border bg-background/70 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">الطريقة</p>
              <p className="text-xs font-bold">{fulfillmentLabel(day.fulfillmentMode)}</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <div className="space-y-2">
          {day.mealItems.length ? day.mealItems.map((item) => {
            const description = mealDescription(item);
            return (
              <div key={`${day.date}-${item.id}`} className="rounded-lg border bg-background/75 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.name}</span>
                  <Badge variant={item.isPremium ? "default" : "outline"}>{item.typeLabel}</Badge>
                </div>
                {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
              </div>
            );
          }) : (
            <div className="rounded-lg border border-dashed bg-background/50 px-3 py-3 text-sm text-muted-foreground">
              لا توجد أسماء وجبات محفوظة لهذا اليوم.
            </div>
          )}
        </div>
        <div className="space-y-2">
          {day.reservedMeals > 0 ? <Badge variant="outline" className="w-full justify-center py-2">محجوز: {day.reservedMeals}</Badge> : null}
          {consumedWithoutPreparation > 0 ? <Badge variant="destructive" className="w-full justify-center py-2">حسم بدون تحضير: {consumedWithoutPreparation}</Badge> : null}
          {day.forfeitedMeals > 0 ? <Badge variant="destructive" className="w-full justify-center py-2">مصادَر: {day.forfeitedMeals}</Badge> : null}
          {day.releasedMeals > 0 ? <Badge variant="secondary" className="w-full justify-center py-2">تم تحريره: {day.releasedMeals}</Badge> : null}
          {day.addonItems.length ? (
            <div className="rounded-lg border bg-background/75 p-2">
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">الإضافات</p>
              <div className="flex flex-wrap gap-1.5">
                {day.addonItems.map((addon) => <Badge key={`${day.date}-${addon.id}`} variant="secondary">{addon.name} × {addon.quantity}</Badge>)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {day.notes ? <p className="mt-3 rounded-lg border bg-background/60 px-3 py-2 text-xs">{day.notes}</p> : null}
    </details>
  );
}

export function SubscriptionTrackingExperienceV3({
  subscription,
  open,
  onOpenChange,
}: SubscriptionTrackingExperienceProps) {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const subscriptionId = subscription?._id ?? "";

  useEffect(() => {
    setTimelineFilter("all");
    setMovementFilter("all");
  }, [subscriptionId, open]);

  const detailsQuery = useSubscriptionDetailsQuery(subscriptionId);
  const trackingQuery = useSubscriptionTrackingQuery(subscriptionId);
  const details = detailsQuery.data?.data ?? subscription;
  const tracking = trackingQuery.data?.data as SubscriptionTrackingDataWithProvenance | undefined;
  const summary = tracking?.summary;
  const provenance = tracking?.provenance;
  const coverage = provenance?.coverage;

  const totalMeals = summary?.totalMeals ?? details?.totalMeals ?? 0;
  const receivedMeals = summary?.receivedMeals ?? 0;
  const availableMeals = summary?.availableMeals ?? details?.remainingMeals ?? 0;
  const reservedMeals = summary?.reservedMeals ?? 0;
  const manualDeductedMeals = summary?.manualDeductedMeals ?? 0;
  const balanceConsumedMeals = summary?.balanceConsumedMeals ?? summary?.consumedMeals ?? 0;
  const forfeitedMeals = summary?.forfeitedMeals ?? 0;
  const receiptPercent = summary?.progressPercent ?? 0;
  const balancePercent = summary?.balanceUsagePercent ?? 0;

  const movementCounts = useMemo(() => {
    const movements = provenance?.movements ?? [];
    return Object.fromEntries(MOVEMENT_FILTERS.map((item) => [
      item.value,
      movements.filter((movement) => movementMatches(movement, item.value)).length,
    ])) as Record<MovementFilter, number>;
  }, [provenance?.movements]);

  const visibleMovements = useMemo(
    () => (provenance?.movements ?? []).filter((movement) => movementMatches(movement, movementFilter)),
    [movementFilter, provenance?.movements]
  );

  const timelineCounts = useMemo(() => {
    const days = tracking?.days ?? [];
    return Object.fromEntries(TIMELINE_FILTERS.map((item) => [
      item.value,
      days.filter((day) => timelineMatches(day, item.value)).length,
    ])) as Record<TimelineFilter, number>;
  }, [tracking?.days]);

  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, SubscriptionTrackingDay[]>();
    for (const day of (tracking?.days ?? []).filter((row) => timelineMatches(row, timelineFilter))) {
      const month = day.calendar?.monthYearLabels?.ar || formatMonth(day.date);
      const rows = groups.get(month) ?? [];
      rows.push(day);
      groups.set(month, rows);
    }
    return [...groups.entries()];
  }, [timelineFilter, tracking?.days]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[98vw] max-w-[98vw] gap-0 overflow-hidden p-0 sm:max-w-[1560px]" dir="rtl">
        <div className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <DialogHeader className="gap-2 text-right">
            <div className="flex w-[95%] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl font-black">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  متابعة الاشتراك ومصدر كل خصم
                </DialogTitle>
                <DialogDescription className="mt-1">
                  شاشة قراءة فقط تفرّق بين اختيار التطبيق، الخصم اليدوي، التوصيل، واستلام الفرع دون تخمين.
                </DialogDescription>
              </div>
              {details ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={subscriptionStatusClass(details.status)}>{subscriptionStatusLabel(details.status)}</Badge>
                  <Badge variant="secondary">{details.displayId || details.id || details._id}</Badge>
                  <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" />قراءة فقط</Badge>
                </div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(97vh-105px)] overflow-y-auto px-4 py-5 sm:px-6">
          {detailsQuery.isLoading && !details ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div>
              <Skeleton className="h-[36rem] rounded-xl" />
            </div>
          ) : detailsQuery.isError || !details ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <ReceiptText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">تعذر تحميل تفاصيل الاشتراك</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <Metric label="إجمالي وجبات الاشتراك" value={totalMeals} description="الرصيد المتعاقد عليه عند التفعيل" icon={<Package className="h-5 w-5" />} />
                <Metric label="استلمها فعليًا" value={receivedMeals} description="تسليم أو استلام مثبت بسجل يوم" icon={<CheckCircle2 className="h-5 w-5" />} />
                <Metric label="المتبقي المتاح" value={availableMeals} description="متاح لاختيارات أو حجوزات جديدة" icon={<Utensils className="h-5 w-5" />} />
                <Metric label="محجوز ولم يُستهلك" value={reservedMeals} description="مرتبط بيوم أو طلب ولم يُسلّم" icon={<Clock3 className="h-5 w-5" />} />
                <Metric label="خصم يدوي" value={manualDeductedMeals} description="حركة من الداشبورد وليست استلامًا" icon={<LayoutDashboard className="h-5 w-5" />} />
              </div>

              <section className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-black">ملخص حركة الرصيد</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      يوم التشغيل: {formatLongDate(tracking?.businessDate)}
                      {tracking?.generatedAt ? ` · آخر قراءة ${formatDate(tracking.generatedAt, true)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">أيام استلام: {summary?.deliveredDays ?? 0}</Badge>
                    <Badge variant="secondary">أيام الجدول: {summary?.timelineDays ?? tracking?.days.length ?? 0}</Badge>
                    <Badge variant="secondary">اختيارات: {summary?.plannedMeals ?? 0}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <ProgressRow label="تقدم الاستلام الفعلي" value={receivedMeals} total={totalMeals} percent={receiptPercent} description="لا يزيد إلا عند وجود تسليم أو استلام مثبت." />
                  <ProgressRow label="استخدام الرصيد محاسبيًا" value={balanceConsumedMeals + forfeitedMeals} total={totalMeals} percent={balancePercent} description="يشمل كل استهلاك أو خصم أو مصادرة." />
                </div>
              </section>

              {coverage ? (
                <section className={`rounded-xl border p-4 shadow-sm ${coverage.status === "complete" ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-red-500/30 bg-red-500/[0.05]"}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {coverage.status === "complete" ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                        <h2 className="font-black">{coverage.status === "complete" ? "كل الوجبات المستهلكة لها مصدر محدد" : "يوجد خصم تاريخي لم نستطع نسبه بأمان"}</h2>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        عداد الاستهلاك الرسمي {coverage.balanceConsumedMeals}، المعروض في سجل المصادر {coverage.representedMeals}، وغير المعروف {coverage.unknownMeals}.
                        لا يتم تصنيف أي حركة كتوصيل أو تطبيق أو داشبورد إلا عند وجود دليل محفوظ.
                      </p>
                    </div>
                    <Badge variant={coverage.status === "complete" ? "secondary" : "destructive"}>{coverage.status === "complete" ? "تغطية كاملة" : "تحتاج مراجعة"}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 text-center">
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">توصيل</p><p className="font-black">{coverage.consumption.delivery}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">استلام فرع</p><p className="font-black">{coverage.consumption.branchPickup}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">خصم داشبورد</p><p className="font-black">{coverage.consumption.dashboardManual}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">حسم بدون تحضير</p><p className="font-black">{coverage.consumption.consumedWithoutPreparation}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">اختيار التطبيق</p><p className="font-black">{coverage.selection.mobileApp}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">اختيار الداشبورد</p><p className="font-black">{coverage.selection.dashboard}</p></div>
                    <div className="rounded-lg border bg-background/70 p-2"><p className="text-[10px] text-muted-foreground">غير معروف</p><p className="font-black">{coverage.unknownMeals}</p></div>
                  </div>
                </section>
              ) : trackingQuery.isLoading ? <Skeleton className="h-40 rounded-xl" /> : (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4 text-sm">
                  لم تصل بيانات مصدر الحركات من الـBackend بعد. أعد تحميل الصفحة بعد اكتمال النشر.
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                  <Panel title="المشترك" icon={<User className="h-4 w-4 text-primary" />}>
                    <DetailRow label="الاسم" value={details.user?.fullName || details.userName} />
                    <DetailRow label="الهاتف" value={details.user?.phone} dir="ltr" />
                    <DetailRow label="البريد" value={details.user?.email} dir="ltr" />
                    <DetailRow label="حالة العميل" value={details.user?.isActive === false ? "غير نشط" : "نشط"} />
                  </Panel>
                  <Panel title="الخطة والصلاحية" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
                    <DetailRow label="الباقة" value={details.planName || details.plan?.name} />
                    <DetailRow label="الجرامات" value={details.selectedGrams ? `${details.selectedGrams}g` : ""} />
                    <DetailRow label="وجبات في اليوم" value={details.selectedMealsPerDay} />
                    <DetailRow label="بداية الاشتراك" value={formatDate(details.startDate)} />
                    <DetailRow label="نهاية أيام الباقة" value={formatDate(details.endDate)} />
                    <DetailRow label="نهاية الصلاحية" value={formatDate(details.validityEndDate)} />
                    <DetailRow label="أيام المرونة" value={tracking?.validity?.timelineExtraDays} />
                    <DetailRow label="أيام التعويض" value={tracking?.validity?.compensationDays} />
                  </Panel>
                  <Panel title="التوصيل أو الاستلام" icon={<MapPin className="h-4 w-4 text-primary" />}>
                    <DetailRow label="الطريقة" value={fulfillmentLabel(details.deliveryMode || details.fulfillmentMethod)} />
                    <DetailRow label="المنطقة" value={details.deliveryZoneName || details.deliveryAddress?.district} />
                    <DetailRow label="الوقت" value={details.deliverySlot?.window || details.deliveryWindow} />
                    <DetailRow label="العنوان" value={addressSummary(details)} />
                    <DetailRow label="ملاحظات العنوان" value={details.deliveryAddress?.notes} />
                  </Panel>
                  <Panel title="الإضافات والمميزة" icon={<Utensils className="h-4 w-4 text-primary" />}>
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">الإضافات</p>
                      {details.addonsSummary?.length ? details.addonsSummary.map((addon: AddonSummaryItem) => (
                        <div key={addon.addonId} className="mb-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                          <div className="flex justify-between gap-2"><span>{addon.name}</span><span className="text-muted-foreground">{addon.remainingQtyTotal}/{addon.purchasedQtyTotal}</span></div>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">لا توجد إضافات.</p>}
                    </div>
                    <Separator />
                    <div>
                      <p className="mb-2 text-xs font-bold text-muted-foreground">الوجبات المميزة</p>
                      {details.premiumSummary?.length ? details.premiumSummary.map((premium: PremiumSummaryItem, index: number) => (
                        <div key={`${premium.premiumMealId ?? "premium"}-${index}`} className="mb-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                          <div className="flex justify-between gap-2"><span>{premium.name}</span><span className="text-muted-foreground">{premium.remainingQtyTotal}/{premium.purchasedQtyTotal}</span></div>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">لا توجد وجبات مميزة.</p>}
                    </div>
                  </Panel>
                </aside>

                <main className="min-w-0 space-y-5">
                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">مصدر حركة كل وجبة</h2></div>
                        <p className="mt-1 text-xs text-muted-foreground">يعرض من اختار الوجبة، أين انتهت العملية، ومن نفذ الإجراء النهائي.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {MOVEMENT_FILTERS.map((item) => (
                          <button key={item.value} type="button" onClick={() => setMovementFilter(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${movementFilter === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                            {item.label} ({movementCounts[item.value] ?? 0})
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {trackingQuery.isLoading ? (
                    <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-xl" />)}</div>
                  ) : visibleMovements.length ? (
                    <div className="space-y-3">{visibleMovements.map((movement) => <MovementCard key={movement.id} movement={movement} />)}</div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد حركات مطابقة للفلتر.</div>
                  )}

                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="text-lg font-black">الخط الزمني للأيام</h2></div>
                        <p className="mt-1 text-xs text-muted-foreground">تفاصيل الاختيارات والحالة التشغيلية يومًا بيوم.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TIMELINE_FILTERS.map((item) => (
                          <button key={item.value} type="button" onClick={() => setTimelineFilter(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${timelineFilter === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>
                            {item.label} ({timelineCounts[item.value] ?? 0})
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {trackingQuery.isLoading ? (
                    <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
                  ) : trackingQuery.isError || !tracking ? (
                    <div className="rounded-xl border border-dashed p-10 text-center"><Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">تعذر تحميل الخط الزمني</p></div>
                  ) : groupedTimeline.length ? (
                    <div className="space-y-5">
                      {groupedTimeline.map(([month, days]) => (
                        <section key={month} className="space-y-3">
                          <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 backdrop-blur"><CalendarDays className="h-4 w-4 text-primary" /><h3 className="font-black">{month}</h3><Badge variant="secondary">{days.length} يوم</Badge></div>
                          {days.map((day) => <TimelineDay key={day.date} day={day} />)}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">لا توجد أيام مطابقة للفلتر.</div>
                  )}
                </main>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
