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
  reportErrorMessage,
  textOrDash,
} from "@/features/accounting/accountingFormatters";

const PAGE_SIZES = ["10", "20", "50"] as const;

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
    <section className="space-y-5" aria-labelledby="subscription-payments-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="subscription-payments-title" className="text-xl font-semibold">
            {report.titleAr || "تحصيل الاشتراكات"}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {report.reportType === "monthly"
              ? report.businessMonthLabelAr || report.businessMonth
              : report.businessDateLabelAr || report.businessDate}
            {report.generatedAtLabelAr ? ` · ${report.generatedAtLabelAr}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRetry} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
            تحديث التقرير
          </Button>
          <Button onClick={exportCsv}>
            تصدير CSV
          </Button>
        </div>
      </div>

      <DashboardCards report={report} />
      <SummaryBreakdown report={report} />
      <WarningsAndReconciliation report={report} />
      {report.reportType === "monthly" ? <MonthlySection report={report} /> : null}
      <AccountingPolicyCard report={report} />

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>جدول مدفوعات الاشتراكات</CardTitle>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_120px]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pr-9"
                placeholder="ابحث بالعميل أو الهاتف أو رقم الدفعة أو الاشتراك"
              />
            </div>
            <Select value={methodFilter} onValueChange={(value) => {
              setMethodFilter(value);
              setPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل طرق الدفع</SelectItem>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="visa">فيزا</SelectItem>
                <SelectItem value="unknown">غير مصنف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={(value) => {
              setReviewFilter(value);
              setPage(1);
            }}>
              <SelectTrigger>
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
              <SelectTrigger>
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
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          {card.titleAr || card.labelAr || "مؤشر مالي"}
        </p>
        <p className="text-2xl font-semibold tracking-normal">
          {textOrDash(
            card.valueAr,
            card.amountFormattedAr,
            card.value,
            card.amountHalala === null || card.amountHalala === undefined
              ? undefined
              : formatSarFromHalala(card.amountHalala, currency),
            card.count
          )}
        </p>
        {card.descriptionAr || card.countLabelAr ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {card.descriptionAr || card.countLabelAr}
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
      key: "total",
      titleAr: "إجمالي التحصيل",
      amountHalala: summary?.totalHalala,
      amountFormattedAr: summary?.totalFormattedAr,
      count: summary?.totalPaymentsCount,
    },
    {
      key: "cash",
      titleAr: "التحصيل النقدي",
      amountHalala: summary?.cashTotalHalala,
      amountFormattedAr: summary?.cashTotalFormattedAr,
      count: summary?.cashCount,
    },
    {
      key: "visa",
      titleAr: "تحصيل فيزا",
      amountHalala: summary?.visaTotalHalala,
      amountFormattedAr: summary?.visaTotalFormattedAr,
      count: summary?.visaCount,
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
      <Card>
        <CardHeader>
          <CardTitle>الضريبة وصافي التحصيل</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Metric label="الإجمالي" value={formatMoney(summary?.totalFormattedAr, summary?.totalHalala, currency)} />
          <Metric label="الصافي قبل الضريبة" value={formatMoney(summary?.netBeforeVatFormattedAr, summary?.netBeforeVatHalala, currency)} />
          <Metric label="ضريبة القيمة المضافة" value={formatMoney(summary?.vatFormattedAr, summary?.vatHalala, currency)} />
          <Metric label="عدد العملاء" value={formatInteger(summary?.uniqueCustomersCount)} />
          {summary?.refundsHalala !== null && summary?.refundsHalala !== undefined ? (
            <Metric label="المرتجعات" value={formatMoney(summary.refundsFormattedAr, summary.refundsHalala, currency)} />
          ) : null}
          {summary?.cancelledSubscriptionsCount !== null &&
          summary?.cancelledSubscriptionsCount !== undefined ? (
            <Metric label="اشتراكات ملغاة" value={formatInteger(summary.cancelledSubscriptionsCount)} />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
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
    <div className="rounded-lg border bg-muted/20 p-3">
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
          <div key={bucket.key || index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
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
      <Card>
        <CardHeader>
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
          {summary?.refundsTrackingStatus === "not_available" ? (
            <Alert>
              <AlertTriangleIcon className="size-4" />
              <AlertTitle>
                {summary.refundsTrackingStatusAr || "تتبع المرتجعات غير متاح"}
              </AlertTitle>
              <AlertDescription>
                {summary.refundsTrackingNoteAr ||
                  "تتبع المرتجعات حسب تاريخ الاسترداد غير متاح حاليا."}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
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
    total: (row.totalHalala ?? 0) / 100,
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
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
      <Card>
        <CardHeader>
          <CardTitle>الرسم الشهري للتحصيل اليومي</CardTitle>
        </CardHeader>
        <CardContent>
          {chartRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              لا توجد بيانات يومية للرسم.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="الإجمالي" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
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
    <Card>
      <CardHeader>
        <CardTitle>السياسة المحاسبية المستخدمة</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Metric label="أساس التقرير" value={textOrDash(policy.basis)} />
        <Metric label="وصف الأساس" value={textOrDash(policy.basisDescription)} />
        <Metric label="معالجة الضريبة" value={textOrDash(policy.vatTreatment)} />
        <Metric label="معالجة الإلغاء" value={textOrDash(policy.cancellationTreatment)} />
        <Metric label="معالجة طريقة الدفع" value={textOrDash(policy.paymentMethodTreatment)} />
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">رقم الاشتراك</TableHead>
            <TableHead className="text-right">طريقة الدفع</TableHead>
            <TableHead className="text-right">الإجمالي</TableHead>
            <TableHead className="text-right">الضريبة</TableHead>
            <TableHead className="text-right">طريقة التنفيذ</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">المراجعة</TableHead>
            <TableHead className="text-right">التفاصيل</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.paymentId || item.paymentReference || item.subscriptionId || index}>
              <TableCell>
                <div className="font-medium">{textOrDash(item.customerName)}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {textOrDash(item.customerPhone)}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">
                {textOrDash(item.subscriptionId)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr)}
                </Badge>
              </TableCell>
              <TableCell className="font-semibold">
                {formatMoney(item.amountFormattedAr, item.amountHalala, currency)}
              </TableCell>
              <TableCell>
                {formatMoney(item.vatFormattedAr, item.vatHalala, currency)}
              </TableCell>
              <TableCell>
                {fulfillmentMethodLabel(item.fulfillmentMethod, item.fulfillmentMethodLabelAr)}
              </TableCell>
              <TableCell>{textOrDash(item.statusLabelAr, item.status)}</TableCell>
              <TableCell>
                {item.needsReview ? (
                  <Badge variant="destructive">تحتاج مراجعة</Badge>
                ) : (
                  <Badge variant="outline">لا تحتاج مراجعة</Badge>
                )}
              </TableCell>
              <TableCell>
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
      <DialogContent className="sm:max-w-3xl" dir="rtl">
        <DialogHeader>
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
              ["طريقة الدفع", paymentMethodLabel(item.paymentMethod, item.paymentMethodLabelAr)],
              ["مصدر التصنيف", textOrDash(item.paymentMethodClassificationSourceAr)],
              ["مزود الدفع", textOrDash(item.providerLabelAr, item.provider)],
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
              ["الصافي قبل الضريبة", formatMoney(item.netBeforeVatFormattedAr, item.netBeforeVatHalala, currency)],
              ["ضريبة القيمة المضافة", formatMoney(item.vatFormattedAr, item.vatHalala, currency)],
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
    <div className="space-y-2 rounded-lg border p-3">
      <p className="font-semibold">{title}</p>
      <div className="space-y-2">
        {rows.map(([label, value, copyable]) => (
          <div key={label} className="flex items-start justify-between gap-3 rounded-md bg-muted/20 p-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="flex items-center gap-2 text-left text-sm font-medium" dir="auto">
              {formatDisplayValue(value)}
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
