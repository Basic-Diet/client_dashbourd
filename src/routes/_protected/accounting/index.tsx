import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BanknoteIcon,
  CreditCardIcon,
  DownloadIcon,
  ReceiptTextIcon,
  RefreshCwIcon,
  WalletCardsIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useAccountingDailyReportQuery,
  useSubscriptionPaymentDailyReportQuery,
} from "@/hooks/useDashboardAdminQuery";
import type {
  AccountingDailyReportParams,
  SubscriptionPaymentDailyReportData,
  SubscriptionPaymentReportItem,
  SubscriptionPaymentSummary,
} from "@/types/dashboardAdminTypes";
import {
  fetchAccountingDailyReportExport,
  resolveAccountingDailyReportParams,
} from "@/utils/fetchDashboardSupportData";

 type ReportRecord = Record<string, unknown>;

const initialParams = resolveAccountingDailyReportParams({
  includeDetails: true,
  fulfillmentMethod: "all",
});

const EMPTY_PAYMENT_SUMMARY: SubscriptionPaymentSummary = {
  totalPaymentsCount: 0,
  uniqueCustomersCount: 0,
  totalHalala: 0,
  cashCount: 0,
  cashCustomersCount: 0,
  cashTotalHalala: 0,
  visaCount: 0,
  visaCustomersCount: 0,
  visaTotalHalala: 0,
  unknownCount: 0,
  unknownTotalHalala: 0,
};

const asRecord = (value: unknown): ReportRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as ReportRecord)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return Intl.NumberFormat("ar-SA").format(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const titleFromKey = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const previewEntries = (record: ReportRecord, limit = 6) =>
  Object.entries(record).slice(0, limit);

function formatSar(halala: number, currency = "SAR") {
  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(halala || 0) / 100);
  } catch {
    return `${(Number(halala || 0) / 100).toFixed(2)} ${currency}`;
  }
}

function readText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "-";
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function paymentMethodLabel(value: unknown) {
  return value === "visa" ? "فيزا" : value === "cash" ? "كاش" : "غير محدد";
}

