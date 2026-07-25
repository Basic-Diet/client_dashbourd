import { AlertTriangleIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  asArray,
  asRecord,
  formatDisplayValue,
  legacyLabelFor,
  legacySectionLabels,
  reportErrorMessage,
  textOrDash,
  type ReportRecord,
} from "@/features/accounting/accountingFormatters";

const sectionOrder = ["summary", "money", "reconciliation"] as const;

interface LegacyDailyAccountingReportProps {
  report: ReportRecord;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onExport: () => void;
  isFetching: boolean;
  isExporting: boolean;
}

export function LegacyDailyAccountingReport({
  report,
  isLoading,
  isError,
  error,
  onRetry,
  onExport,
  isFetching,
  isExporting,
}: LegacyDailyAccountingReportProps) {
  if (isLoading) return <LegacySkeleton />;

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangleIcon className="size-4" />
        <AlertTitle>تعذر تحميل التقرير التشغيلي اليومي</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>{reportErrorMessage(error)}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            إعادة المحاولة
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const warnings = asArray(report.warnings);
  const oneTimeOrders = asRecord(report.oneTimeOrders);
  const subscriptions = asRecord(report.subscriptions);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">التقرير التشغيلي اليومي</h2>
          <p className="text-sm text-muted-foreground">
            تاريخ العمل: {formatDisplayValue(report.businessDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{warnings.length} تحذير</Badge>
          <Button variant="outline" onClick={onRetry} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "size-4 animate-spin" : "size-4"} />
            تحديث التقرير
          </Button>
          <Button onClick={onExport} disabled={isExporting}>
            <DownloadIcon className="size-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <Alert>
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>تحذيرات التقرير</AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc">
              {warnings.map((warning, index) => (
                <li key={index}>{formatDisplayValue(warning)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {sectionOrder.map((sectionKey) => (
          <LegacyMetricCard
            key={sectionKey}
            title={legacySectionLabels[sectionKey]}
            record={asRecord(report[sectionKey])}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <LegacyRowsTable
          title="الطلبات الفردية"
          rows={asArray(oneTimeOrders.items)}
          emptyLabel="لا توجد طلبات فردية في التقرير."
        />
        <LegacyRowsTable
          title="الخصومات اليدوية"
          rows={asArray(subscriptions.manualDeductions)}
          emptyLabel="لا توجد خصومات يدوية في التقرير."
        />
      </div>
    </section>
  );
}

function LegacyMetricCard({
  title,
  record,
}: {
  title: string;
  record: ReportRecord;
}) {
  const entries = Object.entries(record)
    .map(([key, value]) => [legacyLabelFor(key), value] as const)
    .filter(([label]) => Boolean(label))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            لا توجد بيانات واضحة لهذا القسم.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {entries.map(([label, value]) => (
              <div key={label || ""} className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-semibold">{formatDisplayValue(value)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegacyRowsTable({
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
      Object.keys(row).forEach((key) => {
        if (legacyLabelFor(key)) set.add(key);
      });
      return set;
    }, new Set<string>())
  ).slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 || columns.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="text-right">
                      {textOrDash(legacyLabelFor(column))}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => (
                      <TableCell key={column}>
                        {formatDisplayValue(row[column])}
                      </TableCell>
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

function LegacySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
