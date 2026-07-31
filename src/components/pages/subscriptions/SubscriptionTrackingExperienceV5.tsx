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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptionDetailsQuery } from "@/hooks/useSubscriptionsQuery";
import { useSubscriptionTrackingQuery } from "@/hooks/useSubscriptionTrackingQuery";
import type { Subscription } from "@/types/subscriptionTypes";
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

interface Props {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WorkspaceTab = "overview" | "timeline" | "movements";
type TimelineFilter = "all" | "received" | "planned" | "active" | "upcoming" | "issues";
type MovementFilter = "all" | "manual" | "fulfilled" | "reserved" | "exceptions" | "unknown";

const EXCEPTION_STATES = new Set<SubscriptionTrackingDayState>([
  "consumed_without_preparation",
  "exception",
  "missed_selection",
]);

const TIMELINE_FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "received", label: "تم الاستلام" },
  { value: "planned", label: "تم الاختيار" },
  { value: "active", label: "قيد التنفيذ" },
  { value: "upcoming", label: "القادم" },
  { value: "issues", label: "مشكلات واستثناءات" },
];

const MOVEMENT_FILTERS: Array<{ value: MovementFilter; label: string }> = [
  { value: "all", label: "كل الحركات" },
  { value: "manual", label: "خصم مباشر" },
  { value: "fulfilled", label: "تسليم واستلام" },
  { value: "reserved", label: "محجوز" },
  { value: "exceptions", label: "حسم ومصادرة" },
  { value: "unknown", label: "غير معروف" },
];

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

