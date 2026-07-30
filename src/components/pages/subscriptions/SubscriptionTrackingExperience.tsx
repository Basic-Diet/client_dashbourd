import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  SubscriptionTrackingManualDeduction,
  SubscriptionTrackingMealItem,
} from "@/types/subscriptionTrackingTypes";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  User,
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

const TIMELINE_FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "received", label: "تم الاستلام" },
  { value: "planned", label: "تم الاختيار" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "upcoming", label: "القادم" },
  { value: "exceptions", label: "استثناءات" },
];

const OPERATIONAL_STATUSES = new Set([
  "in_preparation",
  "preparing",
  "ready_for_delivery",
  "ready_for_pickup",
  "out_for_delivery",
]);

const EXCEPTION_STATUSES = new Set([
  "frozen",
  "skipped",
  "delivery_canceled",
  "canceled_at_branch",
  "no_show",
]);

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function statusLabel(status?: string) {
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
    case "expired":
    case "ended":
    case "completed":
      return "border-muted-foreground/20 bg-muted text-muted-foreground";
    default:
      return "border-primary/20 bg-primary/10 text-primary";
  }
}

function isMissedLockedDay(day: SubscriptionTrackingDay) {
  const locked = day.dayStatus === "locked" || day.status === "locked";
  return day.isPast && locked && day.selectedMeals === 0 && day.receivedMeals === 0;
}

function isExceptionDay(day: SubscriptionTrackingDay) {
  return (
    EXCEPTION_STATUSES.has(day.dayStatus) ||
    EXCEPTION_STATUSES.has(day.status) ||
    day.forfeitedMeals > 0 ||
    isMissedLockedDay(day)
  );
}

function isOperationalDay(day: SubscriptionTrackingDay) {
  return (
    OPERATIONAL_STATUSES.has(day.dayStatus) ||
    OPERATIONAL_STATUSES.has(day.status) ||
    ((day.dayStatus === "locked" || day.status === "locked") && day.selectedMeals > 0)
  );
}

function isPlannedDay(day: SubscriptionTrackingDay) {
  return (
    day.selectedMeals > 0 &&
    day.receivedMeals === 0 &&
    !isOperationalDay(day) &&
    !isExceptionDay(day)
  );
}

function dayDisplayStatus(day: SubscriptionTrackingDay) {
  if (day.receivedMeals > 0) return "تم الاستلام";
  if (isMissedLockedDay(day)) return "انتهى بدون اختيار";
  if (day.isToday && day.status === "open") return "متاح اليوم";
  return day.statusLabel;
}

function dayStatusClass(day: SubscriptionTrackingDay) {
  if (day.receivedMeals > 0 || ["delivered", "fulfilled"].includes(day.dayStatus)) {
    return "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300";
  }
  if (isExceptionDay(day)) {
    return "border-amber-500/25 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300";
  }
  if (isOperationalDay(day)) {
    return "border-blue-500/25 bg-blue-500/[0.06] text-blue-700 dark:text-blue-300";
  }
  if (isPlannedDay(day)) {
    return "border-violet-500/25 bg-violet-500/[0.06] text-violet-700 dark:text-violet-300";
  }
  if (day.isToday) {
    return "border-primary/30 bg-primary/[0.07] text-primary";
  }
  return "border-border bg-card text-foreground";
}

function deliveryModeLabel(mode?: string | null) {
  if (mode === "delivery") return "توصيل";
  if (mode === "pickup") return "استلام من الفرع";
  return mode || "غير محدد";
}

