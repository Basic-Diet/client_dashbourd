import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CalendarRangeIcon,
  DownloadIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAccountingDays } from "@/features/accounting/accountingRange";
import api from "@/lib/apis";
import { getTodayKSADate } from "@/utils/ksaDate";

export const Route = createFileRoute("/_protected/subscription-audit/")({
  component: SubscriptionAuditPage,
});

type Risk = "critical" | "high" | "medium" | "low" | "ok";
type FulfillmentFilter = "all" | "delivery" | "pickup";
type RiskFilter = "all" | Risk;
type DeliveryRowFilter = "all" | "problems" | "delivered" | "not_delivered" | "excluded";

type AuditIssue = {
  code: string;
  severity: Risk;
  message: string;
};

type DayAudit = {
  date: string;
  expectedMeals: number;
  selectedMeals: number;
  fulfilled: boolean;
  nonConsuming?: boolean;
  risk: Risk;
  day?: { id?: string | null; status?: string | null } | null;
  delivery?: {
    status?: string | null;
    deliveredAt?: string | null;
    canceledAt?: string | null;
  } | null;
  pickupRequests: Array<{ status?: string | null }>;
  allocation: {
    reserved: number;
    consumed: number;
    released: number;
    forfeited: number;
  };
  manualDeduction: {
    count: number;
    totalMeals: number;
  };
  issues: AuditIssue[];
};

type SubscriptionAudit = {
  subscriptionId: string;
  customer: { name: string; phone: string };
  plan: { name: string };
  source: { labelAr: string };
  fulfillmentMethod: string;
  fulfillmentLabelAr: string;
  risk: Risk;
  balance: {
    totalMeals: number;
    availableMeals: number;
    displayedUnconsumedMeals: number;
    reservedMeals: number;
    consumedMeals: number;
    equationDifference: number;
    balanced: boolean;
  };
  periodSummary: {
    automaticConsumedMeals: number;
    manualDeductedMeals: number;
    criticalDays: number;
  };
  issues: AuditIssue[];
  days: DayAudit[];
};

type NewSubscription = {
  subscriptionId: string;
  customer: { name: string; phone: string };
  plan: { name: string };
  source: {
    labelAr: string;
    payment?: { provider?: string | null } | null;
  };
  fulfillmentMethod: string;
  fulfillmentLabelAr: string;
  status?: string | null;
  createdAt?: string | null;
  totalMeals: number;
  totalPriceHalala: number;
  auditRisk: Risk;
};

type DeliveryActor = {
  role?: string | null;
  id?: string | null;
  email?: string | null;
  action?: string | null;
  at?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
};

type DailyDeliveryCustomer = {
  date: string;
  subscriptionId: string;
  customer: { name: string; phone: string };
  plan: { name: string };
  source: { labelAr: string };
  subscriptionStatus?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  rootFulfillmentMethod: string;
  effectiveFulfillmentMethod: string;
  fulfillmentModeOverride?: string | null;
  firstDayPickupOverride: boolean;
  deliveryExpected: boolean;
  dayId?: string | null;
  dayStatus?: string | null;
  selectedMeals: number;
  expectedMeals: number;
  deliveryStatus: string;
  dashboardDelivered: boolean;
  deliveredAt?: string | null;
  canceledAt?: string | null;
  reservedMeals: number;
  automaticConsumedMeals: number;
  releasedMeals: number;
  forfeitedMeals: number;
  manualDeductedMeals: number;
  observedConsumedMeals: number;
  expectedConsumedMeals: number;
  consumptionDifference: number;
  entitlementImpactObserved: number;
  dashboardFulfillActor?: DeliveryActor | null;
  lastDashboardOperation?: DeliveryActor | null;
  sourceIssues: AuditIssue[];
  result: {
    code: string;
    labelAr: string;
    severity: Risk;
    messageAr: string;
  };
  risk: Risk;
};

