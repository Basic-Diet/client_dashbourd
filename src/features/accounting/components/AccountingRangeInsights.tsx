import {
  ActivityIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarRangeIcon,
  MinusIcon,
  MonitorSmartphoneIcon,
  ReceiptTextIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubscriptionPaymentBucket } from "@/features/accounting/accountingTypes";
import type {
  SubscriptionPaymentRangeMetricComparison,
  SubscriptionPaymentRangeReportData,
} from "@/features/accounting/accountingRangeTypes";
import {
  formatInteger,
  formatMoney,
  formatSarFromHalala,
  textOrDash,
} from "@/features/accounting/accountingFormatters";

const PANEL_CLASS = "rounded-2xl bg-card/95 shadow-sm ring-1 ring-foreground/10";

export function AccountingRangeInsights({
  report,
}: {
  report: SubscriptionPaymentRangeReportData;
}) {
  const comparison = report.comparison;
  const comparisonEnabled = Boolean(
    comparison?.enabled &&
      (comparison.grossCollection ||
        comparison.refunds ||
        comparison.netCollection ||
        comparison.averageDailyNet)
  );
  const statistics = report.statistics;
  const currency = report.currency ?? "SAR";

  return (
    <section className="space-y-4" aria-label="تحليلات النطاق" dir="rtl">
      {comparisonEnabled ? (
        <Card className={PANEL_CLASS}>
          <CardHeader className="gap-2 border-b">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarRangeIcon className="size-5 text-primary" />
                  قراءة تنفيذية للفترة
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {report.range.labelAr} · {formatInteger(report.range.days)} يوم
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                مقارنة تلقائية بفترة مساوية
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <ComparisonCard
              title="إجمالي التحصيل"
              comparison={comparison?.grossCollection}
              currency={currency}
            />
            <ComparisonCard
              title="المرتجعات"
              comparison={comparison?.refunds}
              currency={currency}
            />
            <ComparisonCard
              title="صافي الحركة"
              comparison={comparison?.netCollection}
              currency={currency}
            />
            <ComparisonCard
              title="متوسط صافي اليوم"
              comparison={comparison?.averageDailyNet}
              currency={currency}
            />
            {comparison?.labelAr ? (
              <p className="rounded-xl border border-dashed px-4 py-3 text-xs leading-6 text-muted-foreground sm:col-span-2 xl:col-span-4">
                {comparison.labelAr}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
        <Card className={PANEL_CLASS}>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">مؤشرات التشغيل المالي</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
            <InsightMetric
              icon={<ActivityIcon className="size-4" />}
              label="أيام بها حركة"
              value={`${formatInteger(statistics?.daysWithActivity)} من ${formatInteger(statistics?.totalDays)}`}
              helper="تحصيل أو مرتجع مسجل"
            />
            <InsightMetric
              icon={<ReceiptTextIcon className="size-4" />}
              label="أيام بدون حركة"
              value={formatInteger(statistics?.daysWithoutActivity)}
              helper="مفيدة لمراجعة التوقفات"
            />
            <InsightMetric
              icon={<WalletCardsIcon className="size-4" />}
              label="متوسط اليوم النشط"
              value={formatMoney(
                statistics?.averageActiveDayFormattedAr,
                statistics?.averageActiveDayHalala,
                currency
              )}
              helper="على الأيام التي بها حركة فقط"
            />
            <InsightMetric
              icon={<UsersIcon className="size-4" />}
              label={comparisonEnabled ? "تغير عدد العملاء" : "عدد العملاء"}
              value={
                comparisonEnabled
                  ? signedCount(comparison?.customersCount?.delta)
                  : formatInteger(report.summary?.uniqueCustomersCount)
              }
              helper={
                comparisonEnabled
                  ? `${formatInteger(comparison?.customersCount?.current)} حاليًا مقابل ${formatInteger(comparison?.customersCount?.previous)}`
                  : "عملاء فريدون داخل الفترة المحددة"
              }
            />
            <InsightMetric
              icon={<ArrowUpRightIcon className="size-4" />}
              label="أفضل يوم"
              value={formatMoney(
                statistics?.highestDay?.netCollectionFormattedAr,
                statistics?.highestDay?.netCollectionHalala,
                currency
              )}
              helper={textOrDash(
                statistics?.highestDay?.businessDateLabelAr,
                statistics?.highestDay?.businessDate
              )}
            />
            <InsightMetric
              icon={<ArrowDownLeftIcon className="size-4" />}
              label="أضعف يوم"
              value={formatMoney(
                statistics?.lowestDay?.netCollectionFormattedAr,
                statistics?.lowestDay?.netCollectionHalala,
                currency
              )}
              helper={textOrDash(
                statistics?.lowestDay?.businessDateLabelAr,
                statistics?.lowestDay?.businessDate
              )}
            />
          </CardContent>
        </Card>

        <Card className={PANEL_CLASS}>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">مصدر التحصيل ومزود الدفع</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 p-4 md:grid-cols-2">
            <BucketShareList
              icon={<MonitorSmartphoneIcon className="size-4" />}
              title="قناة المصدر"
              buckets={report.bySourceChannel}
              currency={currency}
            />
            <BucketShareList
              icon={<WalletCardsIcon className="size-4" />}
              title="مزود الدفع"
              buckets={report.byPaymentProvider}
              currency={currency}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function ComparisonCard({
  title,
  comparison,
  currency,
}: {
  title: string;
  comparison?: SubscriptionPaymentRangeMetricComparison | null;
  currency: string;
}) {
  const trend = comparison?.trend ?? "flat";
  const current = formatSarFromHalala(comparison?.currentHalala ?? 0, currency);
  const previous = formatSarFromHalala(comparison?.previousHalala ?? 0, currency);

  return (
    <div className="rounded-2xl border bg-background/45 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <TrendBadge trend={trend} percent={comparison?.changePercent} />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{current}</p>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>الفترة السابقة: {previous}</span>
        <span className="font-medium text-foreground">
          {comparison?.deltaFormattedAr ?? formatSarFromHalala(comparison?.deltaHalala ?? 0, currency)}
        </span>
      </div>
    </div>
  );
}

function TrendBadge({
  trend,
  percent,
}: {
  trend: string;
  percent?: number | null;
}) {
  const label =
    percent === null || percent === undefined
      ? "جديد"
      : `${new Intl.NumberFormat("ar-AE", { maximumFractionDigits: 1 }).format(percent)}%`;
  if (trend === "positive") {
    return (
      <Badge variant="secondary" className="gap-1">
        <ArrowUpRightIcon className="size-3.5" />
        {label}
      </Badge>
    );
  }
  if (trend === "negative") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ArrowDownLeftIcon className="size-3.5" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <MinusIcon className="size-3.5" />
      {label}
    </Badge>
  );
}

function InsightMetric({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/15 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-2 font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </div>
  );
}

function BucketShareList({
  icon,
  title,
  buckets,
  currency,
}: {
  icon: React.ReactNode;
  title: string;
  buckets?: SubscriptionPaymentBucket[] | null;
  currency: string;
}) {
  const rows = buckets ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.totalHalala ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 font-medium">
        <span className="text-primary">{icon}</span>
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          لا توجد بيانات داخل الفترة.
        </p>
      ) : (
        rows.map((row, index) => {
          const value = Number(row.totalHalala ?? 0);
          const share = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
          return (
            <div key={row.key ?? index} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{row.labelAr || "غير مصنف"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatInteger(row.count)} عملية
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatMoney(row.totalFormattedAr, row.totalHalala, currency)}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function signedCount(value?: number | null): string {
  const number = Number(value ?? 0);
  if (number > 0) return `+${formatInteger(number)}`;
  return formatInteger(number);
}