function actorRoleLabel(role?: string | null) {
  if (role === "admin" || role === "superadmin") return "الإدارة";
  if (role === "cashier") return "الكاشير";
  if (role === "restaurant") return "المطعم";
  if (role === "kitchen") return "المطبخ";
  return role || "موظف";
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

function Section({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`rounded-xl shadow-none ${className}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          {icon}
          {title}
        </div>
        <Separator />
        {children}
      </CardContent>
    </Card>
  );
}

function MetricCard({
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
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      </div>
    </div>
  );
}

function ProgressRow({
  title,
  value,
  total,
  percent,
  description,
}: {
  title: string;
  value: number;
  total: number;
  percent: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{title}</p>
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
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function mealComponents(item: SubscriptionTrackingMealItem) {
  const parts: string[] = [];
  if (item.protein?.name && item.protein.name !== item.name) {
    parts.push(item.protein.name);
  }
  item.carbs.forEach((carb) => {
    parts.push(carb.grams ? `${carb.name} ${carb.grams}g` : carb.name);
  });
  return parts.join(" + ");
}

function matchesTimelineFilter(day: SubscriptionTrackingDay, filter: TimelineFilter) {
  if (filter === "all") return true;
  if (filter === "received") return day.receivedMeals > 0;
  if (filter === "planned") return isPlannedDay(day);
  if (filter === "in_progress") return isOperationalDay(day);
  if (filter === "upcoming") {
    return (
      !day.isPast &&
      day.receivedMeals === 0 &&
      !isPlannedDay(day) &&
      !isOperationalDay(day) &&
      !isExceptionDay(day)
    );
  }
  return isExceptionDay(day);
}

function emptyDayMessage(day: SubscriptionTrackingDay) {
  if (day.receivedMeals > 0) {
    return "تم تسجيل الاستلام، لكن أسماء الوجبات غير متاحة في السجل التاريخي.";
  }
  if (isMissedLockedDay(day)) {
    return "انتهى هذا اليوم دون اختيار وجبات أو تسجيل استلام.";
  }
  if (day.isToday) {
    return "لم يحدد العميل وجبات اليوم بعد.";
  }
  if (!day.isPast) {
    return "لم يتم اختيار وجبات هذا اليوم بعد.";
  }
  return "لا توجد وجبات أو عملية استلام مسجلة لهذا اليوم.";
}

function TimelineDayCard({ day }: { day: SubscriptionTrackingDay }) {
  const title =
    day.calendar?.fullDateLabels?.ar ||
    day.calendar?.weekday?.labels?.ar ||
    formatLongDate(day.date);
  const hasSideDetails =
    day.reservedMeals > 0 ||
    day.forfeitedMeals > 0 ||
    day.releasedMeals > 0 ||
    day.addonItems.length > 0;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${dayStatusClass(day)} ${
        day.isToday ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{title}</p>
            {day.isToday ? <Badge>اليوم</Badge> : null}
            <Badge variant="outline" className="bg-background/60">
              {dayDisplayStatus(day)}
            </Badge>
            <Badge variant="secondary">{day.sourceLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
            {day.date}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[19rem]">
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">الاختيار</p>
            <p className="font-black tabular-nums">
              {day.selectedMeals}/{day.requiredMeals}
            </p>
          </div>
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">استلام فعلي</p>
            <p className="font-black tabular-nums">{day.receivedMeals}</p>
          </div>
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">الطريقة</p>
            <p className="text-xs font-bold">{deliveryModeLabel(day.fulfillmentMode)}</p>
          </div>
        </div>
      </div>

      <div className={`mt-4 grid gap-3 ${hasSideDetails ? "lg:grid-cols-[minmax(0,1fr)_13rem]" : ""}`}>
        <div className="space-y-2">
          {day.mealItems.length ? (
            day.mealItems.map((item) => {
              const components = mealComponents(item);
              return (
                <div
                  key={`${day.date}-${item.id}`}
                  className="rounded-lg border bg-background/70 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{item.name}</span>
                    <Badge variant={item.isPremium ? "default" : "outline"}>
                      {item.typeLabel}
                    </Badge>
                  </div>
                  {components ? (
                    <p className="mt-1 text-xs text-muted-foreground">{components}</p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed bg-background/40 px-3 py-2.5 text-sm text-muted-foreground">
              {emptyDayMessage(day)}
            </div>
          )}
        </div>

        {hasSideDetails ? (
          <div className="space-y-2">
            {day.reservedMeals > 0 ? (
              <Badge variant="outline" className="w-full justify-center py-2">
                محجوز: {day.reservedMeals}
              </Badge>
            ) : null}
            {day.forfeitedMeals > 0 ? (
              <Badge variant="destructive" className="w-full justify-center py-2">
                مصادَر: {day.forfeitedMeals}
              </Badge>
            ) : null}
            {day.releasedMeals > 0 ? (
              <Badge variant="secondary" className="w-full justify-center py-2">
                تم تحريره: {day.releasedMeals}
              </Badge>
            ) : null}
            {day.addonItems.length ? (
              <div className="rounded-lg border bg-background/70 p-2">
                <p className="mb-2 text-[11px] font-bold text-muted-foreground">الإضافات</p>
                <div className="flex flex-wrap gap-1.5">
                  {day.addonItems.map((addon) => (
                    <Badge key={`${day.date}-${addon.id}`} variant="secondary">
                      {addon.name} × {addon.quantity}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {day.notes ? (
        <p className="mt-3 rounded-lg border bg-background/60 px-3 py-2 text-xs">
          {day.notes}
        </p>
      ) : null}
    </div>
  );
}

function ManualDeductionsPanel({
  rows,
}: {
  rows: SubscriptionTrackingManualDeduction[];
}) {
  if (!rows.length) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h2 className="font-black">حركات الخصم اليدوي</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            هذه الحركات تخص الرصيد، ولا تعني أن العميل استلم وجبة في يوم محدد.
          </p>
        </div>
        <Badge variant="secondary">{rows.length} حركة</Badge>
      </div>

      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div
            key={row.id || `${row.businessDate}-${row.createdAt}`}
            className="rounded-lg border bg-muted/20 px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold">خصم {row.deducted.totalMeals} وجبة</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.businessDate ? formatLongDate(row.businessDate) : formatDateTime(row.createdAt)}
                  {row.actor.role ? ` · بواسطة ${actorRoleLabel(row.actor.role)}` : ""}
                  {row.fulfillmentMethod ? ` · ${deliveryModeLabel(row.fulfillmentMethod)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {row.deducted.regularMeals > 0 ? (
                  <Badge variant="outline">عادية: {row.deducted.regularMeals}</Badge>
                ) : null}
                {row.deducted.premiumMeals > 0 ? (
                  <Badge>مميزة: {row.deducted.premiumMeals}</Badge>
                ) : null}
              </div>
            </div>
            {row.reason || row.notes ? (
              <p className="mt-2 text-xs leading-5">
                {[row.reason, row.notes].filter(Boolean).join(" — ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubscriptionTrackingExperience({
  subscription,
  open,
  onOpenChange,
}: SubscriptionTrackingExperienceProps) {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const subscriptionId = subscription?._id ?? "";

  useEffect(() => {
    setTimelineFilter("all");
  }, [subscriptionId, open]);

  const {
    data: detailResponse,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
  } = useSubscriptionDetailsQuery(subscriptionId);
  const {
    data: trackingResponse,
    isLoading: isTrackingLoading,
    isError: isTrackingError,
  } = useSubscriptionTrackingQuery(subscriptionId);

  const details = detailResponse?.data ?? subscription;
  const tracking = trackingResponse?.data;
  const summary = tracking?.summary;
  const manualDeductions = tracking?.adjustments?.manualDeductions ?? [];

  const totalMeals = summary?.totalMeals ?? details?.totalMeals ?? 0;
  const remainingMeals = summary?.remainingMeals ?? details?.remainingMeals ?? 0;
  const receivedMeals = summary?.receivedMeals ?? 0;
  const reservedMeals = summary?.reservedMeals ?? 0;
  const manualDeductedMeals =
    summary?.manualDeductedMeals ?? tracking?.adjustments?.totals.manualDeductedMeals ?? 0;
  const otherConsumedMeals =
    summary?.otherConsumedMeals ?? summary?.unattributedConsumedMeals ?? 0;
  const forfeitedMeals = summary?.forfeitedMeals ?? 0;
  const balanceConsumedMeals = summary?.balanceConsumedMeals ?? summary?.consumedMeals ?? 0;
  const receiptProgressPercent = summary?.progressPercent ?? 0;
  const balanceUsagePercent = summary?.balanceUsagePercent ?? receiptProgressPercent;

  const filterCounts = useMemo(() => {
    const days = tracking?.days ?? [];
    return Object.fromEntries(
      TIMELINE_FILTERS.map((filter) => [
        filter.value,
        days.filter((day) => matchesTimelineFilter(day, filter.value)).length,
      ])
    ) as Record<TimelineFilter, number>;
  }, [tracking?.days]);

  const groupedTimeline = useMemo(() => {
    const days = (tracking?.days ?? []).filter((day) =>
      matchesTimelineFilter(day, timelineFilter)
    );
    const groups = new Map<string, SubscriptionTrackingDay[]>();
    days.forEach((day) => {
      const month = day.calendar?.monthYearLabels?.ar || formatMonth(day.date);
      const current = groups.get(month) ?? [];
      current.push(day);
      groups.set(month, current);
    });
    return Array.from(groups.entries());
  }, [timelineFilter, tracking?.days]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[96vh] w-[98vw] max-w-[98vw] gap-0 overflow-hidden p-0 sm:max-w-[1500px]"
        dir="rtl"
      >
        <div className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <DialogHeader className="gap-2 text-right">
            <div className="flex w-[95%] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <DialogTitle className="flex items-center gap-2 text-xl font-black">
                  <ReceiptText className="h-5 w-5 text-primary" />
                  متابعة الاشتراك بالكامل
                </DialogTitle>
                <DialogDescription>
                  قراءة دقيقة للرصيد، الاستلام الفعلي، الخصومات، والخط الزمني يومًا بيوم.
                </DialogDescription>
              </div>
              {details ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={subscriptionStatusClass(details.status)}>
                    {statusLabel(details.status)}
                  </Badge>
                  <Badge variant="secondary">
                    {details.displayId || details.id || details._id}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    قراءة فقط
                  </Badge>
                </div>
              ) : null}
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[calc(96vh-105px)] overflow-y-auto px-4 py-5 sm:px-6">
          {isDetailsLoading && !details ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-[34rem] rounded-xl" />
            </div>
          ) : isDetailsError || !details ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <ReceiptText className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">تعذر تحميل تفاصيل الاشتراك</p>
              <p className="mt-1 text-sm text-muted-foreground">
                أغلق النافذة وحاول فتح التفاصيل مرة أخرى.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <MetricCard
                  label="إجمالي وجبات الاشتراك"
                  value={totalMeals}
                  description="الرصيد المتعاقد عليه عند تفعيل الاشتراك"
                  icon={<Package className="h-5 w-5" />}
                />
                <MetricCard
                  label="استلمها فعليًا"
                  value={receivedMeals}
                  description="مرتبطة بأيام تم تنفيذها أو استلامها فعليًا"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <MetricCard
                  label="المتبقي المتاح"
                  value={remainingMeals}
                  description="وجبات متاحة للاختيار والاستخدام"
                  icon={<Utensils className="h-5 w-5" />}
                />
                <MetricCard
                  label="محجوز ولم يُستهلك"
                  value={reservedMeals}
                  description="محجوز لأيام مؤكدة ولم يُسلّم بعد"
                  icon={<Clock3 className="h-5 w-5" />}
                />
                <MetricCard
                  label="خصم يدوي"
                  value={manualDeductedMeals}
                  description="حركات رصيد لا تُحسب كاستلام فعلي"
                  icon={<ReceiptText className="h-5 w-5" />}
                />
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-black">ملخص حركة الاشتراك</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      يوم التشغيل: {tracking?.businessDate ? formatLongDate(tracking.businessDate) : "—"}
                      {tracking?.generatedAt ? ` · آخر قراءة ${formatDateTime(tracking.generatedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">أيام استلام: {summary?.deliveredDays ?? 0}</Badge>
                    <Badge variant="secondary">أيام الخط الزمني: {summary?.timelineDays ?? tracking?.days.length ?? 0}</Badge>
                    <Badge variant="secondary">اختيارات مسجلة: {summary?.plannedMeals ?? 0}</Badge>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <ProgressRow
                    title="تقدم الاستلام الفعلي"
                    value={receivedMeals}
                    total={totalMeals}
                    percent={receiptProgressPercent}
                    description="يعتمد فقط على الأيام التي ثبت تنفيذها، وليس كل خصم من الرصيد."
                  />
                  <ProgressRow
                    title="استخدام الرصيد محاسبيًا"
                    value={balanceConsumedMeals + forfeitedMeals}
                    total={totalMeals}
                    percent={balanceUsagePercent}
                    description="يشمل الاستلام والخصومات اليدوية والمصادرات المسجلة."
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">استلام فعلي: {receivedMeals}</Badge>
                  <Badge variant="outline">خصم يدوي: {manualDeductedMeals}</Badge>
                  <Badge variant="outline">مصادَر: {forfeitedMeals}</Badge>
                  <Badge variant={otherConsumedMeals > 0 ? "destructive" : "outline"}>
                    غير منسوب: {otherConsumedMeals}
                  </Badge>
                  <Badge variant="outline">محجوز: {reservedMeals}</Badge>
                </div>
              </div>

              {summary?.balanceIntegrity?.status === "difference" ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/[0.07] p-4 text-sm text-red-800 dark:text-red-200">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-5 w-5" />
                    معادلة الرصيد تحتاج مراجعة
                  </div>
                  <p className="mt-2 leading-6">
                    إجمالي الاشتراك {summary.balanceIntegrity.totalMeals}، بينما مجموع المتبقي والمحجوز
                    والمستهلك والمصادَر يساوي {summary.balanceIntegrity.accountedMeals}. الفرق
                    {` ${Math.abs(summary.balanceIntegrity.difference)} `}وجبة.
                  </p>
                </div>
              ) : null}

              {summary?.reconciliation.status === "difference" ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-black">
                    <AlertTriangle className="h-5 w-5" />
                    يوجد استهلاك غير منسوب بالكامل
                  </div>
                  <p className="mt-2 leading-6">
                    الرصيد الرسمي يسجل {balanceConsumedMeals} وجبة مستهلكة: منها {receivedMeals}
                    استلام فعلي و{manualDeductedMeals} خصم يدوي معروف. المتبقي غير المنسوب
                    {` ${otherConsumedMeals} `}وجبة، ويحتاج مراجعة سجل تاريخي أو عملية قديمة.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <aside className="space-y-4 xl:sticky xl:top-0 xl:self-start">
                  <Section title="المشترك" icon={<User className="h-4 w-4 text-primary" />}>
                    <DetailRow
                      label="الاسم"
                      value={details.user?.fullName || details.userName}
                    />
                    <DetailRow label="الهاتف" value={details.user?.phone} dir="ltr" />
                    <DetailRow label="البريد" value={details.user?.email} dir="ltr" />
                    <DetailRow
                      label="حالة العميل"
                      value={details.user?.isActive === false ? "غير نشط" : "نشط"}
                    />
                  </Section>

                  <Section title="الخطة والصلاحية" icon={<CalendarDays className="h-4 w-4 text-primary" />}>
                    <DetailRow label="الباقة" value={details.planName || details.plan?.name} />
                    <DetailRow
                      label="الجرامات"
                      value={details.selectedGrams ? `${details.selectedGrams}g` : ""}
                    />
                    <DetailRow label="وجبات في اليوم" value={details.selectedMealsPerDay} />
                    <DetailRow label="بداية الاشتراك" value={formatDate(details.startDate)} />
                    <DetailRow label="نهاية أيام الباقة" value={formatDate(details.endDate)} />
                    <DetailRow label="نهاية الصلاحية" value={formatDate(details.validityEndDate)} />
                    <DetailRow label="أيام المرونة" value={tracking?.validity?.timelineExtraDays} />
                    <DetailRow label="أيام التعويض" value={tracking?.validity?.compensationDays} />
                  </Section>

                  <Section title="التوصيل أو الاستلام" icon={<MapPin className="h-4 w-4 text-primary" />}>
                    <DetailRow
                      label="الطريقة"
                      value={deliveryModeLabel(details.deliveryMode || details.fulfillmentMethod)}
                    />
                    <DetailRow
                      label="المنطقة"
                      value={details.deliveryZoneName || details.deliveryAddress?.district}
                    />
                    <DetailRow
                      label="الوقت"
                      value={details.deliverySlot?.window || details.deliveryWindow}
                    />
                    <DetailRow label="العنوان" value={addressSummary(details)} />
                    <DetailRow label="ملاحظات العنوان" value={details.deliveryAddress?.notes} />
                  </Section>

                  <Section title="الإضافات والوجبات المميزة" icon={<Sparkles className="h-4 w-4 text-primary" />}>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-2 text-xs font-bold text-muted-foreground">الإضافات</p>
                        {details.addonsSummary?.length ? (
                          <div className="space-y-2">
                            {details.addonsSummary.map((addon: AddonSummaryItem) => (
                              <div
                                key={addon.addonId}
                                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                              >
                                <span className="font-medium">{addon.name}</span>
                                <span className="text-muted-foreground">
                                  متبقي {addon.remainingQtyTotal} من {addon.purchasedQtyTotal}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">لا توجد إضافات.</p>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <p className="mb-2 text-xs font-bold text-muted-foreground">المميزة</p>
                        {details.premiumSummary?.length ? (
                          <div className="space-y-2">
                            {details.premiumSummary.map(
                              (premium: PremiumSummaryItem, index: number) => (
                                <div
                                  key={`${premium.premiumMealId ?? "premium"}-${index}`}
                                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                                >
                                  <span className="font-medium">{premium.name}</span>
                                  <span className="text-muted-foreground">
                                    متبقي {premium.remainingQtyTotal} من {premium.purchasedQtyTotal}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">لا توجد وجبات مميزة.</p>
                        )}
                      </div>
                    </div>
                  </Section>
                </aside>

                <main className="min-w-0 space-y-4">
                  <ManualDeductionsPanel rows={manualDeductions} />

                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-black">الخط الزمني للوجبات</h2>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          الاستلام الفعلي منفصل عن الخصم اليدوي، وكل يوم يوضح الاختيار والتنفيذ.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {TIMELINE_FILTERS.map((filter) => (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => setTimelineFilter(filter.value)}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                              timelineFilter === filter.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "bg-background hover:bg-muted"
                            }`}
                          >
                            {filter.label} ({filterCounts[filter.value] ?? 0})
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isTrackingLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Skeleton key={index} className="h-36 rounded-xl" />
                      ))}
                    </div>
                  ) : isTrackingError || !tracking ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed text-center">
                      <Activity className="mb-3 h-8 w-8 text-muted-foreground" />
                      <p className="font-semibold">تعذر تحميل الخط الزمني</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        بيانات الاشتراك الأساسية ظاهرة، لكن تفاصيل الأيام لم تُحمّل.
                      </p>
                    </div>
                  ) : groupedTimeline.length ? (
                    <div className="space-y-5">
                      {groupedTimeline.map(([month, days]) => (
                        <section key={month} className="space-y-3">
                          <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 backdrop-blur">
                            <CircleDot className="h-4 w-4 text-primary" />
                            <h3 className="font-black">{month}</h3>
                            <Badge variant="secondary">{days.length} يوم</Badge>
                          </div>
                          <div className="space-y-3">
                            {days.map((day) => (
                              <TimelineDayCard key={day.date} day={day} />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                      لا توجد أيام مطابقة للفلتر الحالي.
                    </div>
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
