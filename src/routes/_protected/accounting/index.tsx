import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  Clock3Icon,
  FilterIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { asRecord } from "@/features/accounting/accountingFormatters";
import {
  ACCOUNTING_RANGE_PRESETS,
  adaptRangeReportForDisplay,
  formatAccountingRangeLabel,
  resolveAccountingRangePreset,
  validateAccountingRange,
  type AccountingDateRange,
  type AccountingRangePresetId,
} from "@/features/accounting/accountingRange";
import { AccountingRangeInsights } from "@/features/accounting/components/AccountingRangeInsights";
import { LegacyDailyAccountingReport } from "@/features/accounting/components/LegacyDailyAccountingReport";
import { SubscriptionPaymentsReport } from "@/features/accounting/components/SubscriptionPaymentsReport";
import type { SubscriptionPaymentRangeParams } from "@/features/accounting/accountingRangeTypes";
import {
  useAccountingDailyReportQuery,
  useSubscriptionPaymentDailyReportQuery,
  useSubscriptionPaymentMonthlyReportQuery,
  useSubscriptionPaymentRangeReportQuery,
} from "@/hooks/useDashboardAdminQuery";
import type {
  AccountingDailyReportParams,
  SubscriptionPaymentDailyParams,
  SubscriptionPaymentFulfillmentMethod,
  SubscriptionPaymentMonthlyParams,
  SubscriptionPaymentReportMode,
} from "@/types/dashboardAdminTypes";
import {
  fetchAccountingDailyReportExport,
  resolveAccountingDailyReportParams,
  resolveSubscriptionPaymentDailyParams,
  resolveSubscriptionPaymentMonthlyParams,
  resolveSubscriptionPaymentRangeParams,
} from "@/utils/fetchDashboardSupportData";
import { getCurrentKSAMonth, getTodayKSADate } from "@/utils/ksaDate";

export const Route = createFileRoute("/_protected/accounting/")({
  component: AccountingPage,
});

type AccountingTab = "subscription-payments" | "legacy-daily";
type AccountingReportMode = SubscriptionPaymentReportMode | "range";
type RangePresetSelection = AccountingRangePresetId | "custom";

const PANEL_CLASS = "rounded-2xl bg-card/95 shadow-sm ring-1 ring-foreground/10";

const initialDailyParams = resolveSubscriptionPaymentDailyParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});
const initialMonthlyParams = resolveSubscriptionPaymentMonthlyParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});
const initialRange = resolveAccountingRangePreset("last30", getTodayKSADate());
const initialLegacyParams = resolveAccountingDailyReportParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});

