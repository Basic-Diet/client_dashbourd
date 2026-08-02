import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CalendarRangeIcon,
  DownloadIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
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
  risk: Risk;
  day?: { status?: string | null } | null;
  delivery?: { status?: string | null } | null;
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
    issues: {
      counts: {
        total: number;
        critical: number;
        high: number;
        medium: number;
      };
    };
  };
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

function riskClasses(risk: Risk) {
  if (risk === "critical") return "border-red-300 bg-red-50 text-red-800";
  if (risk === "high") return "border-orange-300 bg-orange-50 text-orange-800";
  if (risk === "medium") return "border-amber-300 bg-amber-50 text-amber-800";
  if (risk === "low") return "border-blue-300 bg-blue-50 text-blue-800";
  return "border-emerald-300 bg-emerald-50 text-emerald-800";
}

function formatInteger(value: number | undefined | null) {
  return new Intl.NumberFormat("ar-SA").format(Number(value || 0));
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

async function fetchAudit(from: string, to: string) {
  const response = await api.get("/api/dashboard/accounting/subscription-operations-audit", {
    params: { from, to, includeDetails: true },
  });
  return response.data.data as AuditReport;
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
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
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
  if (deliveryStatus) return deliveryStatus;
  return pickupStatus(day) || "—";
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv(report: AuditReport) {
  const rows: unknown[][] = [[
    "التاريخ",
    "رقم الاشتراك",
    "العميل",
    "الجوال",
    "مصدر الاشتراك",
    "التنفيذ",
    "حالة اليوم",
    "حالة العملية",
    "المتوقع",
    "المختار",
    "المحجوز",
    "المستهلك تلقائيًا",
    "الخصم اليدوي",
    "درجة الخطر",
    "المشاكل",
  ]];

  for (const subscription of report.subscriptionAudits) {
    for (const day of subscription.days) {
      rows.push([
        day.date,
        subscription.subscriptionId,
        subscription.customer.name,
        subscription.customer.phone,
        subscription.source.labelAr,
        subscription.fulfillmentLabelAr,
        day.day?.status || "لا يوجد سجل يوم",
        fulfillmentStatus(day),
        day.expectedMeals,
        day.selectedMeals,
        day.allocation.reserved,
        day.allocation.consumed,
        day.manualDeduction.totalMeals,
        RISK_LABELS[day.risk],
        day.issues.map((row) => `${row.code}: ${row.message}`).join(" | "),
      ]);
    }
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `subscription-audit-${report.range.from}-to-${report.range.to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function SubscriptionAuditPage() {
  const today = getTodayKSADate();
  const initialFrom = addAccountingDays(today, -2);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(today);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(today);
  const [fulfillment, setFulfillment] = useState<FulfillmentFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");

  const reportQuery = useQuery({
    queryKey: ["subscription-operations-audit", from, to],
    queryFn: () => fetchAudit(from, to),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const audits = useMemo(() => {
    const source = reportQuery.data?.subscriptionAudits || [];
    return source
      .filter((row) => fulfillment === "all" || row.fulfillmentMethod === fulfillment)
      .filter((row) => risk === "all" || row.risk === risk)
      .sort((left, right) => RISK_ORDER[right.risk] - RISK_ORDER[left.risk]);
  }, [reportQuery.data, fulfillment, risk]);

  const applyRange = () => {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return;
    setFrom(draftFrom);
    setTo(draftTo);
  };

  const report = reportQuery.data;

  return (
    <main className="space-y-6 p-4 md:p-6" dir="rtl">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <ShieldCheckIcon className="size-7 text-primary" />
                مراجعة الاشتراكات وخصم الوجبات
              </CardTitle>
              <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
                تقسيم الاشتراكات الجديدة حسب الفرع أو التطبيق، ثم مطابقة اختيار الوجبات والحجز والاستهلاك التلقائي والخصم اليدوي لكل يوم.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
                <RefreshCwIcon className={`ml-2 size-4 ${reportQuery.isFetching ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <Button variant="outline" disabled={!report} onClick={() => report && exportCsv(report)}>
                <DownloadIcon className="ml-2 size-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="audit-from">من</Label>
            <Input id="audit-from" type="date" value={draftFrom} onChange={(event) => setDraftFrom(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-to">إلى</Label>
            <Input id="audit-to" type="date" value={draftTo} onChange={(event) => setDraftTo(event.target.value)} />
          </div>
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
          <div className="flex items-end">
            <Button onClick={applyRange} disabled={!draftFrom || !draftTo || draftFrom > draftTo}>
              <CalendarRangeIcon className="ml-2 size-4" />
              تطبيق
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isLoading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">جاري تجهيز التقرير…</CardContent></Card>
      ) : reportQuery.isError ? (
        <Card className="border-red-300 bg-red-50"><CardContent className="p-6 text-red-800">تعذر تحميل التقرير. أعد المحاولة بحساب مدير.</CardContent></Card>
      ) : report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard title="اشتراكات جديدة" value={formatInteger(report.summary.newSubscriptions.total)} />
            <MetricCard title="استلام" value={formatInteger(report.summary.newSubscriptions.pickup)} />
            <MetricCard title="توصيل" value={formatInteger(report.summary.newSubscriptions.delivery)} />
            <MetricCard title="استهلاك تلقائي" value={formatInteger(report.summary.operations.automaticConsumedMeals)} />
            <MetricCard title="خصم يدوي" value={formatInteger(report.summary.operations.manuallyDeductedMeals)} />
            <MetricCard title="مشاكل حرجة" value={formatInteger(report.summary.issues.counts.critical)} hint={`${formatInteger(report.summary.issues.counts.total)} ملاحظة`} />
          </section>

          <Card>
            <CardHeader><CardTitle>تقسيم الاشتراكات الجديدة</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="من الفرع · استلام" value={formatInteger(report.summary.newSubscriptions.matrix.branch_pickup)} />
              <MetricCard title="من التطبيق · استلام" value={formatInteger(report.summary.newSubscriptions.matrix.app_pickup)} />
              <MetricCard title="من الفرع · توصيل" value={formatInteger(report.summary.newSubscriptions.matrix.branch_delivery)} />
              <MetricCard title="من التطبيق · توصيل" value={formatInteger(report.summary.newSubscriptions.matrix.app_delivery)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>الاشتراكات التي أُنشئت خلال الفترة</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-muted/60 text-right"><tr>{["العميل", "الاشتراك", "المصدر", "التنفيذ", "الباقة", "الوجبات", "المبلغ", "الإنشاء", "الخطر"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
                <tbody>
                  {report.newSubscriptions.length === 0 ? <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">لا توجد اشتراكات جديدة.</td></tr> : report.newSubscriptions.map((row) => (
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
            </CardContent>
          </Card>

          <section className="space-y-4">
            <div><h2 className="text-xl font-bold">تدقيق الخصم والتنفيذ</h2><p className="text-sm text-muted-foreground">مرتب من الأخطر إلى السليم، ويشمل أيام التوصيل المتوقعة حتى عند غياب سجل اليوم.</p></div>
            {audits.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد نتائج مطابقة.</CardContent></Card> : audits.map((subscription) => (
              <details key={subscription.subscriptionId} className={`rounded-2xl border bg-card ${subscription.risk === "critical" ? "border-red-300" : ""}`}>
                <summary className="cursor-pointer list-none p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      {RISK_ORDER[subscription.risk] >= RISK_ORDER.high ? <AlertTriangleIcon className="mt-1 size-5 text-red-600" /> : <ShieldCheckIcon className="mt-1 size-5 text-emerald-600" />}
                      <div><div className="flex flex-wrap items-center gap-2"><strong>{subscription.customer.name}</strong><RiskBadge risk={subscription.risk} /><Badge variant="outline">{subscription.fulfillmentLabelAr}</Badge><Badge variant="outline">{subscription.source.labelAr}</Badge></div><p className="mt-1 text-xs text-muted-foreground" dir="ltr">{subscription.customer.phone} · {subscription.subscriptionId}</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-5 text-center text-xs"><div><span className="block text-muted-foreground">تلقائي</span><strong>{formatInteger(subscription.periodSummary.automaticConsumedMeals)}</strong></div><div><span className="block text-muted-foreground">يدوي</span><strong>{formatInteger(subscription.periodSummary.manualDeductedMeals)}</strong></div><div><span className="block text-muted-foreground">أيام حرجة</span><strong>{formatInteger(subscription.periodSummary.criticalDays)}</strong></div></div>
                  </div>
                </summary>
                <div className="space-y-4 border-t p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><MetricCard title="الإجمالي" value={formatInteger(subscription.balance.totalMeals)} /><MetricCard title="متاح" value={formatInteger(subscription.balance.availableMeals)} /><MetricCard title="محجوز" value={formatInteger(subscription.balance.reservedMeals)} /><MetricCard title="مستهلك" value={formatInteger(subscription.balance.consumedMeals)} /><MetricCard title="غير مستلم" value={formatInteger(subscription.balance.displayedUnconsumedMeals)} /><MetricCard title="فرق المعادلة" value={formatInteger(subscription.balance.equationDifference)} hint={subscription.balance.balanced ? "متوازن" : "يحتاج مراجعة"} /></div>
                  {subscription.issues.length > 0 ? <div className="space-y-1 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{subscription.issues.map((entry, index) => <p key={`${entry.code}-${index}`}><strong>{entry.code}</strong> — {entry.message}</p>)}</div> : null}
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[1150px] text-sm">
                      <thead className="bg-muted/60 text-right"><tr>{["التاريخ", "حالة اليوم", "العملية", "المتوقع", "المختار", "المحجوز", "المستهلك تلقائيًا", "الخصم اليدوي", "الخطر", "الملاحظات"].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
                      <tbody>{subscription.days.map((day) => (
                        <tr key={day.date} className={`border-t align-top ${day.risk === "critical" ? "bg-red-50/70" : ""}`}>
                          <td className="px-3 py-3 font-medium">{day.date}</td><td className="px-3 py-3">{day.day?.status || "لا يوجد سجل"}</td><td className="px-3 py-3">{fulfillmentStatus(day)}</td><td className="px-3 py-3">{formatInteger(day.expectedMeals)}</td><td className="px-3 py-3">{formatInteger(day.selectedMeals)}</td><td className="px-3 py-3">{formatInteger(day.allocation.reserved)}</td><td className="px-3 py-3">{formatInteger(day.allocation.consumed)}</td><td className="px-3 py-3 font-semibold">{formatInteger(day.manualDeduction.totalMeals)}</td><td className="px-3 py-3"><RiskBadge risk={day.risk} /></td><td className="max-w-[430px] px-3 py-3">{day.issues.length === 0 ? <span className="text-emerald-700">لا توجد مشكلة واضحة</span> : <ul className="space-y-1 text-xs">{day.issues.map((entry, index) => <li key={`${entry.code}-${index}`}><strong>{entry.code}</strong>: {entry.message}</li>)}</ul>}</td>
                        </tr>
                      ))}</tbody>
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
