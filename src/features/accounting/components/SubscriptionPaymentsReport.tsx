import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  ClipboardCopyIcon,
  EyeIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SubscriptionPaymentDashboardCard,
  SubscriptionPaymentReportData,
  SubscriptionPaymentReportItem,
} from "@/features/accounting/accountingTypes";
import {
  buildSubscriptionPaymentsCsv,
  downloadTextFile,
  subscriptionPaymentsCsvFileName,
} from "@/features/accounting/accountingCsv";
import {
  formatBooleanAr,
  formatDateTimeAr,
  formatDisplayValue,
  formatInteger,
  formatMoney,
  formatSarFromHalala,
  fulfillmentMethodLabel,
  paymentMethodLabel,
  paymentProviderLabel,
  reportErrorMessage,
  sourceChannelLabel,
  textOrDash,
} from "@/features/accounting/accountingFormatters";

const PAGE_SIZES = ["10", "20", "50"] as const;
const PANEL_CLASS = "rounded-2xl bg-card/95 shadow-sm ring-1 ring-foreground/10";
const SOFT_PANEL_CLASS = "rounded-xl border bg-muted/15";

interface SubscriptionPaymentsReportProps {
  report?: SubscriptionPaymentReportData;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  isFetching: boolean;
}

export function SubscriptionPaymentsReport({
  report,
  isLoading,
  isError,
  error,
  onRetry,
  isFetching,
}: SubscriptionPaymentsReportProps) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [pageSize, setPageSize] = useState("10");
  const [page, setPage] = useState(1);

  const currency = report?.currency ?? "SAR";

  const filteredItems = useMemo(() => {
    const items = report?.items ?? [];
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.paymentReference,
          item.paymentId,
          item.subscriptionId,
          item.customerName,
          item.customerPhone,
          item.planNameAr,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesMethod =
        methodFilter === "all" || item.paymentMethod === methodFilter;
      const matchesReview =
        reviewFilter === "all" ||
        (reviewFilter === "needs-review" && item.needsReview === true) ||
        (reviewFilter === "clean" && item.needsReview !== true);
      return matchesSearch && matchesMethod && matchesReview;
    });
  }, [methodFilter, report?.items, reviewFilter, search]);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / numericPageSize));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice(
    (safePage - 1) * numericPageSize,
    safePage * numericPageSize
  );

  const exportCsv = () => {
    if (!report) return;
    downloadTextFile(
      buildSubscriptionPaymentsCsv(report, filteredItems),
      subscriptionPaymentsCsvFileName(report)
    );
  };

  if (isLoading && !report) {
    return <SubscriptionPaymentsSkeleton />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>تعذر تحميل تقرير تحصيل الاشتراكات</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{reportErrorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          لا توجد بيانات تقرير محاسبي للعرض.
        </CardContent>
      </Card>
    );
  }

  return (
    <section
      className="space-y-5 text-right"
      aria-labelledby="subscription-payments-title"
      dir="rtl"
    >
      <Card className={PANEL_CLASS}>
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 id="subscription-payments-title" className="text-xl font-semibold tracking-normal">
            {report.titleAr || "تحصيل الاشتراكات"}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {report.reportType === "monthly"
              ? report.businessMonthLabelAr || report.businessMonth
              : report.businessDateLabelAr || report.businessDate}
            {report.generatedAtLabelAr ? ` · ${report.generatedAtLabelAr}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap justify-start gap-2 md:justify-end">
          <Button variant="outline" onClick={onRetry} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
            تحديث التقرير
          </Button>
          <Button onClick={exportCsv}>
            تصدير CSV
          </Button>
        </div>
        </CardContent>
      </Card>

      <DashboardCards report={report} />
      <SummaryBreakdown report={report} />
      <WarningsAndReconciliation report={report} />
      {report.reportType === "monthly" ? <MonthlySection report={report} /> : null}
      <AccountingPolicyCard report={report} />

      <Card className={PANEL_CLASS}>
        <CardHeader className="gap-4 border-b">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <CardTitle className="text-lg">جدول مدفوعات الاشتراكات</CardTitle>
            <p className="text-sm text-muted-foreground">
              ابحث وراجع الدفعات بدون تغيير الفلاتر القادمة من التقرير.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_120px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="h-11 pr-9 text-right"
                placeholder="ابحث بالعميل أو الهاتف أو رقم الدفعة أو الاشتراك"
              />
            </div>
            <Select value={methodFilter} onValueChange={(value) => {
              setMethodFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل طرق الدفع</SelectItem>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="card">بطاقة</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="unknown">غير مصنف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={(value) => {
              setReviewFilter(value);
              setPage(1);
            }}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل حالات المراجعة</SelectItem>
                <SelectItem value="needs-review">تحتاج مراجعة</SelectItem>
                <SelectItem value="clean">لا تحتاج مراجعة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageSize} onValueChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <SubscriptionPaymentsTable items={visibleItems} currency={currency} />
          <div className="flex flex-col gap-3 border-t bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              الصفحة {formatInteger(safePage)} من {formatInteger(totalPages)} · النتائج{" "}
              {formatInteger(filteredItems.length)}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                التالي
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function DashboardCards({ report }: { report: SubscriptionPaymentReportData }) {
  const cards = report.dashboardCards?.length
    ? report.dashboardCards
    : fallbackCards(report);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
      {cards.map((card, index) => (
        <DashboardCard
          key={card.key || `${card.titleAr || card.labelAr || "card"}-${index}`}
          card={card}
          currency={report.currency ?? "SAR"}
        />
      ))}
    </div>
  );
}

function DashboardCard({
  card,
  currency,
}: {
  card: SubscriptionPaymentDashboardCard;
  currency: string;
}) {
  return (
    <Card className="rounded-2xl border-r-4 border-r-primary/50 bg-card/95 shadow-sm">
      <CardContent className="flex min-h-36 flex-col justify-between gap-3 p-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {card.titleAr || card.labelAr || "مؤشر مالي"}
        </p>
        <p className="text-2xl font-semibold leading-tight tracking-normal">
          {textOrDash(
            card.valueAr,
            card.valueFormattedAr,
            card.amountFormattedAr,
            card.value,
            card.valueHalala === null || card.valueHalala === undefined
              ? undefined
              : formatSarFromHalala(card.valueHalala, currency),
            card.amountHalala === null || card.amountHalala === undefined
              ? undefined
              : formatSarFromHalala(card.amountHalala, currency),
            card.count
          )}
        </p>
        {card.descriptionAr || card.subtitleAr || card.countLabelAr ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {card.descriptionAr || card.subtitleAr || card.countLabelAr}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function fallbackCards(
  report: SubscriptionPaymentReportData
): SubscriptionPaymentDashboardCard[] {
  const summary = report.summary;
  return [
    {
      key: "gross",
      titleAr: "إجمالي التحصيل",
      amountHalala: summary?.grossCollectionHalala ?? summary?.totalHalala,
      amountFormattedAr: summary?.grossCollectionFormattedAr ?? summary?.totalFormattedAr,
      count: summary?.totalPaymentsCount,
    },
    {
      key: "refunds",
      titleAr: "المرتجعات",
      amountHalala: summary?.refundsHalala,
      amountFormattedAr: summary?.refundsFormattedAr,
      count: summary?.refundsCount,
    },
    {
      key: "net",
      titleAr: "صافي الحركة",
      amountHalala: summary?.netCollectionHalala,
      amountFormattedAr: summary?.netCollectionFormattedAr,
    },
    {
      key: "cash",
      titleAr: "التحصيل النقدي",
      amountHalala: summary?.cashTotalHalala,
      amountFormattedAr: summary?.cashTotalFormattedAr,
      count: summary?.cashCount,
    },
    {
      key: "card",
      titleAr: "تحصيل البطاقات",
      amountHalala: summary?.cardTotalHalala ?? summary?.visaTotalHalala,
      amountFormattedAr: summary?.cardTotalFormattedAr ?? summary?.visaTotalFormattedAr,
      count: summary?.cardCount ?? summary?.visaCount,
    },
    {
      key: "unknown",
      titleAr: "غير مصنف",
      amountHalala: summary?.unknownTotalHalala,
      amountFormattedAr: summary?.unknownTotalFormattedAr,
      count: summary?.unknownCount,
    },
  ];
}

function SummaryBreakdown({ report }: { report: SubscriptionPaymentReportData }) {
  const summary = report.summary;
  const currency = report.currency ?? "SAR";

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>الضريبة وصافي التحصيل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Metric label="إجمالي التحصيل" value={formatMoney(summary?.grossCollectionFormattedAr ?? summary?.totalFormattedAr, summary?.grossCollectionHalala ?? summary?.totalHalala, currency)} />
          <Metric label="المرتجعات" value={formatMoney(summary?.refundsFormattedAr, summary?.refundsHalala, currency)} />
          <Metric label="صافي الحركة" value={formatMoney(summary?.netCollectionFormattedAr, summary?.netCollectionHalala, currency)} />
          <Metric label="الصافي قبل الضريبة" value={formatMoney(summary?.netBeforeVatFormattedAr, summary?.netBeforeVatHalala, currency)} />
          <Metric label="ضريبة المبيعات" value={formatMoney(summary?.salesVatFormattedAr ?? summary?.vatFormattedAr, summary?.salesVatHalala ?? summary?.vatHalala, currency)} />
          <Metric label="ضريبة المرتجعات" value={formatMoney(summary?.refundVatFormattedAr, summary?.refundVatHalala, currency)} />
          <Metric label="صافي الضريبة" value={formatMoney(summary?.netVatFormattedAr, summary?.netVatHalala, currency)} />
          <Metric label="عدد العملاء" value={formatInteger(summary?.uniqueCustomersCount)} />
          {summary?.cancelledSubscriptionsCount !== null &&
          summary?.cancelledSubscriptionsCount !== undefined ? (
            <Metric label="اشتراكات ملغاة" value={formatInteger(summary.cancelledSubscriptionsCount)} />
          ) : null}
        </CardContent>
      </Card>
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>تفصيل التحصيل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <BucketList title="حسب طريقة الدفع" buckets={report.byPaymentMethod} currency={currency} />
          <BucketList title="حسب طريقة التنفيذ" buckets={report.byFulfillmentMethod} currency={currency} />
          <BucketList title="حسب حالة الاشتراك" buckets={report.bySubscriptionStatus} currency={currency} />
          <BucketList title="حسب نوع الدفعة" buckets={report.byPaymentType} currency={currency} />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${SOFT_PANEL_CLASS} p-3`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function BucketList({
  title,
  buckets,
  currency,
}: {
  title: string;
  buckets: SubscriptionPaymentReportData["byPaymentMethod"];
  currency: string;
}) {
  const rows = buckets ?? [];
  return (
    <div className="space-y-2">
      <p className="font-medium">{title}</p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          لا توجد بيانات.
        </p>
      ) : (
        rows.map((bucket, index) => (
          <div key={bucket.key || index} className="flex items-center justify-between gap-3 rounded-xl border bg-background/40 p-3">
            <div>
              <p className="font-medium">{bucket.labelAr || "غير مصنف"}</p>
              <p className="text-xs text-muted-foreground">
                {formatInteger(bucket.count)} عملية
              </p>
            </div>
            <p className="font-semibold">
              {formatMoney(bucket.totalFormattedAr, bucket.totalHalala, currency)}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

function WarningsAndReconciliation({ report }: { report: SubscriptionPaymentReportData }) {
  const warnings = report.warnings ?? [];
  const summary = report.summary;
  const reconciliation = report.reconciliation;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>التسوية المحاسبية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">الحالة</span>
            <Badge variant={reconciliation?.isBalanced === false ? "destructive" : "secondary"}>
              {reconciliation?.statusLabelAr || reconciliation?.status || "غير محددة"}
            </Badge>
          </div>
          <Metric
            label="فرق التسوية"
            value={formatMoney(
              reconciliation?.differenceFormattedAr,
              reconciliation?.differenceHalala,
              report.currency ?? "SAR"
            )}
          />
          {reconciliation?.noteAr ? (
            <p className="rounded-lg bg-muted/30 p-3 text-sm leading-6">
              {reconciliation.noteAr}
            </p>
          ) : null}
          {["not_available", "needs_review"].includes(summary?.refundsTrackingStatus ?? "") ? (
            <Alert>
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>
                {summary?.refundsTrackingStatusAr || "تتبع المرتجعات غير متاح"}
              </AlertTitle>
              <AlertDescription>
                {summary?.refundsTrackingNoteAr ||
                  "تتبع المرتجعات حسب تاريخ الاسترداد غير متاح حاليا."}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>تحذيرات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          {warnings.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              لا توجد تحذيرات من الخادم لهذا التقرير.
            </p>
          ) : (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <Alert key={`${warning.code || "warning"}-${index}`}>
                  <AlertTriangleIcon className="size-4" />
                  <AlertDescription>
                    {warning.messageAr || warning.message || "تحذير يحتاج مراجعة."}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MonthlySection({
  report,
}: {
  report: Extract<SubscriptionPaymentReportData, { reportType: "monthly" }>;
}) {
  const rows = report.dailyBreakdown ?? [];
  const chartRows = rows.map((row) => ({
    date: row.businessDateLabelAr || row.businessDate || "-",
    gross: (row.grossCollectionHalala ?? row.totalHalala ?? 0) / 100,
    refunds: (row.refundsHalala ?? 0) / 100,
    net: (row.netCollectionHalala ?? row.totalHalala ?? 0) / 100,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>إحصائيات الشهر</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Metric
            label="أيام بها مدفوعات"
            value={formatInteger(report.statistics?.daysWithPayments)}
          />
          <Metric
            label="متوسط التحصيل اليومي"
            value={formatMoney(
              report.statistics?.averageDailyFormattedAr,
              report.statistics?.averageDailyHalala,
              report.currency ?? "SAR"
            )}
          />
        </CardContent>
      </Card>
      <Card className={PANEL_CLASS}>
        <CardHeader className="border-b">
          <CardTitle>الرسم الشهري للحركة اليومية</CardTitle>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              لا توجد بيانات يومية للرسم.
            </p>
          ) : (
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="gross" name="إجمالي التحصيل" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="refunds" name="المرتجعات" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net" name="صافي الحركة" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AccountingPolicyCard({ report }: { report: SubscriptionPaymentReportData }) {
  const policy = report.accountingPolicyAr;
  if (!policy) return null;

  return (
    <Card className={PANEL_CLASS}>
      <CardHeader className="border-b">
        <CardTitle>السياسة المحاسبية المستخدمة</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Metric label="أساس التقرير" value={textOrDash(policy.basis)} />
        <Metric label="وصف الأساس" value={textOrDash(policy.basisDescription)} />
        <Metric label="معالجة الضريبة" value={textOrDash(policy.vatTreatment)} />
        <Metric label="معالجة الإلغاء" value={textOrDash(policy.cancellationTreatment)} />
        <Metric label="معالجة طريقة الدفع" value={textOrDash(policy.paymentMethodTreatment)} />
        <Metric label="معالجة المرتجعات" value={textOrDash(policy.refundTreatment)} />
      </CardContent>
    </Card>
  );
}

function SubscriptionPaymentsTable({
  items,
  currency,
}: {
  items: SubscriptionPaymentReportItem[];
  currency: string;
}) {
  if (items.length === 0) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        لا توجد مدفوعات اشتراكات مطابقة للفترة والفلاتر المحددة.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto" dir="rtl">
      <Table className="min-w-[1280px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">رقم الاشتراك</TableHead>
            <TableHead className="text-right">الحركة</TableHead>
            <TableHead className="text-right">المصدر</TableHead>
            <TableHead className="text-right">طريقة الدفع</TableHead>
            <TableHead className="text-right">المزود</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-right">صافي الحركة</TableHead>
            <TableHead className="text-right">الضريبة</TableHead>
            <TableHead className="text-right">طريقة التنفيذ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">المراجعة</TableHead>
            <TableHead className="text-right">التفاصيل</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.movementId || item.paymentId || item.paymentReference || item.subscriptionId || index}>
              <TableCell className="min-w-44 align-middle">
                <div className="font-medium">{textOrDash(item.customerName)}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {textOrDash(item.customerPhone)}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs align-middle">
                {textOrDash(item.subscriptionId)}
              </TableCell>
              <TableCell className="align-middle">
                <Badge variant={item.movementType === "refund" ? "destructive" : "secondary"}>
                  {textOrDash(item.movementTypeLabelAr, item.movementType, "تحصيل")}
                </Badge>
              </TableCell>
              <TableCell className="align-middle">
                {sourceChannelLabel(item.sourceChannel, item.sourceChannelLabelAr)}
              </TableCell>
              <TableCell className="align-middle">
                <Badge variant="secondary">
                  {paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr)}
                </Badge>
              </TableCell>
              <TableCell className="align-middle">
                {paymentProviderLabel(
                  item.paymentProvider ?? item.provider,
                  item.paymentProviderLabelAr ?? item.providerLabelAr
                )}
              </TableCell>
              <TableCell className="align-middle font-semibold">
                {formatMoney(item.amountFormattedAr, item.amountHalala, currency)}
              </TableCell>
              <TableCell className="align-middle font-semibold">
                {formatMoney(item.netMovementFormattedAr, item.netMovementHalala, currency)}
              </TableCell>
              <TableCell className="align-middle">
                {formatMoney(item.vatFormattedAr, item.vatHalala, currency)}
              </TableCell>
              <TableCell className="align-middle">
                {fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr)}
              </TableCell>
              <TableCell className="align-middle">{textOrDash(item.statusLabelAr, item.status)}</TableCell>
              <TableCell className="align-middle">
                {item.needsReview ? (
                  <Badge variant="destructive">تحتاج مراجعة</Badge>
                ) : (
                  <Badge variant="outline">لا تحتاج مراجعة</Badge>
                )}
              </TableCell>
              <TableCell className="align-middle">
                <SubscriptionPaymentDetails item={item} currency={currency} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SubscriptionPaymentDetails({
  item,
  currency,
}: {
  item: SubscriptionPaymentReportItem;
  currency: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <EyeIcon className="size-4" />
          عرض
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>تفاصيل دفعة الاشتراك</DialogTitle>
          <DialogDescription>
            {textOrDash(item.paymentReference, item.paymentId, item.subscriptionId)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <DetailsSection
            title="معلومات الدفع"
            rows={[
              ["مرجع الدفعة", item.paymentReference, true],
              ["رقم الدفعة", item.paymentId, true],
              ["نوع الدفعة", textOrDash(item.paymentTypeLabelAr, item.paymentType)],
              ["نوع الحركة", textOrDash(item.movementTypeLabelAr, item.movementType, "تحصيل")],
              ["قناة المصدر", sourceChannelLabel(item.sourceChannel, item.sourceChannelLabelAr)],
              ["طريقة الدفع", paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr)],
              ["مصدر التصنيف", textOrDash(item.paymentMethodClassificationSourceAr)],
              ["مزود الدفع", paymentProviderLabel(item.paymentProvider ?? item.provider, item.paymentProviderLabelAr ?? item.providerLabelAr)],
              ["طريقة التسجيل", textOrDash(item.recordingModeLabelAr, item.recordingMode)],
              ["بوابة الدفع مستخدمة", textOrDash(item.gatewayUsedLabelAr, formatBooleanAr(item.gatewayUsed))],
              ["رقم عملية المزود", item.providerPaymentId, true],
              ["رقم فاتورة المزود", item.providerInvoiceId, true],
            ]}
          />
          <DetailsSection
            title="المعلومات المالية"
            rows={[
              ["إجمالي الدفعة", formatMoney(item.amountFormattedAr, item.amountHalala, currency)],
              ["صافي الحركة", formatMoney(item.netMovementFormattedAr, item.netMovementHalala, currency)],
              ["الصافي قبل الضريبة", formatMoney(item.netBeforeVatFormattedAr, item.netBeforeVatHalala, currency)],
              ["ضريبة القيمة المضافة", formatMoney(item.vatFormattedAr, item.vatHalala, currency)],
              ["ضريبة المرتجع", formatMoney(item.refundVatFormattedAr, item.refundVatHalala, currency)],
              ["نسبة الضريبة", item.vatPercentage === null || item.vatPercentage === undefined ? "-" : `${item.vatPercentage}%`],
              ["مصدر حساب الضريبة", textOrDash(item.vatCalculationSourceAr)],
              ["المعالجة المحاسبية", textOrDash(item.accountingTreatmentAr)],
            ]}
          />
          <DetailsSection
            title="معلومات العميل والاشتراك"
            rows={[
              ["اسم العميل", item.customerName],
              ["رقم الهاتف", item.customerPhone],
              ["رقم الاشتراك", item.subscriptionId, true],
              ["اسم الخطة", item.planNameAr],
              ["حالة الاشتراك", textOrDash(item.subscriptionStatusLabelAr, item.subscriptionStatus)],
              ["بداية الاشتراك", item.subscriptionStartDate],
              ["نهاية الاشتراك", item.subscriptionEndDate],
              ["عدد الوجبات", item.totalMeals],
              ["الجرامات", item.selectedGrams],
              ["الوجبات اليومية", item.selectedMealsPerDay],
              ["طريقة التنفيذ", fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr)],
              ["الفرع أو منطقة التوصيل", textOrDash(item.deliveryZoneName, item.pickupLocationId)],
            ]}
          />
          <DetailsSection
            title="معلومات التسجيل"
            rows={[
              ["تاريخ العمل", textOrDash(item.businessDateLabelAr, item.businessDate)],
              ["تاريخ الدفع", textOrDash(item.paidAtLabelAr, formatDateTimeAr(item.paidAt))],
              ["تاريخ الاسترداد", textOrDash(item.refundedAtLabelAr, formatDateTimeAr(item.refundedAt))],
              ["رقم المرتجع", textOrDash(item.providerRefundId, item.refundId), true],
              ["محتسب في الإجماليات", formatBooleanAr(item.countedInTotals)],
              ["تاريخ إنشاء السجل", textOrDash(item.createdAtLabelAr, formatDateTimeAr(item.createdAt))],
              ["المحصّل بواسطة", textOrDash(item.collectedBy?.name, item.collectedBy?.email)],
              ["دور المحصّل", textOrDash(item.collectedBy?.roleLabelAr, item.collectedBy?.role)],
            ]}
          />
        </div>
        {item.needsReview ? (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertTitle>العملية تحتاج مراجعة</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {(item.reviewReasonsAr ?? ["سبب المراجعة غير محدد"]).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}
        {item.subscriptionPricing ? (
          <DetailsSection
            title="لقطة تسعير الاشتراك"
            rows={[
              ["الإجمالي المخزن", textOrDash(item.subscriptionPricing.storedTotalFormattedAr, formatSarFromHalala(item.subscriptionPricing.storedTotalHalala, currency))],
              ["سعر الخطة الأساسي", textOrDash(item.subscriptionPricing.basePlanFormattedAr, formatSarFromHalala(item.subscriptionPricing.basePlanHalala, currency))],
              ["الخصم", textOrDash(item.subscriptionPricing.discountFormattedAr, formatSarFromHalala(item.subscriptionPricing.discountHalala, currency))],
              ["رسوم التوصيل", textOrDash(item.subscriptionPricing.deliveryFeeFormattedAr, formatSarFromHalala(item.subscriptionPricing.deliveryFeeHalala, currency))],
            ]}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

type DetailsRow = [label: string, value: unknown, copyable?: boolean];

function DetailsSection({
  title,
  rows,
}: {
  title: string;
  rows: DetailsRow[];
}) {
  return (
    <div className="space-y-3 rounded-2xl border bg-card/95 p-4 text-right">
      <p className="font-semibold">{title}</p>
      <div className="space-y-2">
        {rows.map(([label, value, copyable]) => (
          <div key={label} className="grid grid-cols-[minmax(92px,0.55fr)_minmax(0,1fr)] items-start gap-3 rounded-xl bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-medium" dir="auto">
              <span className="min-w-0 break-words">{formatDisplayValue(value)}</span>
              {copyable && typeof value === "string" && value.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`نسخ ${label}`}
                  onClick={() => void navigator.clipboard?.writeText(value)}
                >
                  <ClipboardCopyIcon className="size-4" />
                </Button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionPaymentsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
