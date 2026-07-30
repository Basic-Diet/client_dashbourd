import { useMemo, useState, type ReactNode } from "react";
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
  SubscriptionTrackingMealItem,
} from "@/types/subscriptionTrackingTypes";
import {
  Activity,
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

interface SubscriptionQuickViewDialogProps {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TimelineFilter =
  | "all"
  | "received"
  | "in_progress"
  | "upcoming"
  | "exceptions";

const TIMELINE_FILTERS: Array<{ value: TimelineFilter; label: string }> = [
  { value: "all", label: "الكل" },
  { value: "received", label: "تم الاستلام" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "upcoming", label: "القادم" },
  { value: "exceptions", label: "استثناءات" },
];

const IN_PROGRESS_STATUSES = new Set([
  "locked",
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
  "consumed_without_preparation",
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

function dayStatusClass(day: SubscriptionTrackingDay) {
  if (day.receivedMeals > 0 || ["delivered", "fulfilled"].includes(day.dayStatus)) {
    return "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300";
  }
  if (EXCEPTION_STATUSES.has(day.dayStatus) || EXCEPTION_STATUSES.has(day.status)) {
    return "border-amber-500/25 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300";
  }
  if (IN_PROGRESS_STATUSES.has(day.dayStatus) || IN_PROGRESS_STATUSES.has(day.status)) {
    return "border-blue-500/25 bg-blue-500/[0.06] text-blue-700 dark:text-blue-300";
  }
  if (day.isToday) {
    return "border-primary/30 bg-primary/[0.07] text-primary";
  }
  return "border-border bg-card text-foreground";
}

function deliveryModeLabel(mode?: string) {
  if (mode === "delivery") return "توصيل";
  if (mode === "pickup") return "استلام من الفرع";
  return mode || "غير محدد";
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
  if (filter === "in_progress") {
    return IN_PROGRESS_STATUSES.has(day.dayStatus) || IN_PROGRESS_STATUSES.has(day.status);
  }
  if (filter === "upcoming") {
    return !day.isPast && day.receivedMeals === 0 && !EXCEPTION_STATUSES.has(day.dayStatus);
  }
  return (
    EXCEPTION_STATUSES.has(day.dayStatus) ||
    EXCEPTION_STATUSES.has(day.status) ||
    day.forfeitedMeals > 0
  );
}

function TimelineDayCard({ day }: { day: SubscriptionTrackingDay }) {
  const title =
    day.calendar?.fullDateLabels?.ar ||
    day.calendar?.weekday?.labels?.ar ||
    formatLongDate(day.date);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${dayStatusClass(day)} ${
        day.isToday ? "ring-1 ring-primary/30" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{title}</p>
            {day.isToday ? <Badge>اليوم</Badge> : null}
            <Badge variant="outline" className="bg-background/60">
              {day.statusLabel}
            </Badge>
            <Badge variant="secondary">{day.sourceLabel}</Badge>
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
            {day.date}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[18rem]">
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">مختار</p>
            <p className="font-black tabular-nums">
              {day.selectedMeals}/{day.requiredMeals}
            </p>
          </div>
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">تم استلامه</p>
            <p className="font-black tabular-nums">{day.receivedMeals}</p>
          </div>
          <div className="rounded-lg border bg-background/60 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">الطريقة</p>
            <p className="text-xs font-bold">{deliveryModeLabel(day.fulfillmentMode)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
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
            <div className="rounded-lg border border-dashed bg-background/40 px-3 py-3 text-sm text-muted-foreground">
              لم تُسجل أسماء وجبات لهذا اليوم.
            </div>
          )}
        </div>

        <div className="space-y-2 lg:w-52">
          {day.reservedMeals > 0 ? (
            <Badge variant="outline" className="w-full justify-center py-2">
              محجوز: {day.reservedMeals}
            </Badge>
          ) : null}
          {day.forfeitedMeals > 0 ? (
            <Badge variant="destructive" className="w-full justify-center py-2">
              وجبات مصادَرة: {day.forfeitedMeals}
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
      </div>

      {day.notes ? (
        <p className="mt-3 rounded-lg border bg-background/60 px-3 py-2 text-xs">
          {day.notes}
        </p>
      ) : null}
    </div>
  );
}

export function SubscriptionQuickViewDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionQuickViewDialogProps) {
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const subscriptionId = subscription?._id ?? "";
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

  const totalMeals = summary?.totalMeals ?? details?.totalMeals ?? 0;
  const remainingMeals = summary?.remainingMeals ?? details?.remainingMeals ?? 0;
  const receivedMeals =
    summary?.receivedMeals ?? Math.max(0, totalMeals - remainingMeals);
  const reservedMeals = summary?.reservedMeals ?? 0;
  const progressPercent =
    summary?.progressPercent ??
    (totalMeals > 0 ? Math.min(100, Math.round((receivedMeals / totalMeals) * 100)) : 0);

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
        className="max-h-[96vh] w-[96vw] max-w-[96vw] gap-0 overflow-hidden p-0 sm:max-w-7xl"
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
                  شاشة قراءة فقط لمتابعة الرصيد، الوجبات المستلمة، والخط الزمني يومًا بيوم.
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
              <div className="grid gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="إجمالي وجبات الاشتراك"
                  value={totalMeals}
                  description="الرصيد المتعاقد عليه عند تفعيل الاشتراك"
                  icon={<Package className="h-5 w-5" />}
                />
                <MetricCard
                  label="تم استلامها"
                  value={receivedMeals}
                  description="وجبات مستهلكة فعليًا من مصدر الرصيد الرسمي"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                />
                <MetricCard
                  label="المتبقي المتاح"
                  value={remainingMeals}
                  description="وجبات ما زالت متاحة للاستخدام"
                  icon={<Utensils className="h-5 w-5" />}
                />
                <MetricCard
                  label="محجوز ولم يُستهلك"
                  value={reservedMeals}
                  description="وجبات مرتبطة بأيام مؤكدة ولم تُسلّم بعد"
                  icon={<Clock3 className="h-5 w-5" />}
                />
              </div>

              <div className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">تقدم استهلاك الاشتراك</p>
                    <p className="text-xs text-muted-foreground">
                      {receivedMeals} من {totalMeals} وجبة — {progressPercent}%
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      أيام استلام: {summary?.deliveredDays ?? 0}
                    </Badge>
                    <Badge variant="secondary">
                      أيام الخط الزمني: {summary?.timelineDays ?? tracking?.days.length ?? 0}
                    </Badge>
                    <Badge variant="secondary">
                      وجبات مختارة: {summary?.plannedMeals ?? 0}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {summary?.reconciliation.status === "difference" ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-bold">ملاحظة محاسبية على توزيع الوجبات</p>
                  <p className="mt-1 leading-6">
                    الرصيد الرسمي يسجل {summary.consumedMeals} وجبة مستهلكة، بينما الأيام
                    تربط {summary.timelineReceivedMeals} وجبة فقط. الفرق ({Math.abs(summary.reconciliation.difference)})
                    قد يكون خصمًا يدويًا أو بيانات تاريخية غير مرتبطة بيوم محدد. الرصيد الرسمي
                    يظل هو مصدر الحقيقة.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
                <aside className="space-y-4">
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
                    <DetailRow
                      label="نهاية الصلاحية"
                      value={formatDate(details.validityEndDate)}
                    />
                    <DetailRow
                      label="أيام المرونة"
                      value={tracking?.validity?.timelineExtraDays}
                    />
                    <DetailRow
                      label="أيام التعويض"
                      value={tracking?.validity?.compensationDays}
                    />
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
                    <DetailRow
                      label="ملاحظات العنوان"
                      value={details.deliveryAddress?.notes}
                    />
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
                          <p className="text-sm text-muted-foreground">
                            لا توجد وجبات مميزة.
                          </p>
                        )}
                      </div>
                    </div>
                  </Section>
                </aside>

                <main className="min-w-0 space-y-4">
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-black">الخط الزمني للوجبات</h2>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          كل يوم يوضح ما تم اختياره، ما تم استلامه، وطريقة التنفيذ.
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
                        <Skeleton key={index} className="h-44 rounded-xl" />
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
