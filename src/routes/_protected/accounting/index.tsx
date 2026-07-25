import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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
import { LegacyDailyAccountingReport } from "@/features/accounting/components/LegacyDailyAccountingReport";
import { SubscriptionPaymentsReport } from "@/features/accounting/components/SubscriptionPaymentsReport";
import {
  useAccountingDailyReportQuery,
  useSubscriptionPaymentDailyReportQuery,
  useSubscriptionPaymentMonthlyReportQuery,
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
} from "@/utils/fetchDashboardSupportData";
import { getCurrentKSAMonth } from "@/utils/ksaDate";
import { asRecord } from "@/features/accounting/accountingFormatters";

export const Route = createFileRoute("/_protected/accounting/")({
  component: AccountingPage,
});

type AccountingTab = "subscription-payments" | "legacy-daily";

const initialDailyParams = resolveSubscriptionPaymentDailyParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});
const initialMonthlyParams = resolveSubscriptionPaymentMonthlyParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});
const initialLegacyParams = resolveAccountingDailyReportParams({
  fulfillmentMethod: "all",
  includeDetails: true,
});

function AccountingPage() {
  const [activeTab, setActiveTab] = useState<AccountingTab>("subscription-payments");
  const [reportMode, setReportMode] =
    useState<SubscriptionPaymentReportMode>("daily");
  const [date, setDate] = useState(initialDailyParams.date);
  const [month, setMonth] = useState(initialMonthlyParams.month);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<SubscriptionPaymentFulfillmentMethod>(
      initialDailyParams.fulfillmentMethod
    );
  const [includeDetails, setIncludeDetails] = useState(true);
  const [legacyDate, setLegacyDate] = useState(String(initialLegacyParams.date));
  const [legacyFulfillmentMethod, setLegacyFulfillmentMethod] =
    useState<string>(String(initialLegacyParams.fulfillmentMethod ?? "all"));
  const [isLegacyExporting, setIsLegacyExporting] = useState(false);

  const dailyParams = useMemo<SubscriptionPaymentDailyParams>(
    () => ({
      date,
      fulfillmentMethod,
      includeDetails,
    }),
    [date, fulfillmentMethod, includeDetails]
  );

  const monthlyParams = useMemo<SubscriptionPaymentMonthlyParams>(
    () => ({
      month,
      fulfillmentMethod,
      includeDetails,
    }),
    [month, fulfillmentMethod, includeDetails]
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
  const legacyQuery = useAccountingDailyReportQuery(
    legacyParams,
    activeTab === "legacy-daily"
  );

  const activeReportQuery = reportMode === "daily" ? dailyQuery : monthlyQuery;

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
    <div className="space-y-5 px-4 py-5 lg:px-6" dir="rtl">
      <AccountingHeader />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as AccountingTab)}
        className="space-y-5"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 lg:w-fit">
          <TabsTrigger value="subscription-payments">
            تحصيل الاشتراكات
          </TabsTrigger>
          <TabsTrigger value="legacy-daily">
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
          />
          <SubscriptionPaymentsReport
            report={activeReportQuery.data?.data}
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

function AccountingHeader() {
  return (
    <Card>
      <CardContent className="p-5 lg:p-6">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-normal lg:text-3xl">
            المحاسبة والتقارير المالية
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            متابعة تحصيل الاشتراكات، ضريبة القيمة المضافة، طرق الدفع،
            التسويات والحالات التي تحتاج مراجعة.
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
}: {
  reportMode: SubscriptionPaymentReportMode;
  onReportModeChange: (mode: SubscriptionPaymentReportMode) => void;
  date: string;
  onDateChange: (date: string) => void;
  month: string;
  onMonthChange: (month: string) => void;
  fulfillmentMethod: SubscriptionPaymentFulfillmentMethod;
  onFulfillmentMethodChange: (value: SubscriptionPaymentFulfillmentMethod) => void;
  includeDetails: boolean;
  onIncludeDetailsChange: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_220px_220px] lg:items-end">
        <div className="space-y-2">
          <Label>نمط التقرير</Label>
          <Tabs
            value={reportMode}
            onValueChange={(value) =>
              onReportModeChange(value as SubscriptionPaymentReportMode)
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="daily">يومي</TabsTrigger>
              <TabsTrigger value="monthly">شهري</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-2">
          <Label htmlFor="subscription-payment-period">
            {reportMode === "daily" ? "التاريخ" : "الشهر"}
          </Label>
          <Input
            id="subscription-payment-period"
            type={reportMode === "daily" ? "date" : "month"}
            value={reportMode === "daily" ? date : month}
            onChange={(event) =>
              reportMode === "daily"
                ? onDateChange(event.target.value)
                : onMonthChange(event.target.value || getCurrentKSAMonth())
            }
          />
        </div>
        <div className="space-y-2">
          <Label>طريقة التنفيذ</Label>
          <Select
            value={fulfillmentMethod}
            onValueChange={(value) =>
              onFulfillmentMethodChange(
                value as SubscriptionPaymentFulfillmentMethod
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pickup">استلام من الفرع</SelectItem>
              <SelectItem value="delivery">توصيل</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>عرض التفاصيل</Label>
          <Select
            value={includeDetails ? "true" : "false"}
            onValueChange={(value) => onIncludeDetailsChange(value === "true")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">مع التفاصيل</SelectItem>
              <SelectItem value="false">ملخص فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-2 lg:max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="legacy-accounting-date">التاريخ</Label>
          <Input
            id="legacy-accounting-date"
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>طريقة التنفيذ</Label>
          <Select
            value={fulfillmentMethod}
            onValueChange={onFulfillmentMethodChange}
          >
            <SelectTrigger>
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