function AccountingPage() {
  const [activeTab, setActiveTab] = useState<AccountingTab>("subscription-payments");
  const [reportMode, setReportMode] = useState<AccountingReportMode>("range");
  const [date, setDate] = useState(initialDailyParams.date);
  const [month, setMonth] = useState(initialMonthlyParams.month);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<SubscriptionPaymentFulfillmentMethod>(initialDailyParams.fulfillmentMethod);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [comparePrevious, setComparePrevious] = useState(true);
  const [rangePreset, setRangePreset] = useState<RangePresetSelection>("last30");
  const [draftRange, setDraftRange] = useState<AccountingDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<AccountingDateRange>(initialRange);
  const [legacyDate, setLegacyDate] = useState(String(initialLegacyParams.date));
  const [legacyFulfillmentMethod, setLegacyFulfillmentMethod] =
    useState<string>(String(initialLegacyParams.fulfillmentMethod ?? "all"));
  const [isLegacyExporting, setIsLegacyExporting] = useState(false);

  const rangeError = validateAccountingRange(draftRange);
  const hasPendingRange =
    draftRange.from !== appliedRange.from || draftRange.to !== appliedRange.to;

  const dailyParams = useMemo<SubscriptionPaymentDailyParams>(
    () => ({ date, fulfillmentMethod, includeDetails }),
    [date, fulfillmentMethod, includeDetails]
  );
  const monthlyParams = useMemo<SubscriptionPaymentMonthlyParams>(
    () => ({ month, fulfillmentMethod, includeDetails }),
    [month, fulfillmentMethod, includeDetails]
  );
  const rangeParams = useMemo<SubscriptionPaymentRangeParams>(
    () =>
      resolveSubscriptionPaymentRangeParams({
        ...appliedRange,
        fulfillmentMethod,
        includeDetails,
        comparePrevious,
      }),
    [appliedRange, comparePrevious, fulfillmentMethod, includeDetails]
  );
  const legacyParams = useMemo<AccountingDailyReportParams>(
    () => ({
      date: legacyDate,
      fulfillmentMethod: legacyFulfillmentMethod,
      includeDetails: true,
    }),
    [legacyDate, legacyFulfillmentMethod]
  );

  const dailyQuery = useSubscriptionPaymentDailyReportQuery(
    dailyParams,
    activeTab === "subscription-payments" && reportMode === "daily"
  );
  const monthlyQuery = useSubscriptionPaymentMonthlyReportQuery(
    monthlyParams,
    activeTab === "subscription-payments" && reportMode === "monthly"
  );
  const rangeQuery = useSubscriptionPaymentRangeReportQuery(
    rangeParams,
    activeTab === "subscription-payments" && reportMode === "range"
  );
  const legacyQuery = useAccountingDailyReportQuery(
    legacyParams,
    activeTab === "legacy-daily"
  );

  const activeReportQuery =
    reportMode === "daily"
      ? dailyQuery
      : reportMode === "monthly"
        ? monthlyQuery
        : rangeQuery;

  const rangeReport = rangeQuery.data?.data;
  const displayReport =
    reportMode === "range" && rangeReport
      ? adaptRangeReportForDisplay(rangeReport)
      : activeReportQuery.data?.data;

  const handlePreset = (preset: AccountingRangePresetId) => {
    const next = resolveAccountingRangePreset(preset, getTodayKSADate());
    setRangePreset(preset);
    setDraftRange(next);
    setAppliedRange(next);
  };

  const applyCustomRange = () => {
    if (rangeError) return;
    setAppliedRange(draftRange);
  };

  const handleLegacyExport = async () => {
    setIsLegacyExporting(true);
    try {
      const blob = await fetchAccountingDailyReportExport(legacyParams);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `daily-accounting-report-${legacyDate}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsLegacyExporting(false);
    }
  };

  return (
    <div className="space-y-5 px-4 py-5 text-right lg:px-6" dir="rtl">
      <AccountingHeader range={appliedRange} reportMode={reportMode} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AccountingTab)}
        className="space-y-5"
        dir="rtl"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted/60 p-1 lg:w-fit lg:min-w-[430px]">
          <TabsTrigger value="subscription-payments" className="gap-2">
            <ReceiptTextIcon className="size-4" />
            تحصيل الاشتراكات
          </TabsTrigger>
          <TabsTrigger value="legacy-daily" className="gap-2">
            <CalendarDaysIcon className="size-4" />
            التقرير التشغيلي اليومي
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription-payments" className="space-y-5">
          <SubscriptionPaymentFilters
            reportMode={reportMode}
            onReportModeChange={setReportMode}
            date={date}
            onDateChange={setDate}
            month={month}
            onMonthChange={setMonth}
            fulfillmentMethod={fulfillmentMethod}
            onFulfillmentMethodChange={setFulfillmentMethod}
            includeDetails={includeDetails}
            onIncludeDetailsChange={setIncludeDetails}
            comparePrevious={comparePrevious}
            onComparePreviousChange={setComparePrevious}
            rangePreset={rangePreset}
            onPreset={handlePreset}
            draftRange={draftRange}
            onDraftRangeChange={(next) => {
              setRangePreset("custom");
              setDraftRange(next);
            }}
            appliedRange={appliedRange}
            rangeError={rangeError}
            hasPendingRange={hasPendingRange}
            onApplyRange={applyCustomRange}
          />

          {reportMode === "range" && rangeReport ? (
            <AccountingRangeInsights report={rangeReport} />
          ) : null}

          <SubscriptionPaymentsReport
            report={displayReport}
            isLoading={activeReportQuery.isLoading}
            isError={activeReportQuery.isError}
            error={activeReportQuery.error}
            onRetry={() => void activeReportQuery.refetch()}
            isFetching={activeReportQuery.isFetching}
          />
        </TabsContent>

        <TabsContent value="legacy-daily" className="space-y-5">
          <LegacyReportFilters
            date={legacyDate}
            onDateChange={setLegacyDate}
            fulfillmentMethod={legacyFulfillmentMethod}
            onFulfillmentMethodChange={setLegacyFulfillmentMethod}
          />
          <LegacyDailyAccountingReport
            report={asRecord(legacyQuery.data?.data)}
            isLoading={legacyQuery.isLoading}
            isError={legacyQuery.isError}
            error={legacyQuery.error}
            onRetry={() => void legacyQuery.refetch()}
            onExport={() => void handleLegacyExport()}
            isFetching={legacyQuery.isFetching}
            isExporting={isLegacyExporting}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountingHeader({
  range,
  reportMode,
}: {
  range: AccountingDateRange;
  reportMode: AccountingReportMode;
}) {
  return (
    <Card className={`${PANEL_CLASS} overflow-hidden`}>
      <CardContent className="relative grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1 bg-primary" />
        <div className="max-w-4xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheckIcon className="size-3.5" />
              قراءة وتحليل فقط
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock3Icon className="size-3.5" />
              توقيت الرياض
            </Badge>
            <Badge variant="outline" className="gap-1">
              <SparklesIcon className="size-3.5" />
              تحليلات مباشرة
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-normal lg:text-3xl">
            المحاسبة والتحليلات المالية
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            راقب التحصيل والمرتجعات والضريبة، قارن الفترات، وافهم مصدر الإيراد
            ومزود الدفع من شاشة واحدة قابلة للتصدير والمراجعة.
          </p>
        </div>
        <div className="rounded-2xl border bg-muted/20 px-5 py-4 text-sm">
          <p className="text-xs text-muted-foreground">النطاق النشط</p>
          <p className="mt-1 font-medium">
            {reportMode === "range"
              ? formatAccountingRangeLabel(range)
              : reportMode === "daily"
                ? "تقرير يوم واحد"
                : "تقرير شهر كامل"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionPaymentFilters({
  reportMode,
  onReportModeChange,
  date,
  onDateChange,
  month,
  onMonthChange,
  fulfillmentMethod,
  onFulfillmentMethodChange,
  includeDetails,
  onIncludeDetailsChange,
  comparePrevious,
  onComparePreviousChange,
  rangePreset,
  onPreset,
  draftRange,
  onDraftRangeChange,
  appliedRange,
  rangeError,
  hasPendingRange,
  onApplyRange,
}: {
  reportMode: AccountingReportMode;
  onReportModeChange: (mode: AccountingReportMode) => void;
  date: string;
  onDateChange: (date: string) => void;
  month: string;
  onMonthChange: (month: string) => void;
  fulfillmentMethod: SubscriptionPaymentFulfillmentMethod;
  onFulfillmentMethodChange: (value: SubscriptionPaymentFulfillmentMethod) => void;
  includeDetails: boolean;
  onIncludeDetailsChange: (value: boolean) => void;
  comparePrevious: boolean;
  onComparePreviousChange: (value: boolean) => void;
  rangePreset: RangePresetSelection;
  onPreset: (preset: AccountingRangePresetId) => void;
  draftRange: AccountingDateRange;
  onDraftRangeChange: (range: AccountingDateRange) => void;
  appliedRange: AccountingDateRange;
  rangeError: string | null;
  hasPendingRange: boolean;
  onApplyRange: () => void;
}) {
  return (
    <Card className={PANEL_CLASS}>
      <CardContent className="space-y-4 p-4 lg:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2 xl:min-w-[360px]">
            <Label className="flex items-center gap-2 text-xs font-medium">
              <FilterIcon className="size-3.5" />
              نوع الفترة
            </Label>
            <Tabs
              value={reportMode}
              onValueChange={(value) => onReportModeChange(value as AccountingReportMode)}
            >
              <TabsList className="grid h-11 w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="daily">يومي</TabsTrigger>
                <TabsTrigger value="monthly">شهري</TabsTrigger>
                <TabsTrigger value="range">نطاق مخصص</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid flex-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">طريقة التنفيذ</Label>
              <Select
                value={fulfillmentMethod}
                onValueChange={(value) =>
                  onFulfillmentMethodChange(value as SubscriptionPaymentFulfillmentMethod)
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل طرق التنفيذ</SelectItem>
                  <SelectItem value="pickup">استلام من الفرع</SelectItem>
                  <SelectItem value="delivery">توصيل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">مستوى التفاصيل</Label>
              <Select
                value={includeDetails ? "true" : "false"}
                onValueChange={(value) => onIncludeDetailsChange(value === "true")}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">التحليلات + كل الحركات</SelectItem>
                  <SelectItem value="false">التحليلات فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">المقارنة</Label>
              <Select
                value={comparePrevious ? "true" : "false"}
                onValueChange={(value) => onComparePreviousChange(value === "true")}
                disabled={reportMode !== "range"}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">مقارنة بالفترة السابقة</SelectItem>
                  <SelectItem value="false">بدون مقارنة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {reportMode === "daily" ? (
          <div className="max-w-md space-y-2">
            <Label htmlFor="subscription-payment-day" className="text-xs font-medium">
              تاريخ التقرير
            </Label>
            <Input
              id="subscription-payment-day"
              type="date"
              value={date}
              className="h-11 text-right"
              onChange={(event) => onDateChange(event.target.value)}
            />
          </div>
        ) : null}

        {reportMode === "monthly" ? (
          <div className="max-w-md space-y-2">
            <Label htmlFor="subscription-payment-month" className="text-xs font-medium">
              شهر التقرير
            </Label>
            <Input
              id="subscription-payment-month"
              type="month"
              value={month}
              className="h-11 text-right"
              onChange={(event) => onMonthChange(event.target.value || getCurrentKSAMonth())}
            />
          </div>
        ) : null}

        {reportMode === "range" ? (
          <div className="space-y-4 rounded-2xl border bg-muted/10 p-4">
            <div className="flex flex-wrap gap-2">
              {ACCOUNTING_RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={rangePreset === preset.id ? "default" : "outline"}
                  onClick={() => onPreset(preset.id)}
                  title={preset.description}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="accounting-range-from" className="text-xs font-medium">
                  من تاريخ
                </Label>
                <Input
                  id="accounting-range-from"
                  type="date"
                  value={draftRange.from}
                  className="h-11 text-right"
                  onChange={(event) =>
                    onDraftRangeChange({ ...draftRange, from: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accounting-range-to" className="text-xs font-medium">
                  إلى تاريخ
                </Label>
                <Input
                  id="accounting-range-to"
                  type="date"
                  value={draftRange.to}
                  className="h-11 text-right"
                  onChange={(event) =>
                    onDraftRangeChange({ ...draftRange, to: event.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                className="h-11 min-w-36"
                disabled={Boolean(rangeError) || !hasPendingRange}
                onClick={onApplyRange}
              >
                <CalendarRangeIcon className="size-4" />
                تطبيق النطاق
              </Button>
            </div>

            <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className={rangeError ? "text-destructive" : "text-muted-foreground"}>
                {rangeError ||
                  (hasPendingRange
                    ? "تم تعديل التواريخ. اضغط تطبيق النطاق لتحديث كل التحليلات."
                    : `النطاق المطبق: ${formatAccountingRangeLabel(appliedRange)}`)}
              </p>
              <Badge variant={hasPendingRange ? "outline" : "secondary"} className="w-fit">
                {hasPendingRange ? "تغييرات غير مطبقة" : "التحليلات محدثة"}
              </Badge>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LegacyReportFilters({
  date,
  onDateChange,
  fulfillmentMethod,
  onFulfillmentMethodChange,
}: {
  date: string;
  onDateChange: (date: string) => void;
  fulfillmentMethod: string;
  onFulfillmentMethodChange: (value: string) => void;
}) {
  return (
    <Card className={PANEL_CLASS}>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2 lg:max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="legacy-accounting-date" className="text-xs font-medium">
            التاريخ
          </Label>
          <Input
            id="legacy-accounting-date"
            type="date"
            value={date}
            className="h-11 text-right"
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">طريقة التنفيذ</Label>
          <Select value={fulfillmentMethod} onValueChange={onFulfillmentMethodChange}>
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pickup">استلام من الفرع</SelectItem>
              <SelectItem value="delivery">توصيل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