type DailyDeliveryOperation = {
  date: string;
  expectedCustomers: number;
  deliveredCustomers: number;
  notDeliveredCustomers: number;
  deliveryRate: number;
  excludedFirstDayPickupCustomers: number;
  deliveryStatusCounts: Record<string, number>;
  resultCounts: Record<string, number>;
  riskCounts: Record<Risk, number>;
  meals: {
    plannedForExpectedCustomers: number;
    expectedConsumedAfterDelivered: number;
    reserved: number;
    automaticConsumed: number;
    manuallyDeducted: number;
    forfeited: number;
    observedConsumed: number;
    consumptionDifference: number;
    entitlementImpactObserved: number;
  };
  customers: DailyDeliveryCustomer[];
};

type AuditReport = {
  range: { from: string; to: string; days: number };
  summary: {
    newSubscriptions: {
      total: number;
      pickup: number;
      delivery: number;
      matrix: Record<string, number>;
    };
    operations: {
      automaticConsumedMeals: number;
      manuallyDeductedMeals: number;
      reviewedSubscriptions: number;
    };
    deliveryOperations?: {
      expectedCustomerDays: number;
      deliveredCustomerDays: number;
      notDeliveredCustomerDays: number;
      deliveryRate: number;
      excludedFirstDayPickupCustomerDays: number;
      plannedMeals: number;
      expectedConsumedAfterDelivered: number;
      automaticConsumedMeals: number;
      manuallyDeductedMeals: number;
      consumptionDifference: number;
      doubleDeductionSuspicions: number;
      deliveredWithoutDeduction: number;
      deductedWithoutDelivery: number;
    };
    issues: {
      counts: {
        total: number;
        critical: number;
        high: number;
        medium: number;
      };
    };
  };
  dailyDeliveryOperations?: DailyDeliveryOperation[];
  newSubscriptions: NewSubscription[];
  subscriptionAudits: SubscriptionAudit[];
};

const RISK_ORDER: Record<Risk, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  ok: 0,
};

const RISK_LABELS: Record<Risk, string> = {
  critical: "حرج",
  high: "مرتفع",
  medium: "متوسط",
  low: "منخفض",
  ok: "سليم",
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  missing: "لا يوجد سجل توصيل",
  scheduled: "مجدول",
  ready_for_delivery: "جاهز للتوصيل",
  out_for_delivery: "خرج للتوصيل",
  delivered: "تم التوصيل",
  canceled: "ملغي",
};

function riskClasses(risk: Risk) {
  if (risk === "critical") return "border-red-300 bg-red-50 text-red-800";
  if (risk === "high") return "border-orange-300 bg-orange-50 text-orange-800";
  if (risk === "medium") return "border-amber-300 bg-amber-50 text-amber-800";
  if (risk === "low") return "border-blue-300 bg-blue-50 text-blue-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

function resultClasses(row: DailyDeliveryCustomer) {
  if (row.result.severity === "critical") return "border-red-300 bg-red-50 text-red-900";
  if (row.result.severity === "high") return "border-orange-300 bg-orange-50 text-orange-900";
  if (row.result.severity === "medium") return "border-amber-300 bg-amber-50 text-amber-900";
  if (!row.deliveryExpected) return "border-slate-300 bg-slate-50 text-slate-700";
  return "border-emerald-300 bg-emerald-50 text-emerald-900";
}

function formatInteger(value: number | undefined | null) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
}

function formatPercent(value: number | undefined | null) {
  return new Intl.NumberFormat("ar-SA", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatMoney(value: number | undefined | null) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0) / 100);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "full",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

async function fetchAudit(from: string, to: string) {
  const response = await api.get<{ status: boolean; data?: AuditReport }>("/api/dashboard/accounting/subscription-operations-audit", {
    params: { from, to, includeDetails: true },
  });
  if (response.data.status !== true || !response.data.data) {
    throw new Error("Subscription operations audit response contract mismatch");
  }
  return response.data.data;
}