function fulfillmentLabel(value: unknown) {
  return value === "delivery"
    ? "توصيل"
    : value === "pickup"
      ? "استلام من الفرع"
      : readText(value);
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const Route = createFileRoute("/_protected/accounting/")({
  component: AccountingPage,
});

function AccountingPage() {
  const [date, setDate] = useState(String(initialParams.date));
  const [fulfillmentMethod, setFulfillmentMethod] = useState(
    String(initialParams.fulfillmentMethod)
  );
  const [isExporting, setIsExporting] = useState(false);

  const params = useMemo<AccountingDailyReportParams>(
    () => ({
      date,
      fulfillmentMethod,
      includeDetails: true,
    }),
    [date, fulfillmentMethod]
  );
  const accountingQuery = useAccountingDailyReportQuery(params);
  const subscriptionPaymentsQuery = useSubscriptionPaymentDailyReportQuery(params);
  const report = asRecord(accountingQuery.data?.data);
  const paymentReport = subscriptionPaymentsQuery.data?.data;
  const isFetching = accountingQuery.isFetching || subscriptionPaymentsQuery.isFetching;

  const handleRefresh = async () => {
    await Promise.all([
      accountingQuery.refetch(),
      subscriptionPaymentsQuery.refetch(),
    ]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await fetchAccountingDailyReportExport(params);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `daily-accounting-report-${date}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 px-4 py-5 lg:px-6" dir="rtl">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between lg:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">التقارير المحاسبية اليومية</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            متابعة مدفوعات الاشتراكات كاش وفيزا مع تقرير التسويات اليومي.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="accounting-date">التاريخ</Label>
            <Input
              id="accounting-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>طريقة الاستلام</Label>
            <Select value={fulfillmentMethod} onValueChange={setFulfillmentMethod}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pickup">استلام من الفرع</SelectItem>
                <SelectItem value="delivery">توصيل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
            {isFetching ? "جاري التحديث" : "تحديث"}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || accountingQuery.isLoading}
          >
            <DownloadIcon className="size-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {subscriptionPaymentsQuery.isLoading ? (
        <SubscriptionPaymentsSkeleton />
      ) : subscriptionPaymentsQuery.isError ? (
        <Alert variant="destructive">
          <ReceiptTextIcon className="size-4" />
          <AlertTitle>تعذر تحميل مدفوعات الاشتراكات</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>قد لا تملك صلاحية التقرير أو تعذر الاتصال بالخادم.</span>
            <Button size="sm" variant="outline" onClick={() => subscriptionPaymentsQuery.refetch()}>
              إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <SubscriptionPaymentsReport report={paymentReport} />
      )}

      {accountingQuery.isLoading ? (
        <AccountingSkeleton />
      ) : accountingQuery.isError ? (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            تعذر تحميل تقرير المحاسبة اليومي.
          </CardContent>
        </Card>
      ) : (
        <AccountingReport report={report} />
      )}
    </div>
  );
}

function SubscriptionPaymentsReport({
  report,
}: {
  report?: SubscriptionPaymentDailyReportData;
}) {
  const summary = report?.summary ?? EMPTY_PAYMENT_SUMMARY;
  const currency = report?.currency || "SAR";
  const items = Array.isArray(report?.items) ? report.items : [];

  return (
    <section className="space-y-4" aria-labelledby="subscription-payments-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="subscription-payments-title" className="text-lg font-semibold">
            مدفوعات الاشتراكات
          </h2>
          <p className="text-sm text-muted-foreground">
            تاريخ العمل: {report?.businessDate || "-"}
          </p>
        </div>
        <Badge variant="outline">القيم معروضة بالريال السعودي</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PaymentSummaryCard
          title="إجمالي مدفوعات الاشتراكات"
          icon={WalletCardsIcon}
          count={summary.totalPaymentsCount}
          customers={summary.uniqueCustomersCount}
          total={summary.totalHalala}
          currency={currency}
        />
        <PaymentSummaryCard
          title="كاش"
          icon={BanknoteIcon}
          count={summary.cashCount}
          customers={summary.cashCustomersCount}
          total={summary.cashTotalHalala}
          currency={currency}
        />
        <PaymentSummaryCard
          title="فيزا"
          icon={CreditCardIcon}
          count={summary.visaCount}
          customers={summary.visaCustomersCount}
          total={summary.visaTotalHalala}
          currency={currency}
        />
      </div>

      <SubscriptionPaymentsTable items={items} currency={currency} />
    </section>
  );
}

function PaymentSummaryCard({
  title,
  icon: Icon,
  count,
  customers,
  total,
  currency,
}: {
  title: string;
  icon: typeof WalletCardsIcon;
  count: number;
  customers: number;
  total: number;
  currency: string;
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">إجمالي المبلغ</p>
          </div>
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
        </div>
        <p className="text-2xl font-bold text-primary">{formatSar(total, currency)}</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">عدد العمليات</p>
            <p className="mt-1 font-semibold">{formatValue(count)}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">عدد العملاء</p>
            <p className="mt-1 font-semibold">{formatValue(customers)}</p>
          </div>
        </div>
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
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader>
        <CardTitle>تفاصيل مدفوعات الاشتراكات</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            لا توجد عمليات دفع اشتراكات مطابقة للفلاتر الحالية.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">رقم الاشتراك</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">إجمالي المبلغ</TableHead>
                  <TableHead className="text-right">طريقة الاستلام</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">سجله</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const record = asRecord(item);
                  const customer = asRecord(record.customer);
                  const payment = asRecord(record.payment);
                  const metadata = asRecord(record.metadata);
                  return (
                    <TableRow key={readText(record.id, payment.id, record.subscriptionId, index)}>
                      <TableCell className="font-medium">
                        {readText(record.customerName, customer.name, customer.fullName)}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {readText(record.customerPhone, customer.phone)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {readText(record.subscriptionId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {paymentMethodLabel(record.paymentMethod ?? record.method ?? payment.method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatSar(
                          readNumber(record.amountHalala, payment.amountHalala, payment.amount),
                          currency
                        )}
                      </TableCell>
                      <TableCell>
                        {fulfillmentLabel(record.fulfillmentMethod)}
                      </TableCell>
                      <TableCell>{formatDateTime(record.paidAt ?? payment.paidAt)}</TableCell>
                      <TableCell>
                        {readText(record.recordedBy, metadata.recordedBy, payment.recordedBy)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountingReport({ report }: { report: ReportRecord }) {
  const summary = asRecord(report.summary);
  const money = asRecord(report.money);
  const oneTimeOrders = asRecord(report.oneTimeOrders);
  const subscriptions = asRecord(report.subscriptions);
  const reconciliation = asRecord(report.reconciliation);
  const orderItems = asArray(oneTimeOrders.items);
  const manualDeductions = asArray(subscriptions.manualDeductions);
  const warnings = asArray(report.warnings);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">تاريخ العمل</p>
            <p className="text-xl font-semibold tracking-normal">
              {formatValue(report.businessDate)}
            </p>
          </div>
          <Badge variant="outline">{warnings.length} تحذير</Badge>
        </CardContent>
      </Card>

      {warnings.length > 0 ? (
        <Alert>
          <ReceiptTextIcon className="size-4" />
          <AlertTitle>تحذيرات الخادم</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {warnings.map((warning, index) => (
                <li key={index}>{formatValue(warning)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <MetricGrid title="الملخص" record={summary} />
      <MetricGrid title="القيم المالية" record={money} />
      <MetricGrid title="التسوية" record={reconciliation} />

      <div className="grid gap-4 xl:grid-cols-2">
        <RecordTable
          title="الطلبات الفردية"
          rows={orderItems}
          emptyLabel="لا توجد طلبات فردية في التقرير."
        />
        <RecordTable
          title="الخصومات اليدوية"
          rows={manualDeductions}
          emptyLabel="لا توجد خصومات يدوية في التقرير."
        />
      </div>
    </div>
  );
}

function MetricGrid({ title, record }: { title: string; record: ReportRecord }) {
  const entries = previewEntries(record, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد بيانات.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">{titleFromKey(key)}</p>
                <p className="mt-2 text-2xl font-semibold tracking-normal">
                  {formatValue(value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: unknown[];
  emptyLabel: string;
}) {
  const records = rows.map(asRecord);
  const columns = Array.from(
    records.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  ).slice(0, 7);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 || columns.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{titleFromKey(column)}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={column}>{formatValue(row[column])}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SubscriptionPaymentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function AccountingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
