import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptionDetailsQuery } from "@/hooks/useSubscriptionsQuery";
import { useSubscriptionTrackingQuery } from "@/hooks/useSubscriptionTrackingQuery";
import type { Subscription } from "@/types/subscriptionTypes";
import type {
  SubscriptionTrackingDay,
  SubscriptionTrackingDayState,
} from "@/types/subscriptionTrackingTypes";
import type {
  SubscriptionMealMovement,
  SubscriptionTrackingDataWithProvenance,
} from "@/types/subscriptionMovementProvenanceTypes";
import {
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
  Store,
  Truck,
  User,
  Utensils,
} from "lucide-react";
import {
  manualDeductionDisplayLabel,
  manualDeductionQuantity,
} from "@/utils/subscriptionMovementLabels";

interface Props {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WorkspaceTab = "summary" | "days" | "details";
type DayFilter = "all" | "received" | "reserved" | "upcoming" | "issues";

const ISSUE_STATES = new Set<SubscriptionTrackingDayState>([
  "consumed_without_preparation",
  "exception",
  "missed_selection",
]);

const DAY_FILTERS: Array<{ value: DayFilter; label: string }> = [
  { value: "all", label: "كل الأيام" },
  { value: "received", label: "تم الاستلام" },
  { value: "reserved", label: "محجوز" },
  { value: "upcoming", label: "الأيام القادمة" },
  { value: "issues", label: "تحتاج مراجعة" },
];

function safeCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function formatDate(value?: string | null, includeTime = false): string {
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

function fulfillmentLabel(value?: string | null): string {
  if (value === "delivery") return "توصيل";
  if (value === "pickup") return "استلام من الفرع";
  return value || "غير محدد";
}

function statusLabel(value?: string | null): string {
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
  return labels[value || ""] || value || "غير محدد";
}

function statusClass(value?: string | null): string {
  if (value === "active") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (value === "pending" || value === "pending_payment") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (value === "canceled") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  return "border-border bg-muted/50 text-muted-foreground";
}

function actorLabel(role?: string | null): string {
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

function addressSummary(subscription: Subscription): string {
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

function resolveDayState(day: SubscriptionTrackingDay): SubscriptionTrackingDayState {
  if (day.trackingState) return day.trackingState;
  if (safeCount(day.receivedMeals) > 0) return "received";
  if (safeCount(day.consumedWithoutPreparationMeals) > 0) {
    return "consumed_without_preparation";
  }
  if (safeCount(day.forfeitedMeals) > 0) return "exception";
  if (safeCount(day.selectedMeals) > 0 && !day.isPast) return "planned";
  return day.isPast ? "historical_empty" : "upcoming";
}

function dayMatches(day: SubscriptionTrackingDay, filter: DayFilter): boolean {
  const state = resolveDayState(day);
  if (filter === "all") return true;
  if (filter === "received") return safeCount(day.receivedMeals) > 0;
  if (filter === "reserved") return safeCount(day.reservedMeals) > 0;
  if (filter === "upcoming") {
    return state === "upcoming" || state === "available_today" || state === "planned";
  }
  return ISSUE_STATES.has(state);
}

function PrimaryMetric({
  label,
  value,
  note,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  note: ReactNode;
  icon: ReactNode;
  tone?: "default" | "success" | "primary";
}) {
  const toneClass = {
    default: "border-border bg-card",
    success: "border-emerald-500/35 bg-emerald-500/[0.07]",
    primary: "border-primary/40 bg-primary/[0.08]",
  }[tone];

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <p className="mt-2 text-4xl font-black tabular-nums sm:text-5xl">{value}</p>
          <div className="mt-3 text-xs leading-6 text-muted-foreground">{note}</div>
        </div>
        <div className="rounded-xl border bg-background/80 p-3 text-primary">{icon}</div>
      </div>
    </section>
  );
}

function SmallMetric({
  label,
  value,
  note,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  note?: string;
  icon: ReactNode;
  tone?: "default" | "warning" | "danger" | "manual";
}) {
  const toneClass = {
    default: "border-border bg-background/75",
    warning: "border-amber-500/30 bg-amber-500/[0.06]",
    danger: "border-red-500/30 bg-red-500/[0.06]",
    manual: "border-violet-500/30 bg-violet-500/[0.07]",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-3xl font-black tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function FormulaItem({ label, value, sign }: { label: string; value: number; sign?: string }) {
  return (
    <div className="flex items-center gap-2">
      {sign ? <span className="text-xl font-black text-muted-foreground">{sign}</span> : null}
      <div className="min-w-[120px] rounded-xl border bg-background/80 px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  dir,
}: {
  label: string;
  value?: ReactNode;
  dir?: "rtl" | "ltr";
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-left font-semibold" dir={dir}>{value}</span>
    </div>
  );
}

function InfoPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="flex items-center gap-2 font-black">{icon}{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function DayCard({ day }: { day: SubscriptionTrackingDay }) {
  const state = resolveDayState(day);
  const isIssue = ISSUE_STATES.has(state);
  const received = safeCount(day.receivedMeals);
  const reserved = safeCount(day.reservedMeals);
  const selected = safeCount(day.selectedMeals);

  return (
    <details
      className={`group rounded-xl border p-4 shadow-sm ${
        received > 0
          ? "border-emerald-500/30 bg-emerald-500/[0.05]"
          : isIssue
            ? "border-amber-500/30 bg-amber-500/[0.05]"
            : "bg-card"
      }`}
      open={day.isToday || received > 0 || isIssue}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <strong>{day.calendar?.fullDateLabels?.ar || formatDate(day.date)}</strong>
            {day.isToday ? <Badge>اليوم</Badge> : null}
            <Badge variant="outline">{day.statusLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">{day.date}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <span className="block text-[10px] text-muted-foreground">اختار</span>
              <strong className="tabular-nums">{selected}</strong>
            </div>
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <span className="block text-[10px] text-muted-foreground">استلم</span>
              <strong className="tabular-nums">{received}</strong>
            </div>
            <div className="rounded-lg border bg-background/75 px-3 py-2">
              <span className="block text-[10px] text-muted-foreground">محجوز</span>
              <strong className="tabular-nums">{reserved}</strong>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </div>
      </summary>

      <div className="mt-4 space-y-3 border-t pt-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{fulfillmentLabel(day.fulfillmentMode)}</Badge>
          <Badge variant="outline">المطلوب {safeCount(day.requiredMeals)}</Badge>
          {safeCount(day.consumedWithoutPreparationMeals) > 0 ? (
            <Badge variant="destructive">
              حسم بدون تحضير: {safeCount(day.consumedWithoutPreparationMeals)}
            </Badge>
          ) : null}
          {safeCount(day.forfeitedMeals) > 0 ? (
            <Badge variant="destructive">مصادَر: {safeCount(day.forfeitedMeals)}</Badge>
          ) : null}
        </div>

        {day.mealItems?.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {day.mealItems.map((item) => (
              <div key={`${day.date}-${item.id}`} className="rounded-lg border bg-background/75 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{item.name}</span>
                  <Badge variant={item.isPremium ? "default" : "outline"}>{item.typeLabel}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
            لا توجد أسماء وجبات محفوظة لهذا اليوم.
          </p>
        )}
      </div>
    </details>
  );
}

function MovementRow({ movement }: { movement: SubscriptionMealMovement }) {
  const isManual = movement.sourceCode === "dashboard_manual_deduction";
  const quantity = isManual ? manualDeductionQuantity(movement) : safeCount(movement.quantity);
  const before = movement.deductionDetails?.before.remainingMeals;
  const after = movement.deductionDetails?.after.remainingMeals;

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${isManual ? "border-violet-500/30 bg-violet-500/[0.06]" : "bg-card"}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black">
              {isManual ? manualDeductionDisplayLabel(quantity) : movement.sourceLabel}
            </h3>
            <Badge variant={isManual ? "outline" : "secondary"}>{quantity} وجبة</Badge>
            {isManual ? (
              <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-200" variant="outline">
                محسوب ضمن المستلم
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {movement.occurredAt
              ? formatDate(movement.occurredAt, true)
              : formatDate(movement.date)}
          </p>
        </div>
        <Badge variant="outline">{movement.completion.label}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-background/75 p-3">
          <p className="text-xs text-muted-foreground">منفذ العملية</p>
          <p className="mt-1 font-semibold" dir={movement.actor.email ? "ltr" : "rtl"}>
            {movement.actor.email || actorLabel(movement.actor.role)}
          </p>
        </div>
        <div className="rounded-lg border bg-background/75 p-3">
          <p className="text-xs text-muted-foreground">السبب أو النتيجة</p>
          <p className="mt-1 font-semibold">
            {movement.reasonLabel || movement.reason || movement.completion.label}
          </p>
        </div>
        <div className="rounded-lg border bg-background/75 p-3">
          <p className="text-xs text-muted-foreground">الرصيد</p>
          <p className="mt-1 font-semibold tabular-nums">
            {before !== null && before !== undefined && after !== null && after !== undefined
              ? `${before} ← ${after}`
              : "غير مسجل"}
          </p>
        </div>
      </div>
    </article>
  );
}

export function SubscriptionTrackingExperienceV7({ subscription, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<WorkspaceTab>("summary");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const subscriptionId = subscription?._id ?? "";

  useEffect(() => {
    setTab("summary");
    setDayFilter("all");
  }, [subscriptionId, open]);

  const detailsQuery = useSubscriptionDetailsQuery(subscriptionId);
  const trackingQuery = useSubscriptionTrackingQuery(subscriptionId);
  const details = detailsQuery.data?.data ?? subscription;
  const tracking = trackingQuery.data?.data as SubscriptionTrackingDataWithProvenance | undefined;
  const summary = tracking?.summary;
  const coverage = tracking?.provenance?.coverage;

  const movements = useMemo(
    () => [...(tracking?.provenance?.movements ?? [])].sort((left, right) => {
      const leftTime = Date.parse(left.occurredAt || `${left.date || "1970-01-01"}T00:00:00Z`);
      const rightTime = Date.parse(right.occurredAt || `${right.date || "1970-01-01"}T00:00:00Z`);
      return rightTime - leftTime;
    }),
    [tracking?.provenance?.movements]
  );

  const manualFromMovements = movements
    .filter((movement) => movement.sourceCode === "dashboard_manual_deduction")
    .reduce((sum, movement) => sum + manualDeductionQuantity(movement), 0);

  const total = safeCount(summary?.totalMeals ?? details?.totalMeals);
  const systemReceived = safeCount(summary?.receivedMeals);
  const available = safeCount(summary?.availableMeals ?? details?.remainingMeals);
  const reserved = safeCount(summary?.reservedMeals);
  const remaining = available + reserved;
  const consumed = safeCount(summary?.balanceConsumedMeals ?? summary?.consumedMeals);
  const forfeited = safeCount(summary?.forfeitedMeals);
  const manualDeducted = Math.max(
    manualFromMovements,
    safeCount(summary?.manualDeductedMeals),
    safeCount(tracking?.adjustments?.totals.manualDeductedMeals),
    safeCount(coverage?.consumption.dashboardManual)
  );
  const received = Math.min(total, systemReceived + manualDeducted);
  const operationalDeducted = Math.max(0, consumed - systemReceived - manualDeducted);
  const otherDeductions = operationalDeducted + forfeited;
  const deductedWithoutReceipt = Math.max(0, total - remaining - received);
  const accounted = available + reserved + consumed + forfeited;
  const balanceDifference = safeCount(summary?.balanceIntegrity?.difference ?? Math.abs(total - accounted));
  const unknownMeals = safeCount(coverage?.unknownMeals ?? summary?.unattributedConsumedMeals);

  const days = tracking?.days ?? [];
  const dayCounts = useMemo(
    () => Object.fromEntries(
      DAY_FILTERS.map((item) => [
        item.value,
        days.filter((day) => dayMatches(day, item.value)).length,
      ])
    ) as Record<DayFilter, number>,
    [days]
  );
  const visibleDays = days.filter((day) => dayMatches(day, dayFilter));

  const customerName = details?.user?.fullName || details?.userName || "مشترك بدون اسم";
  const planName = details?.planName || details?.plan?.name || "باقة غير محددة";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[97vh] w-[99vw] max-w-[99vw] gap-0 overflow-hidden p-0 sm:max-w-[1500px]" dir="rtl">
        <div className="border-b bg-background px-5 py-4 sm:px-6">
          <DialogHeader className="text-right">
            <div className="flex w-[95%] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-black">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  {customerName}
                  {details ? (
                    <Badge variant="outline" className={statusClass(details.status)}>
                      {statusLabel(details.status)}
                    </Badge>
                  ) : null}
                </DialogTitle>
                <DialogDescription className="mt-2">
                  {planName}
                  {details?.selectedGrams ? ` · ${details.selectedGrams}g` : ""}
                  {details?.selectedMealsPerDay ? ` · ${details.selectedMealsPerDay} وجبة يوميًا` : ""}
                  {details ? ` · ${fulfillmentLabel(details.deliveryMode || details.fulfillmentMethod)}` : ""}
                </DialogDescription>
                {details ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDate(details.startDate)} — {formatDate(details.validityEndDate)}
                    {details.user?.phone ? <span dir="ltr"> · {details.user.phone}</span> : null}
                  </p>
                ) : null}
              </div>
              {details ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{details.displayId || details.id || details._id}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    قراءة فقط
                  </Badge>
                </div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(97vh-112px)] overflow-y-auto bg-muted/10 px-4 py-5 sm:px-6">
          {detailsQuery.isLoading && !details ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-40 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-[30rem] rounded-xl" />
            </div>
          ) : detailsQuery.isError || !details ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card text-center">
              <ReceiptText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">تعذر تحميل تفاصيل الاشتراك</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <PrimaryMetric
                  label="إجمالي الوجبات"
                  value={total}
                  note="كل الوجبات التي اشتراها العميل في هذا الاشتراك"
                  icon={<Package className="h-6 w-6" />}
                />
                <PrimaryMetric
                  label="المستلم"
                  value={received}
                  note={
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      <span><strong className="text-foreground">{systemReceived}</strong> استلام مثبت</span>
                      <span><strong className="text-foreground">{manualDeducted}</strong> خصم يدوي محسوب كمستلم</span>
                    </span>
                  }
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  tone="success"
                />
                <PrimaryMetric
                  label="المتبقي للعميل"
                  value={remaining}
                  note={
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      <span><strong className="text-foreground">{available}</strong> متاح للاختيار</span>
                      <span><strong className="text-foreground">{reserved}</strong> محجوز لأيام قادمة</span>
                    </span>
                  }
                  icon={<Utensils className="h-6 w-6" />}
                  tone="primary"
                />
              </div>

              <Tabs value={tab} onValueChange={(value) => setTab(value as WorkspaceTab)} className="gap-4">
                <div className="sticky top-0 z-20 rounded-xl border bg-background/95 p-2 shadow-sm backdrop-blur">
                  <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
                    <TabsTrigger value="summary" className="py-2.5">
                      <LayoutDashboard className="h-4 w-4" />
                      الملخص
                    </TabsTrigger>
                    <TabsTrigger value="days" className="py-2.5">
                      <CalendarDays className="h-4 w-4" />
                      الأيام
                    </TabsTrigger>
                    <TabsTrigger value="details" className="py-2.5">
                      <History className="h-4 w-4" />
                      تفاصيل الرصيد
                      {balanceDifference || unknownMeals ? <Badge variant="destructive">!</Badge> : null}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="summary" className="space-y-4">
                  <section className="rounded-2xl border bg-card p-5 shadow-sm">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h2 className="text-lg font-black">الحساب ببساطة</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          الخصم اليدوي يُعامل هنا كاستلام لأن العامل أكد خروج الوجبات للعميل.
                        </p>
                      </div>
                      <Badge variant={balanceDifference === 0 ? "secondary" : "destructive"}>
                        {balanceDifference === 0 ? "الحساب متوازن" : `يوجد فرق ${balanceDifference}`}
                      </Badge>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                      <FormulaItem label="إجمالي الوجبات" value={total} />
                      <FormulaItem label="المستلم" value={received} sign="−" />
                      <FormulaItem label="خصومات أخرى" value={deductedWithoutReceipt} sign="−" />
                      <FormulaItem label="المتبقي للعميل" value={remaining} sign="=" />
                    </div>

                    {deductedWithoutReceipt > 0 ? (
                      <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3 text-sm leading-6">
                        توجد <strong>{deductedWithoutReceipt}</strong> وجبة خرجت من الرصيد خارج بند المستلم،
                        وهي حسم تشغيلي أو مصادرة وتظل ظاهرة للمراجعة.
                      </p>
                    ) : null}
                  </section>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <section className="rounded-xl border bg-card p-4 shadow-sm">
                      <h2 className="font-black">تفصيل المتبقي للعميل</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        كلا الرقمين ما زالا من حق العميل، لكن المحجوز مرتبط بأيام مختارة بالفعل.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <SmallMetric
                          label="متاح للاختيار الآن"
                          value={available}
                          note="يمكن استخدامه في اختيار وجبات جديدة"
                          icon={<Utensils className="h-4 w-4" />}
                        />
                        <SmallMetric
                          label="محجوز لأيام قادمة"
                          value={reserved}
                          note="لا يُخصم مرة ثانية أثناء الحجز"
                          icon={<Clock3 className="h-4 w-4" />}
                          tone={reserved ? "warning" : "default"}
                        />
                      </div>
                    </section>

                    <section className="rounded-xl border bg-card p-4 shadow-sm">
                      <h2 className="font-black">ما الذي خرج من الرصيد؟</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        المستلم يجمع الاستلام المثبت والخصم اليدوي، مع إبقاء التقسيم ظاهرًا للمراجعة.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <SmallMetric
                          label="المستلم الإجمالي"
                          value={received}
                          note={`${systemReceived} استلام مثبت · ${manualDeducted} خصم يدوي`}
                          icon={<CheckCircle2 className="h-4 w-4" />}
                        />
                        <SmallMetric
                          label="حسم أو مصادرة"
                          value={otherDeductions}
                          icon={<AlertTriangle className="h-4 w-4" />}
                          tone={otherDeductions ? "danger" : "default"}
                        />
                      </div>
                    </section>
                  </div>

                  {(balanceDifference > 0 || unknownMeals > 0) ? (
                    <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 shadow-sm">
                      <h2 className="flex items-center gap-2 font-black">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        توجد بيانات تحتاج مراجعة
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        {balanceDifference > 0 ? <Badge variant="destructive">فرق الرصيد: {balanceDifference}</Badge> : null}
                        {unknownMeals > 0 ? <Badge variant="destructive">مصدر غير معروف: {unknownMeals}</Badge> : null}
                      </div>
                    </section>
                  ) : null}

                  <details className="group rounded-xl border bg-card p-4 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black">
                      <span className="flex items-center gap-2">
                        <CircleHelp className="h-4 w-4 text-primary" />
                        عرض المعلومات الإدارية والتفسير الفني
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>

                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <SmallMetric label="مستهلك في الرصيد" value={consumed} icon={<ReceiptText className="h-4 w-4" />} />
                        <SmallMetric label="مصادَر" value={forfeited} icon={<AlertTriangle className="h-4 w-4" />} />
                        <SmallMetric label="مصدره معروف" value={safeCount(coverage?.exactMeals) + safeCount(coverage?.derivedMeals)} icon={<ShieldCheck className="h-4 w-4" />} />
                        <SmallMetric label="مصدر غير معروف" value={unknownMeals} icon={<CircleHelp className="h-4 w-4" />} tone={unknownMeals ? "warning" : "default"} />
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <InfoPanel title="المشترك" icon={<User className="h-4 w-4 text-primary" />}>
                          <InfoRow label="الاسم" value={customerName} />
                          <InfoRow label="الهاتف" value={details.user?.phone} dir="ltr" />
                          <InfoRow label="البريد" value={details.user?.email} dir="ltr" />
                          <InfoRow label="حالة العميل" value={details.user?.isActive === false ? "غير نشط" : "نشط"} />
                        </InfoPanel>
                        <InfoPanel title="الخطة" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
                          <InfoRow label="الباقة" value={planName} />
                          <InfoRow label="الجرامات" value={details.selectedGrams ? `${details.selectedGrams}g` : ""} />
                          <InfoRow label="وجبات يوميًا" value={details.selectedMealsPerDay} />
                          <InfoRow label="البداية" value={formatDate(details.startDate)} />
                          <InfoRow label="النهاية" value={formatDate(details.validityEndDate)} />
                        </InfoPanel>
                        <InfoPanel title="التنفيذ" icon={<MapPin className="h-4 w-4 text-primary" />}>
                          <InfoRow label="الطريقة" value={fulfillmentLabel(details.deliveryMode || details.fulfillmentMethod)} />
                          <InfoRow label="المنطقة" value={details.deliveryZoneName || details.deliveryAddress?.district} />
                          <InfoRow label="الوقت" value={details.deliverySlot?.window || details.deliveryWindow} />
                          <InfoRow label="العنوان" value={addressSummary(details)} />
                        </InfoPanel>
                      </div>
                    </div>
                  </details>
                </TabsContent>

                <TabsContent value="days" className="space-y-4">
                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-lg font-black">أيام الاشتراك</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          رقم الاستلام داخل اليوم يعرض العملية المرتبطة بهذا اليوم فقط؛ الخصم اليدوي المجمع يظهر في الملخص وتفاصيل الرصيد ولا نوزعه على أيام قديمة بدون دليل.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DAY_FILTERS.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setDayFilter(item.value)}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              dayFilter === item.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "bg-background hover:bg-muted"
                            }`}
                          >
                            {item.label} ({dayCounts[item.value]})
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>

                  {trackingQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-28 rounded-xl" />
                      ))}
                    </div>
                  ) : visibleDays.length ? (
                    <div className="space-y-3">
                      {visibleDays.map((day) => <DayCard key={day.date} day={day} />)}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                      لا توجد أيام مطابقة للفلتر.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <section className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 className="text-lg font-black">تفاصيل حركة الرصيد</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      الخصم اليدوي محسوب ضمن المستلم، لكنه يظل ظاهرًا منفصلًا هنا لمعرفة طريقة تسجيل الاستلام ومن نفّذ العملية.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <SmallMetric label="المستلم الإجمالي" value={received} icon={<CheckCircle2 className="h-4 w-4" />} />
                      <SmallMetric label="استلام مثبت" value={systemReceived} icon={<Truck className="h-4 w-4" />} />
                      <SmallMetric label="خصم يدوي ضمن المستلم" value={manualDeducted} icon={<LayoutDashboard className="h-4 w-4" />} tone={manualDeducted ? "manual" : "default"} />
                      <SmallMetric label="حسم تشغيلي" value={operationalDeducted} icon={<AlertTriangle className="h-4 w-4" />} tone={operationalDeducted ? "danger" : "default"} />
                      <SmallMetric label="مصادَر" value={forfeited} icon={<Store className="h-4 w-4" />} tone={forfeited ? "danger" : "default"} />
                    </div>
                  </section>

                  {trackingQuery.isError ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/[0.05] p-8 text-center text-sm">
                      تعذر تحميل سجل حركة الرصيد.
                    </div>
                  ) : trackingQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-44 rounded-xl" />
                      ))}
                    </div>
                  ) : movements.length ? (
                    <div className="space-y-3">
                      {movements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                      لا توجد حركات رصيد مسجلة.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