function RiskBadge({ risk }: { risk: Risk }) {
  return (
    <Badge variant="outline" className={riskClasses(risk)}>
      {RISK_LABELS[risk]}
    </Badge>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function pickupStatus(day: DayAudit) {
  const values = day.pickupRequests
    .map((row) => row.status)
    .filter((value): value is string => Boolean(value));
  return values.join("، ");
}

function fulfillmentStatus(day: DayAudit) {
  const deliveryStatus = day.delivery?.status;
  if (deliveryStatus) return DELIVERY_STATUS_LABELS[deliveryStatus] || deliveryStatus;
  return pickupStatus(day) || "—";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportDeliveryCsv(report: AuditReport) {
  const rows: unknown[][] = [[
    "التاريخ",
    "مستحق توصيل؟",
    "تم تسجيل الوصول؟",
    "نتيجة المراجعة",
    "رقم الاشتراك",
    "اسم العميل",
    "رقم الهاتف",
    "الخطة",
    "مصدر الاشتراك",
    "طريقة التنفيذ الفعلية",
    "حالة يوم الاشتراك",
    "حالة التوصيل بالداشبورد",
    "وقت تسجيل الوصول",
    "الوجبات اليومية",
    "الوجبات المختارة",
    "المحجوز تلقائيًا",
    "المستهلك تلقائيًا",
    "الخصم اليدوي",
    "المصادر",
    "المفروض استهلاكه بعد الوصول",
    "الاستهلاك المرصود",
    "فرق الاستهلاك",
    "تأثير الرصيد المرصود",
    "منفذ تسجيل الوصول",
    "وقت حركة الوصول",
    "درجة الخطر",
    "أسباب المراجعة",
  ]];

  for (const daily of report.dailyDeliveryOperations || []) {
    for (const row of daily.customers) {
      const actor = row.dashboardFulfillActor || row.lastDashboardOperation;
      rows.push([
        row.date,
        row.deliveryExpected ? "نعم" : "لا",
        row.dashboardDelivered ? "نعم" : "لا",
        row.result.labelAr,
        row.subscriptionId,
        row.customer.name,
        row.customer.phone,
        row.plan.name,
        row.source.labelAr,
        row.effectiveFulfillmentMethod === "delivery" ? "توصيل" : "استلام من الفرع",
        row.dayStatus || "لا يوجد سجل يوم",
        DELIVERY_STATUS_LABELS[row.deliveryStatus] || row.deliveryStatus,
        formatDateTime(row.deliveredAt),
        row.expectedMeals,
        row.selectedMeals,
        row.reservedMeals,
        row.automaticConsumedMeals,
        row.manualDeductedMeals,
        row.forfeitedMeals,
        row.expectedConsumedMeals,
        row.observedConsumedMeals,
        row.consumptionDifference,
        row.entitlementImpactObserved,
        actor ? [actor.role, actor.email].filter(Boolean).join(" · ") : "—",
        formatDateTime(actor?.at),
        RISK_LABELS[row.risk],
        [row.result.messageAr, ...row.sourceIssues.map((issue) => `${issue.code}: ${issue.message}`)].join(" | "),
      ]);
    }
  }

  downloadCsv(
    `daily-delivery-meal-audit-${report.range.from}-to-${report.range.to}.csv`,
    rows,
  );
}

function actorLabel(row: DailyDeliveryCustomer) {
  const actor = row.dashboardFulfillActor || row.lastDashboardOperation;
  if (!actor) return "لا يوجد سجل موظف";
  return [actor.role, actor.email].filter(Boolean).join(" · ") || actor.id || "غير محدد";
}

function SubscriptionAuditPage() {
  const today = getTodayKSADate();
  const initialFrom = addAccountingDays(today, -2);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(today);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(today);
  const [deliveryRowFilter, setDeliveryRowFilter] = useState<DeliveryRowFilter>("all");
  const [fulfillment, setFulfillment] = useState<FulfillmentFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");

  const reportQuery = useQuery({
    queryKey: ["subscription-operations-audit", from, to],
    queryFn: () => fetchAudit(from, to),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const report = reportQuery.data;
  const dailyDeliveryOperations = useMemo(
    () => report?.dailyDeliveryOperations ?? [],
    [report?.dailyDeliveryOperations],
  );

  const selectedDeliveryDay = useMemo(
    () => dailyDeliveryOperations.find((row) => row.date === selectedDeliveryDate)
      || dailyDeliveryOperations[dailyDeliveryOperations.length - 1]
      || null,
    [dailyDeliveryOperations, selectedDeliveryDate],
  );

  const selectedDeliveryCustomers = useMemo(() => {
    const rows = selectedDeliveryDay?.customers || [];
    if (deliveryRowFilter === "problems") return rows.filter((row) => RISK_ORDER[row.risk] >= RISK_ORDER.high);
    if (deliveryRowFilter === "delivered") return rows.filter((row) => row.deliveryExpected && row.dashboardDelivered);
    if (deliveryRowFilter === "not_delivered") return rows.filter((row) => row.deliveryExpected && !row.dashboardDelivered);
    if (deliveryRowFilter === "excluded") return rows.filter((row) => !row.deliveryExpected);
    return rows;
  }, [selectedDeliveryDay, deliveryRowFilter]);

  const audits = useMemo(() => {
    const source = report?.subscriptionAudits || [];
    return source
      .filter((row) => fulfillment === "all" || row.fulfillmentMethod === fulfillment)
      .filter((row) => risk === "all" || row.risk === risk)
      .sort((left, right) => RISK_ORDER[right.risk] - RISK_ORDER[left.risk]);
  }, [report, fulfillment, risk]);

  const applyRange = () => {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    setFrom(draftFrom);
    setTo(draftTo);
    setSelectedDeliveryDate(draftTo);
  };

  const deliverySummary = report?.summary.deliveryOperations;

  return (
    <main className="space-y-6 p-4 md:p-6" dir="rtl">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TruckIcon className="size-7 text-primary" />
                متابعة التوصيل وخصم الوجبات
              </CardTitle>
              <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
                بيانات مباشرة من اشتراكات الإنتاج وسجل أيام الاشتراك وحالات التوصيل وحجوزات الوجبات والاستهلاك التلقائي والخصومات اليدوية. أول يوم استلام من الفرع لا يُحسب ضمن عملاء التوصيل.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
                <RefreshCwIcon className={`ml-2 size-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث البيانات
              </Button>
              <Button variant="outline" disabled={!report || !dailyDeliveryOperations.length} onClick={() => report && exportDeliveryCsv(report)}>
                <DownloadIcon className="ml-2 size-4" />
                تصدير تقرير التوصيل CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="audit-from">من تاريخ</Label>
            <Input id="audit-from" type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-to">إلى تاريخ</Label>
            <Input id="audit-to" type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={applyRange} disabled={!draftFrom || !draftTo || draftFrom > draftTo}>
              <CalendarRangeIcon className="ml-2 size-4" />
              تطبيق الفترة
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">جاري قراءة سجلات الإنتاج وتجهيز المطابقة…</CardContent></Card>
      ) : reportQuery.isError ? (
        <Card className="border-red-300 bg-red-50"><CardContent className="p-6 text-red-800">تعذر تحميل التقرير. تأكد من الدخول بحساب مدير ثم أعد المحاولة.</CardContent></Card>
      ) : report ? (
        <>
          {deliverySummary ? (
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
              <MetricCard title="أيام عملاء التوصيل المستحقة" value={formatInteger(deliverySummary.expectedCustomerDays)} hint="مجموع العملاء المستحقين خلال الفترة" />
              <MetricCard title="تم تسجيل وصولهم" value={formatInteger(deliverySummary.deliveredCustomerDays)} />
              <MetricCard title="لم يسجل وصولهم" value={formatInteger(deliverySummary.notDeliveredCustomerDays)} />
              <MetricCard title="نسبة التنفيذ" value={formatPercent(deliverySummary.deliveryRate)} />
              <MetricCard title="استهلاك تلقائي" value={formatInteger(deliverySummary.automaticConsumedMeals)} />
              <MetricCard title="خصم يدوي" value={formatInteger(deliverySummary.manuallyDeductedMeals)} />
              <MetricCard title="فرق الاستهلاك" value={formatInteger(deliverySummary.consumptionDifference)} hint="صفر هو الوضع المتوازن" />
              <MetricCard title="اشتباه خصم مزدوج" value={formatInteger(deliverySummary.doubleDeductionSuspicions)} />
            </section>
          ) : (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-6 text-amber-900">
                إصدار الباك إند الحالي لم يرجع ملخص التوصيل اليومي بعد. انتظر اكتمال نشر تحديث الباك إند ثم اضغط «تحديث البيانات».
              </CardContent>
            </Card>
          )}

          {dailyDeliveryOperations.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>ملخص كل يوم</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {dailyDeliveryOperations.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDeliveryDate(day.date)}
                      className={`rounded-2xl border p-4 text-right transition hover:border-primary ${selectedDeliveryDay?.date === day.date ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{formatDate(day.date)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">مستبعد أول يوم استلام: {formatInteger(day.excludedFirstDayPickupCustomers)}</p>
                        </div>
                        <Badge variant="outline" className={day.riskCounts.critical > 0 ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-300 bg-emerald-50 text-emerald-800"}>
                          {day.riskCounts.critical > 0 ? `${formatInteger(day.riskCounts.critical)} حرج` : "لا توجد حالة حرجة"}
                        </Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-muted/60 p-2"><span className="block text-xs text-muted-foreground">المستحق</span><strong>{formatInteger(day.expectedCustomers)}</strong></div>
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><span className="block text-xs">وصل</span><strong>{formatInteger(day.deliveredCustomers)}</strong></div>
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-800"><span className="block text-xs">لم يصل</span><strong>{formatInteger(day.notDeliveredCustomers)}</strong></div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                        <div><span className="block text-muted-foreground">المفروض</span><strong>{formatInteger(day.meals.expectedConsumedAfterDelivered)}</strong></div>
                        <div><span className="block text-muted-foreground">تلقائي</span><strong>{formatInteger(day.meals.automaticConsumed)}</strong></div>
                        <div><span className="block text-muted-foreground">يدوي</span><strong>{formatInteger(day.meals.manuallyDeducted)}</strong></div>
                        <div><span className="block text-muted-foreground">الفرق</span><strong className={day.meals.consumptionDifference === 0 ? "text-emerald-700" : "text-red-700"}>{formatInteger(day.meals.consumptionDifference)}</strong></div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {selectedDeliveryDay ? (
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/20">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <CardTitle>{formatDate(selectedDeliveryDay.date)}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                          المستحقون: {formatInteger(selectedDeliveryDay.expectedCustomers)} · وصل: {formatInteger(selectedDeliveryDay.deliveredCustomers)} · لم يصل: {formatInteger(selectedDeliveryDay.notDeliveredCustomers)} · نسبة التنفيذ: {formatPercent(selectedDeliveryDay.deliveryRate)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="delivery-row-filter">عرض العملاء</Label>
                        <select
                          id="delivery-row-filter"
                          className="h-10 rounded-md border bg-background px-3"
                          value={deliveryRowFilter}
                          onChange={(event) => setDeliveryRowFilter(event.target.value as DeliveryRowFilter)}
                        >
                          <option value="all">الكل</option>
                          <option value="problems">المشاكل فقط</option>
                          <option value="delivered">تم التوصيل</option>
                          <option value="not_delivered">لم يتم التوصيل</option>
                          <option value="excluded">المستبعدون من التوصيل</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <MetricCard title="وجبات كل المستحقين" value={formatInteger(selectedDeliveryDay.meals.plannedForExpectedCustomers)} />
                      <MetricCard title="المفروض استهلاكه بعد الوصول" value={formatInteger(selectedDeliveryDay.meals.expectedConsumedAfterDelivered)} />
                      <MetricCard title="المحجوز حاليًا" value={formatInteger(selectedDeliveryDay.meals.reserved)} />
                      <MetricCard title="المستهلك تلقائيًا" value={formatInteger(selectedDeliveryDay.meals.automaticConsumed)} />
                      <MetricCard title="الخصم اليدوي" value={formatInteger(selectedDeliveryDay.meals.manuallyDeducted)} />
                    </section>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(selectedDeliveryDay.deliveryStatusCounts).map(([status, count]) => (
                        <Badge key={status} variant="outline">
                          {DELIVERY_STATUS_LABELS[status] || status}: {formatInteger(count)}
                        </Badge>
                      ))}
                    </div>

                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full min-w-[1750px] text-sm">
                        <thead className="bg-muted/60 text-right">
                          <tr>
                            {["العميل", "رقم الاشتراك", "طريقة اليوم", "حالة اليوم", "حالة التوصيل", "نتيجة المراجعة", "وجبات اليوم", "المختار", "المحجوز", "التلقائي", "اليدوي", "المفروض بعد الوصول", "المرصود", "الفرق", "الموظف/السائق", "وقت الوصول", "الخطر والأسباب"].map((label) => (
                              <th key={label} className="px-3 py-3">{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDeliveryCustomers.length === 0 ? (
                            <tr><td colSpan={17} className="p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة للفلتر.</td></tr>
                          ) : selectedDeliveryCustomers.map((row) => (
                            <tr key={`${row.date}-${row.subscriptionId}`} className={`border-t align-top ${row.risk === "critical" ? "bg-red-50/50" : ""}`}>
                              <td className="px-3 py-3">
                                <strong>{row.customer.name}</strong>
                                <div className="mt-1 text-xs text-muted-foreground" dir="ltr">{row.customer.phone}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{row.plan.name} · {row.source.labelAr}</div>
                              </td>
                              <td className="px-3 py-3 font-mono text-xs">{row.subscriptionId}</td>
                              <td className="px-3 py-3">
                                {row.effectiveFulfillmentMethod === "delivery" ? "توصيل" : "استلام من الفرع"}
                                {row.firstDayPickupOverride ? <Badge variant="outline" className="mt-2 block w-fit border-slate-300 bg-slate-50">أول يوم</Badge> : null}
                              </td>
                              <td className="px-3 py-3">{row.dayStatus || "لا يوجد سجل"}</td>
                              <td className="px-3 py-3">
                                <Badge variant="outline" className={row.dashboardDelivered ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                                  {DELIVERY_STATUS_LABELS[row.deliveryStatus] || row.deliveryStatus}
                                </Badge>
                              </td>
                              <td className="px-3 py-3">
                                <div className={`max-w-[240px] rounded-xl border p-3 text-xs leading-5 ${resultClasses(row)}`}>
                                  <strong className="block">{row.result.labelAr}</strong>
                                  <span>{row.result.messageAr}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 font-semibold">{formatInteger(row.expectedMeals)}</td>
                              <td className="px-3 py-3">{formatInteger(row.selectedMeals)}</td>
                              <td className="px-3 py-3">{formatInteger(row.reservedMeals)}</td>
                              <td className="px-3 py-3">{formatInteger(row.automaticConsumedMeals)}</td>
                              <td className={`px-3 py-3 font-semibold ${row.manualDeductedMeals > 0 ? "text-red-700" : ""}`}>{formatInteger(row.manualDeductedMeals)}</td>
                              <td className="px-3 py-3">{formatInteger(row.expectedConsumedMeals)}</td>
                              <td className="px-3 py-3">{formatInteger(row.observedConsumedMeals)}</td>
                              <td className={`px-3 py-3 font-bold ${row.consumptionDifference === 0 ? "text-emerald-700" : "text-red-700"}`}>{formatInteger(row.consumptionDifference)}</td>
                              <td className="max-w-[220px] px-3 py-3 text-xs">
                                <strong>{actorLabel(row)}</strong>
                                <div className="mt-1 text-muted-foreground">{row.dashboardFulfillActor?.action || row.lastDashboardOperation?.action || "—"}</div>
                              </td>
                              <td className="px-3 py-3 text-xs">{formatDateTime(row.deliveredAt || row.dashboardFulfillActor?.at)}</td>
                              <td className="max-w-[350px] px-3 py-3">
                                <RiskBadge risk={row.risk} />
                                {row.sourceIssues.length > 0 ? (
                                  <ul className="mt-2 space-y-1 text-xs">
                                    {row.sourceIssues.map((issue, index) => <li key={`${issue.code}-${index}`}><strong>{issue.code}</strong>: {issue.message}</li>)}
                                  </ul>
                                ) : <p className="mt-2 text-xs text-muted-foreground">لا توجد أسباب إضافية.</p>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>ملخص الاشتراكات الجديدة خلال الفترة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard title="إجمالي الاشتراكات" value={formatInteger(report.summary.newSubscriptions.total)} />
                <MetricCard title="استلام" value={formatInteger(report.summary.newSubscriptions.pickup)} />
                <MetricCard title="توصيل" value={formatInteger(report.summary.newSubscriptions.delivery)} />
                <MetricCard title="من الفرع · استلام" value={formatInteger(report.summary.newSubscriptions.matrix.branch_pickup)} />
                <MetricCard title="من التطبيق · استلام" value={formatInteger(report.summary.newSubscriptions.matrix.app_pickup)} />
                <MetricCard title="من التطبيق · توصيل" value={formatInteger(report.summary.newSubscriptions.matrix.app_delivery)} />
              </section>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[950px] text-sm">
                  <thead className="bg-muted/60 text-right">
                    <tr>{["العميل", "الاشتراك", "المصدر", "التنفيذ", "الباقة", "الوجبات", "المبلغ", "الإنشاء", "الخطر"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {report.newSubscriptions.length === 0 ? (
                      <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">لا توجد اشتراكات جديدة.</td></tr>
                    ) : report.newSubscriptions.map((row) => (
                      <tr key={row.subscriptionId} className="border-t align-top">
                        <td className="px-4 py-3"><strong>{row.customer.name}</strong><div className="text-xs text-muted-foreground" dir="ltr">{row.customer.phone}</div></td>
                        <td className="px-4 py-3 font-mono text-xs">{row.subscriptionId}</td>
                        <td className="px-4 py-3">{row.source.labelAr}<div className="text-xs text-muted-foreground">{row.source.payment?.provider || "—"}</div></td>
                        <td className="px-4 py-3">{row.fulfillmentLabelAr}</td>
                        <td className="px-4 py-3">{row.plan.name}</td>
                        <td className="px-4 py-3">{formatInteger(row.totalMeals)}</td>
                        <td className="px-4 py-3">{formatMoney(row.totalPriceHalala)}</td>
                        <td className="px-4 py-3">{formatDateTime(row.createdAt)}</td>
                        <td className="px-4 py-3"><RiskBadge risk={row.auditRisk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold"><ShieldCheckIcon className="size-5" /> تدقيق الرصيد حسب الاشتراك</h2>
                <p className="mt-1 text-sm text-muted-foreground">للمراجعة المتقدمة لكل رصيد ويوم، مرتبة من الأخطر إلى السليم.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="space-y-2">
                  <Label htmlFor="audit-fulfillment">التنفيذ</Label>
                  <select id="audit-fulfillment" className="h-10 rounded-md border bg-background px-3" value={fulfillment} onChange={(event) => setFulfillment(event.target.value as FulfillmentFilter)}>
                    <option value="all">الكل</option>
                    <option value="delivery">توصيل</option>
                    <option value="pickup">استلام</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-risk">الخطر</Label>
                  <select id="audit-risk" className="h-10 rounded-md border bg-background px-3" value={risk} onChange={(event) => setRisk(event.target.value as RiskFilter)}>
                    <option value="all">الكل</option>
                    <option value="critical">حرج</option>
                    <option value="high">مرتفع</option>
                    <option value="medium">متوسط</option>
                    <option value="ok">سليم</option>
                  </select>
                </div>
              </div>
            </div>

            {audits.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</CardContent></Card>
            ) : audits.map((subscription) => (
              <details key={subscription.subscriptionId} className={`rounded-2xl border bg-card ${subscription.risk === "critical" ? "border-red-300" : ""}`}>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      {RISK_ORDER[subscription.risk] >= RISK_ORDER.high ? <AlertTriangleIcon className="mt-1 size-5 text-red-600" /> : <ShieldCheckIcon className="mt-1 size-5 text-emerald-600" />}
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><strong>{subscription.customer.name}</strong><RiskBadge risk={subscription.risk} /><Badge variant="outline">{subscription.fulfillmentLabelAr}</Badge><Badge variant="outline">{subscription.source.labelAr}</Badge></div>
                        <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{subscription.customer.phone} · {subscription.subscriptionId}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-5 text-center text-xs">
                      <div><span className="block text-muted-foreground">تلقائي</span><strong>{formatInteger(subscription.periodSummary.automaticConsumedMeals)}</strong></div>
                      <div><span className="block text-muted-foreground">يدوي</span><strong>{formatInteger(subscription.periodSummary.manualDeductedMeals)}</strong></div>
                      <div><span className="block text-muted-foreground">أيام حرجة</span><strong>{formatInteger(subscription.periodSummary.criticalDays)}</strong></div>
                    </div>
                  </div>
                </summary>
                <div className="space-y-4 border-t p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricCard title="الإجمالي" value={formatInteger(subscription.balance.totalMeals)} />
                    <MetricCard title="متاح" value={formatInteger(subscription.balance.availableMeals)} />
                    <MetricCard title="محجوز" value={formatInteger(subscription.balance.reservedMeals)} />
                    <MetricCard title="مستهلك" value={formatInteger(subscription.balance.consumedMeals)} />
                    <MetricCard title="غير مستلم" value={formatInteger(subscription.balance.displayedUnconsumedMeals)} />
                    <MetricCard title="فرق المعادلة" value={formatInteger(subscription.balance.equationDifference)} hint={subscription.balance.balanced ? "متوازن" : "يحتاج مراجعة"} />
                  </div>
                  {subscription.issues.length > 0 ? (
                    <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                      {subscription.issues.map((entry, index) => <p key={`${entry.code}-${index}`}><strong>{entry.code}</strong> — {entry.message}</p>)}
                    </div>
                  ) : null}
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[1150px] text-sm">
                      <thead className="bg-muted/60 text-right">
                        <tr>{["التاريخ", "حالة اليوم", "العملية", "المتوقع", "المختار", "المحجوز", "المستهلك تلقائيًا", "الخصم اليدوي", "الخطر", "الملاحظات"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {subscription.days.map((day) => (
                          <tr key={day.date} className={`border-t align-top ${day.risk === "critical" ? "bg-red-50/70" : ""}`}>
                            <td className="px-3 py-3 font-medium">{day.date}</td>
                            <td className="px-3 py-3">{day.day?.status || "لا يوجد سجل"}</td>
                            <td className="px-3 py-3">{fulfillmentStatus(day)}</td>
                            <td className="px-3 py-3">{formatInteger(day.expectedMeals)}</td>
                            <td className="px-3 py-3">{formatInteger(day.selectedMeals)}</td>
                            <td className="px-3 py-3">{formatInteger(day.allocation.reserved)}</td>
                            <td className="px-3 py-3">{formatInteger(day.allocation.consumed)}</td>
                            <td className="px-3 py-3 font-semibold">{formatInteger(day.manualDeduction.totalMeals)}</td>
                            <td className="px-3 py-3"><RiskBadge risk={day.risk} /></td>
                            <td className="max-w-[430px] px-3 py-3">
                              {day.issues.length === 0 ? <span className="text-emerald-700">لا توجد مشكلة واضحة</span> : (
                                <ul className="space-y-1 text-xs">{day.issues.map((entry, index) => <li key={`${entry.code}-${index}`}><strong>{entry.code}</strong>: {entry.message}</li>)}</ul>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