function longDate(value?: string | null) {
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

function monthLabel(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function fulfillmentLabel(value?: string | null) {
  if (value === "delivery") return "توصيل";
  if (value === "pickup") return "استلام من الفرع";
  return value || "غير محدد";
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: "نشط",
    pending: "قيد الانتظار",
    pending_payment: "قيد الدفع",
    canceled: "ملغى",
    expired: "منتهي",
    ended: "انتهى",
    completed: "مكتمل",
    frozen: "مجمّد",
  };
  return labels[status || ""] || status || "غير محدد";
}

function statusClass(status?: string) {
  if (status === "active") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600";
  if (status === "pending" || status === "pending_payment") return "border-amber-500/25 bg-amber-500/10 text-amber-600";
  if (status === "canceled") return "border-red-500/25 bg-red-500/10 text-red-600";
  return "border-border bg-muted/40 text-muted-foreground";
}

function actorLabel(role?: string | null) {
  const labels: Record<string, string> = {
    admin: "الإدارة",
    superadmin: "الإدارة العليا",
    cashier: "الكاشير",
    restaurant: "المطعم",
    kitchen: "المطبخ",
    courier: "التوصيل",
    client: "العميل",
    system: "النظام",
  };
  return labels[role || ""] || role || "غير مسجل";
}

function confidenceLabel(value: MealMovementConfidence) {
  if (value === "exact") return "موثق مباشرة";
  if (value === "derived") return "مستنتج من سجل مرتبط";
  return "المصدر غير معروف";
}

function confidenceClass(value: MealMovementConfidence) {
  if (value === "exact") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (value === "derived") return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
}

function reasonLabel(value?: string | null) {
  const code = String(value || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    cashier_walk_in: "صرف مباشر للعميل من الفرع",
    customer_walk_in: "صرف مباشر للعميل من الفرع",
    walk_in: "صرف مباشر للعميل من الفرع",
    manual_adjustment: "تسوية يدوية للرصيد",
    balance_correction: "تصحيح رصيد الاشتراك",
    complimentary_meal: "وجبة مجانية مع خصمها من الرصيد",
    replacement_meal: "وجبة بديلة",
    admin_adjustment: "تعديل إداري للرصيد",
  };
  return labels[code] || (code ? code.replaceAll("_", " ") : "لم يُسجل سبب واضح");
}

function addressSummary(subscription: Subscription) {
  const address = subscription.deliveryAddress;
  if (!address) return "—";
  return [
    address.line1,
    address.line2,
    address.building ? `مبنى ${address.building}` : null,
    address.apartment ? `شقة ${address.apartment}` : null,
    address.street,
    address.district,
    address.city,
  ].filter(Boolean).join("، ") || "—";
}

function mealDescription(item: SubscriptionTrackingMealItem) {
  const parts: string[] = [];
  if (item.protein?.name && item.protein.name !== item.name) parts.push(item.protein.name);
  for (const carb of item.carbs || []) {
    parts.push(carb.grams ? `${carb.name} ${carb.grams}g` : carb.name);
  }
  return parts.join(" + ");
}

function Metric({ label, value, note, icon, tone = "default" }: {
  label: string;
  value: number;
  note: string;
  icon: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "border-border bg-card",
    success: "border-emerald-500/30 bg-emerald-500/[0.06]",
    warning: "border-amber-500/30 bg-amber-500/[0.06]",
    danger: "border-red-500/35 bg-red-500/[0.07]",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{note}</p>
        </div>
        <div className="rounded-lg border bg-background/70 p-2 text-primary">{icon}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, dir }: { label: string; value?: ReactNode; dir?: "rtl" | "ltr" }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-left font-medium" dir={dir}>{value}</span>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 font-black">{icon}{title}</div>
      <Separator className="my-3" />
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SourceBox({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function movementMatches(movement: SubscriptionMealMovement, filter: MovementFilter) {
  if (filter === "all") return true;
  if (filter === "manual") return movement.sourceCode === "dashboard_manual_deduction";
  if (filter === "fulfilled") return ["delivery_fulfillment", "branch_pickup_fulfillment"].includes(movement.sourceCode);
  if (filter === "reserved") return movement.balanceEffect === "reserved";
  if (filter === "unknown") return movement.confidence === "unknown";
  return movement.balanceEffect === "forfeited"
    || ["consumed_without_preparation", "pickup_no_show_consumption", "canceled_operation_consumption"].includes(movement.sourceCode);
}

function MovementCard({ movement, compact = false }: { movement: SubscriptionMealMovement; compact?: boolean }) {
  const manual = movement.sourceCode === "dashboard_manual_deduction";
  const details = movement.deductionDetails;
  const before = details?.before.remainingMeals;
  const after = details?.after.remainingMeals;
  const context = movement.fulfillmentContext?.label || details?.fulfillmentContext.label;

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${manual ? "border-violet-500/35 bg-violet-500/[0.07]" : movement.confidence === "unknown" ? "border-red-500/35 bg-red-500/[0.06]" : "bg-card"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">{movement.sourceLabel}</h3>
            <Badge variant="secondary">{movement.quantity} وجبة</Badge>
            <Badge variant="outline" className={confidenceClass(movement.confidence)}>{confidenceLabel(movement.confidence)}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {movement.date ? longDate(movement.date) : "بدون يوم اشتراك محدد"}
            {movement.occurredAt ? ` · ${formatDate(movement.occurredAt, true)}` : ""}
          </p>
        </div>
        <Badge variant={manual ? "default" : "outline"}>{movement.completion.label}</Badge>
      </div>

      {manual ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-violet-500/25 bg-background/70 p-4">
            <p className="text-sm font-black">ماذا خُصم بالضبط؟</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SourceBox label="وجبات عادية" value={details?.regularMeals ?? movement.quantity} icon={<Utensils className="h-4 w-4" />} />
              <SourceBox label="وجبات مميزة" value={details?.premiumMeals ?? 0} icon={<Package className="h-4 w-4" />} />
              <SourceBox label="إجمالي الخصم" value={details?.totalMeals ?? movement.quantity} icon={<ReceiptText className="h-4 w-4" />} />
              <div className="rounded-lg border bg-background/70 p-3">
                <p className="text-xs text-muted-foreground">الرصيد قبل وبعد</p>
                <p className="mt-2 text-xl font-black tabular-nums">
                  {before ?? "—"} ← {after ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">سبب الخصم</p>
              <p className="mt-2 font-semibold">{details?.reasonLabel || movement.reasonLabel || reasonLabel(movement.reasonCode || movement.reason)}</p>
              {(details?.reasonCode || movement.reasonCode) ? <p className="mt-1 font-mono text-[10px] text-muted-foreground" dir="ltr">{details?.reasonCode || movement.reasonCode}</p> : null}
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">من نفّذ الخصم؟</p>
              <p className="mt-2 font-semibold">{movement.actor.email || actorLabel(movement.actor.role)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(movement.actor.role)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">سياق العملية</p>
              <p className="mt-2 font-semibold">{context || "خصم مباشر من الداشبورد"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-dashed bg-background/60 p-3 text-sm leading-6">
            <span className="font-black">الأصناف والوجبات: </span>
            هذه العملية لم تُنشئ طلب وجبات ولم تختَر أصنافًا؛ تم تخفيض رصيد الاشتراك عدديًا مباشرة.
            لذلك المعروض هو عدد الوجبات العادية والمميزة والرصيد قبل وبعد، وليس أسماء أطباق غير موجودة في السجل.
          </div>

          {details?.addons.length ? (
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="mb-2 text-xs font-bold text-muted-foreground">الإضافات المخصومة</p>
              <div className="flex flex-wrap gap-2">
                {details.addons.map((addon, index) => (
                  <Badge key={`${movement.id}-addon-${index}`} variant="outline">
                    {addon.addonId || "إضافة"} × {addon.qty}
                    {addon.remainingBefore !== null && addon.remainingAfter !== null ? ` (${addon.remainingBefore} ← ${addon.remainingAfter})` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {(details?.notes || movement.notes) ? <p className="rounded-lg border bg-background/70 p-3 text-sm">{details?.notes || movement.notes}</p> : null}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">مصدر الاختيار</p>
              <p className="mt-2 font-semibold">{movement.selection.label}</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">الإجراء النهائي</p>
              <p className="mt-2 font-semibold">{movement.completion.label}</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="text-xs font-bold text-muted-foreground">منفذ الإجراء</p>
              <p className="mt-2 font-semibold">{movement.actor.email || actorLabel(movement.actor.role)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{actorLabel(movement.actor.role)}</p>
            </div>
          </div>

          {movement.mealItems.length ? (
            <div className="rounded-lg border bg-background/70 p-3">
              <p className="mb-2 text-xs font-black text-muted-foreground">الوجبات المرتبطة بالحركة</p>
              <div className="grid gap-2 md:grid-cols-2">
                {movement.mealItems.map((item) => {
                  const description = mealDescription(item);
                  return (
                    <div key={`${movement.id}-${item.id}`} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center justify-between gap-2">
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
            <div className="rounded-lg border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
              لا توجد أسماء وجبات محفوظة لهذه الحركة.
            </div>
          )}
        </div>
      )}

      {!compact && movement.operations.length ? (
        <details className="mt-3 rounded-lg border bg-background/60 p-3">
          <summary className="cursor-pointer font-bold">مراحل العملية ({movement.operations.length})</summary>
          <div className="mt-3 space-y-2">
            {movement.operations.map((operation, index) => (
              <div key={`${movement.id}-op-${index}`} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3 text-xs">
                <div>
                  <p className="font-bold">{operation.label}</p>
                  <p className="mt-1 text-muted-foreground">{operation.actor.email || actorLabel(operation.actor.role)}</p>
                </div>
                <span className="shrink-0 text-muted-foreground">{formatDate(operation.at, true)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function dayState(day: SubscriptionTrackingDay): SubscriptionTrackingDayState {
  if (day.trackingState) return day.trackingState;
  if (day.receivedMeals > 0) return "received";
  if ((day.consumedWithoutPreparationMeals ?? 0) > 0) return "consumed_without_preparation";
  if (day.forfeitedMeals > 0) return "exception";
  if (day.selectedMeals > 0 && !day.isPast) return "planned";
  return day.isPast ? "historical_empty" : "upcoming";
}

function timelineMatches(day: SubscriptionTrackingDay, filter: TimelineFilter) {
  const state = dayState(day);
  if (filter === "all") return true;
  if (filter === "received") return state === "received";
  if (filter === "planned") return state === "planned";
  if (filter === "active") return state === "in_progress";
  if (filter === "upcoming") return state === "upcoming" || state === "available_today";
  return EXCEPTION_STATES.has(state) || state === "exception";
}

function TimelineCard({ day }: { day: SubscriptionTrackingDay }) {
  const state = dayState(day);
  const open = day.isToday || state === "received" || EXCEPTION_STATES.has(state);
  const tone = state === "received"
    ? "border-emerald-500/30 bg-emerald-500/[0.05]"
    : state === "in_progress"
      ? "border-blue-500/30 bg-blue-500/[0.05]"
      : state === "planned"
        ? "border-violet-500/30 bg-violet-500/[0.05]"
        : EXCEPTION_STATES.has(state)
          ? "border-amber-500/30 bg-amber-500/[0.05]"
          : "bg-card";
  return (
    <details className={`group rounded-xl border p-4 shadow-sm ${tone}`} open={open}>
      <summary className="flex cursor-pointer list-none flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black">{day.calendar?.fullDateLabels?.ar || longDate(day.date)}</span>
            {day.isToday ? <Badge>اليوم</Badge> : null}
            <Badge variant="outline">{day.statusLabel}</Badge>
            <Badge variant="secondary">{day.sourceLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">{day.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-background/70 px-3 py-2"><p className="text-[10px] text-muted-foreground">الاختيار</p><p className="font-black">{day.selectedMeals}/{day.requiredMeals}</p></div>
            <div className="rounded-lg border bg-background/70 px-3 py-2"><p className="text-[10px] text-muted-foreground">استلام فعلي</p><p className="font-black">{day.receivedMeals}</p></div>
            <div className="rounded-lg border bg-background/70 px-3 py-2"><p className="text-[10px] text-muted-foreground">الطريقة</p><p className="text-xs font-bold">{fulfillmentLabel(day.fulfillmentMode)}</p></div>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-4 space-y-2">
        {day.mealItems.length ? day.mealItems.map((item) => (
          <div key={`${day.date}-${item.id}`} className="rounded-lg border bg-background/75 p-3">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold">{item.name}</span><Badge variant={item.isPremium ? "default" : "outline"}>{item.typeLabel}</Badge></div>
            {mealDescription(item) ? <p className="mt-1 text-xs text-muted-foreground">{mealDescription(item)}</p> : null}
          </div>
        )) : <div className="rounded-lg border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">لا توجد أسماء وجبات محفوظة لهذا اليوم.</div>}
        <div className="flex flex-wrap gap-2 text-xs">
          {day.reservedMeals > 0 ? <Badge variant="outline">محجوز: {day.reservedMeals}</Badge> : null}
          {(day.consumedWithoutPreparationMeals ?? 0) > 0 ? <Badge variant="destructive">حسم بدون تحضير: {day.consumedWithoutPreparationMeals}</Badge> : null}
          {day.forfeitedMeals > 0 ? <Badge variant="destructive">مصادَر: {day.forfeitedMeals}</Badge> : null}
          {day.releasedMeals > 0 ? <Badge variant="secondary">تم تحريره: {day.releasedMeals}</Badge> : null}
        </div>
      </div>
    </details>
  );
}

export function SubscriptionTrackingExperienceV5({ subscription, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const subscriptionId = subscription?._id ?? "";

  useEffect(() => {
    setTab("overview");
    setTimelineFilter("all");
    setMovementFilter("all");
  }, [subscriptionId, open]);

  const detailsQuery = useSubscriptionDetailsQuery(subscriptionId);
  const trackingQuery = useSubscriptionTrackingQuery(subscriptionId);
  const details = detailsQuery.data?.data ?? subscription;
  const tracking = trackingQuery.data?.data as SubscriptionTrackingDataWithProvenance | undefined;
  const summary = tracking?.summary;
  const coverage = tracking?.provenance?.coverage;
  const movements = useMemo(() => [...(tracking?.provenance?.movements ?? [])].sort((a, b) => {
    const left = Date.parse(a.occurredAt || `${a.date || "1970-01-01"}T00:00:00Z`);
    const right = Date.parse(b.occurredAt || `${b.date || "1970-01-01"}T00:00:00Z`);
    return right - left;
  }), [tracking?.provenance?.movements]);

  const total = summary?.totalMeals ?? details?.totalMeals ?? 0;
  const received = summary?.receivedMeals ?? 0;
  const available = summary?.availableMeals ?? details?.remainingMeals ?? 0;
  const reserved = summary?.reservedMeals ?? 0;
  const consumed = summary?.balanceConsumedMeals ?? summary?.consumedMeals ?? 0;
  const forfeited = summary?.forfeitedMeals ?? 0;
  const nonReceipt = Math.max(0, consumed - received) + forfeited;
  const manualMovements = movements.filter((movement) => movement.sourceCode === "dashboard_manual_deduction");

  const movementCounts = useMemo(() => Object.fromEntries(MOVEMENT_FILTERS.map((item) => [
    item.value,
    movements.filter((movement) => movementMatches(movement, item.value)).reduce((sum, movement) => sum + movement.quantity, 0),
  ])) as Record<MovementFilter, number>, [movements]);
  const visibleMovements = movements.filter((movement) => movementMatches(movement, movementFilter));

  const timelineCounts = useMemo(() => Object.fromEntries(TIMELINE_FILTERS.map((item) => [
    item.value,
    (tracking?.days ?? []).filter((day) => timelineMatches(day, item.value)).length,
  ])) as Record<TimelineFilter, number>, [tracking?.days]);
  const groupedTimeline = useMemo(() => {
    const groups = new Map<string, SubscriptionTrackingDay[]>();
    for (const day of (tracking?.days ?? []).filter((row) => timelineMatches(row, timelineFilter))) {
      const month = day.calendar?.monthYearLabels?.ar || monthLabel(day.date);
      groups.set(month, [...(groups.get(month) ?? []), day]);
    }
    return [...groups.entries()];
  }, [timelineFilter, tracking?.days]);

  const customerName = details?.user?.fullName || details?.userName || "مشترك بدون اسم";
  const planName = details?.planName || details?.plan?.name || "باقة غير محددة";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[99vw] max-w-[99vw] gap-0 overflow-hidden p-0 sm:max-w-[1600px]" dir="rtl">
        <div className="border-b bg-background px-5 py-4 sm:px-6">
          <DialogHeader className="text-right">
            <div className="flex w-[95%] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-black">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  {customerName}
                  {details ? <Badge variant="outline" className={statusClass(details.status)}>{statusLabel(details.status)}</Badge> : null}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {planName}{details?.selectedGrams ? ` · ${details.selectedGrams}g` : ""}{details?.selectedMealsPerDay ? ` · ${details.selectedMealsPerDay} وجبة يوميًا` : ""}{details ? ` · ${fulfillmentLabel(details.deliveryMode || details.fulfillmentMethod)}` : ""}
                </DialogDescription>
                {details ? <p className="mt-2 text-xs text-muted-foreground">{formatDate(details.startDate)} — {formatDate(details.validityEndDate)}{details.user?.phone ? <span dir="ltr"> · {details.user.phone}</span> : null}</p> : null}
              </div>
              {details ? <div className="flex flex-wrap gap-2"><Badge variant="secondary">{details.displayId || details.id || details._id}</Badge><Badge variant="outline" className="gap-1"><ShieldCheck className="h-3.5 w-3.5" />قراءة فقط</Badge></div> : null}
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(97vh-112px)] overflow-y-auto bg-muted/10 px-4 py-5 sm:px-6">
          {detailsQuery.isLoading && !details ? (
            <div className="space-y-4"><div className="grid gap-3 md:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}</div><Skeleton className="h-[38rem] rounded-xl" /></div>
          ) : detailsQuery.isError || !details ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center"><ReceiptText className="mb-3 h-8 w-8 text-muted-foreground" /><p className="font-semibold">تعذر تحميل تفاصيل الاشتراك</p></div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <Metric label="إجمالي الاشتراك" value={total} note="كل الوجبات المشتراة" icon={<Package className="h-5 w-5" />} />
                <Metric label="استلم فعليًا" value={received} note="تسليم أو استلام مثبت" icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
                <Metric label="متاح الآن" value={available} note="غير محجوز ويمكن استخدامه" icon={<Utensils className="h-5 w-5" />} />
                <Metric label="محجوز" value={reserved} note="لم يُستهلك أو يُسلّم بعد" icon={<Clock3 className="h-5 w-5" />} tone={reserved ? "warning" : "default"} />
                <Metric label="خصم أو حسم" value={nonReceipt} note="خفض رصيد بدون استلام فعلي" icon={<AlertTriangle className="h-5 w-5" />} tone={nonReceipt ? "danger" : "default"} />
              </div>

              <Tabs value={tab} onValueChange={(value) => setTab(value as WorkspaceTab)} className="gap-4">
                <div className="sticky top-0 z-20 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
                    <TabsTrigger value="overview" className="py-2.5"><LayoutDashboard className="h-4 w-4" />نظرة عامة</TabsTrigger>
                    <TabsTrigger value="timeline" className="py-2.5"><CalendarDays className="h-4 w-4" />الخط الزمني</TabsTrigger>
                    <TabsTrigger value="movements" className="py-2.5"><History className="h-4 w-4" />سجل حركة الرصيد{coverage?.unknownMeals ? <Badge variant="destructive">{coverage.unknownMeals}</Badge> : null}</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-4">
                  <section className={`rounded-xl border p-4 shadow-sm ${coverage?.status === "complete" ? "border-emerald-500/30 bg-emerald-500/[0.05]" : "border-red-500/30 bg-red-500/[0.05]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><h2 className="flex items-center gap-2 font-black">{coverage?.status === "complete" ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}{coverage?.status === "complete" ? "كل الاستهلاك له مصدر موثق" : "توجد حركة تحتاج مراجعة"}</h2><p className="mt-2 text-sm text-muted-foreground">المستهلك رسميًا {consumed} وجبة، المعروض في سجل الحركات {coverage?.representedMeals ?? 0}، وغير المعروف {coverage?.unknownMeals ?? 0}.</p></div>
                      <Badge variant={coverage?.status === "complete" ? "secondary" : "destructive"}>{coverage?.status === "complete" ? "تغطية كاملة" : "تحتاج مراجعة"}</Badge>
                    </div>
                  </section>

                  {manualMovements.length ? (
                    <section className="space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-4 shadow-sm">
                      <div><h2 className="text-lg font-black">الخصومات المباشرة المسجلة</h2><p className="mt-1 text-xs text-muted-foreground">هذه الحركات خفضت الرصيد مباشرة ولم تُسجل كاستلام وجبات.</p></div>
                      {manualMovements.map((movement) => <MovementCard key={movement.id} movement={movement} compact />)}
                    </section>
                  ) : null}

                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="font-black">معادلة الرصيد</h2>
                    <p className="mt-1 text-xs text-muted-foreground">إجمالي الاشتراك يجب أن يساوي المتاح + المحجوز + المستهلك + المصادَر.</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      <SourceBox label="الإجمالي" value={total} icon={<Package className="h-4 w-4" />} />
                      <SourceBox label="متاح" value={available} icon={<Utensils className="h-4 w-4" />} />
                      <SourceBox label="محجوز" value={reserved} icon={<Clock3 className="h-4 w-4" />} />
                      <SourceBox label="مستهلك رسميًا" value={consumed} icon={<ReceiptText className="h-4 w-4" />} />
                      <SourceBox label="مصادَر" value={forfeited} icon={<AlertTriangle className="h-4 w-4" />} />
                    </div>
                  </section>

                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="font-black">مصدر الحركات</h2>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                      <SourceBox label="توصيل" value={coverage?.consumption.delivery ?? 0} icon={<Truck className="h-4 w-4" />} />
                      <SourceBox label="استلام فرع" value={coverage?.consumption.branchPickup ?? 0} icon={<Store className="h-4 w-4" />} />
                      <SourceBox label="خصم داشبورد" value={coverage?.consumption.dashboardManual ?? 0} icon={<LayoutDashboard className="h-4 w-4" />} />
                      <SourceBox label="بدون تحضير" value={coverage?.consumption.consumedWithoutPreparation ?? 0} icon={<ReceiptText className="h-4 w-4" />} />
                      <SourceBox label="عدم حضور" value={coverage?.consumption.noShow ?? 0} icon={<UserRoundCheck className="h-4 w-4" />} />
                      <SourceBox label="اختيار التطبيق" value={coverage?.selection.mobileApp ?? 0} icon={<Smartphone className="h-4 w-4" />} />
                      <SourceBox label="اختيار الداشبورد" value={coverage?.selection.dashboard ?? 0} icon={<LayoutDashboard className="h-4 w-4" />} />
                      <SourceBox label="غير معروف" value={coverage?.unknownMeals ?? 0} icon={<CircleHelp className="h-4 w-4" />} />
                    </div>
                  </section>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <Panel title="المشترك" icon={<User className="h-4 w-4 text-primary" />}><DetailRow label="الاسم" value={customerName} /><DetailRow label="الهاتف" value={details.user?.phone} dir="ltr" /><DetailRow label="البريد" value={details.user?.email} dir="ltr" /><DetailRow label="حالة العميل" value={details.user?.isActive === false ? "غير نشط" : "نشط"} /></Panel>
                    <Panel title="الخطة والصلاحية" icon={<CalendarDays className="h-4 w-4 text-primary" />}><DetailRow label="الباقة" value={planName} /><DetailRow label="الجرامات" value={details.selectedGrams ? `${details.selectedGrams}g` : ""} /><DetailRow label="وجبات يوميًا" value={details.selectedMealsPerDay} /><DetailRow label="البداية" value={formatDate(details.startDate)} /><DetailRow label="نهاية الصلاحية" value={formatDate(details.validityEndDate)} /></Panel>
                    <Panel title="التنفيذ" icon={<MapPin className="h-4 w-4 text-primary" />}><DetailRow label="الطريقة" value={fulfillmentLabel(details.deliveryMode || details.fulfillmentMethod)} /><DetailRow label="المنطقة" value={details.deliveryZoneName || details.deliveryAddress?.district} /><DetailRow label="الوقت" value={details.deliverySlot?.window || details.deliveryWindow} /><DetailRow label="العنوان" value={addressSummary(details)} /></Panel>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4">
                  <section className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><Activity className="h-5 w-5 text-primary" />الخط الزمني للوجبات</h2><p className="mt-1 text-xs text-muted-foreground">اضغط على اليوم لعرض الوجبات والحالة التشغيلية.</p></div><div className="flex flex-wrap gap-2">{TIMELINE_FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setTimelineFilter(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${timelineFilter === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{item.label} ({timelineCounts[item.value]})</button>)}</div></div></section>
                  {trackingQuery.isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div> : groupedTimeline.length ? <div className="space-y-5">{groupedTimeline.map(([month, days]) => <section key={month} className="space-y-3"><div className="sticky top-[62px] z-10 flex items-center justify-between rounded-lg border bg-background/95 px-3 py-2 backdrop-blur"><h3 className="font-black">{month}</h3><Badge variant="secondary">{days.length} يوم</Badge></div>{days.map((day) => <TimelineCard key={day.date} day={day} />)}</section>)}</div> : <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">لا توجد أيام مطابقة للفلتر.</div>}
                </TabsContent>

                <TabsContent value="movements" className="space-y-4">
                  <section className="rounded-xl border bg-card p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black"><History className="h-5 w-5 text-primary" />سجل حركة الرصيد</h2><p className="mt-1 text-xs text-muted-foreground">كل حركة توضح ما خُصم، السبب، المنفذ، والرصيد قبل وبعد عندما تكون البيانات محفوظة.</p></div><div className="flex flex-wrap gap-2">{MOVEMENT_FILTERS.map((item) => <button key={item.value} type="button" onClick={() => setMovementFilter(item.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${movementFilter === item.value ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}>{item.label} ({movementCounts[item.value]})</button>)}</div></div></section>
                  {trackingQuery.isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-60 rounded-xl" />)}</div> : visibleMovements.length ? <div className="space-y-3">{visibleMovements.map((movement) => <MovementCard key={movement.id} movement={movement} />)}</div> : <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">لا توجد حركات مطابقة للفلتر.</div>}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
