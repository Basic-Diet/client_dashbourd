import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  addonBasePlanPickerQueryOptions,
  addonProductPickerQueryOptions,
  addonsQueryOptions,
} from "@/hooks/useAddonsQuery";
import { Loader } from "@/components/global/loader";
import { ToastMessage } from "@/components/global/ToastMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Archive,
  Edit3,
  PackagePlus,
  PieChartIcon,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  Utensils,
  X,
} from "lucide-react";
import type {
  Addon,
  AddonCategoryOption,
  AddonPlanWritePayload,
} from "@/types/addonTypes";
import { AddonPlanDialog } from "@/components/pages/addons/AddonPlanDialog";
import {
  addonId,
  localizedName,
} from "@/components/pages/addons/addon-plan-form-utils";
import { createAddonPlan, updateAddonPlan } from "@/utils/fetchAddons";
import { fetchDeleteAddon } from "@/utils/fetchDeleteAddon";
import { toggleAddonItem } from "@/utils/fetchUpdateAddon";
import { useAuth } from "@/hooks/useAuth";
import { canManageAddonPlans } from "@/lib/rolePermissions";

const chartConfig = {
  active: {
    label: "نشطة",
    color: "var(--chart-1)",
  },
  inactive: {
    label: "غير نشطة",
    color: "var(--chart-4)",
  },
  value: {
    label: "العدد",
    color: "var(--chart-2)",
  },
  products: {
    label: "المنتجات",
    color: "var(--chart-3)",
  },
  prices: {
    label: "الأسعار",
    color: "var(--chart-5)",
  },
  linked: {
    label: "الربط",
    color: "var(--chart-3)",
  },
  categories: {
    label: "التصنيفات",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export const Route = createFileRoute("/_protected/addons/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(addonsQueryOptions()),
      context.queryClient.ensureQueryData(addonProductPickerQueryOptions()),
      context.queryClient.ensureQueryData(addonBasePlanPickerQueryOptions()),
    ]);
  },
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل باقات الإضافات..." />
  ),
});

function RouteComponent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: addonsResponse } = useSuspenseQuery(addonsQueryOptions());
  const { data: productPicker } = useSuspenseQuery(
    addonProductPickerQueryOptions()
  );
  const { data: basePlanPicker } = useSuspenseQuery(
    addonBasePlanPickerQueryOptions()
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Addon | null>(null);
  const [archivePlan, setArchivePlan] = useState<Addon | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const plans = addonsResponse.data;
  const products = productPicker.data;
  const basePlans = basePlanPicker.data;
  const categories = addonsResponse.meta.addonPlanCategories;
  const summaryPlansCount = addonsResponse.summary.plansCount ?? plans.length;
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const inactivePlans = Math.max(0, summaryPlansCount - activePlans);
  const linkedProductsCount = new Set(
    plans.flatMap((plan) => plan.menuProductIds)
  ).size;
  const matrixRowsCount =
    addonsResponse.summary.matrixRowsCount ||
    plans.reduce((total, plan) => total + plan.planPrices.length, 0);

  const categoryRows = useMemo(
    () => toCategoryRows(plans, categories),
    [categories, plans]
  );
  const planRows = useMemo(() => toPlanRows(plans), [plans]);
  const filteredPlans = useMemo(
    () =>
      plans.filter((plan) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          [
            plan.name.ar,
            plan.name.en,
            plan.category,
            ...plan.menuProducts.map((product) => localizedName(product.name)),
          ]
            .join(" ")
            .toLowerCase()
            .includes(search);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && plan.isActive) ||
          (statusFilter === "inactive" && !plan.isActive);
        const matchesCategory =
          categoryFilter === "all" || plan.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [categoryFilter, plans, searchTerm, statusFilter]
  );
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all";
  const canWrite = canManageAddonPlans(user?.role);

  const invalidateAddons = async () => {
    await queryClient.invalidateQueries({ queryKey: ["addons"] });
  };

  const createMutation = useMutation({
    mutationFn: createAddonPlan,
    onSuccess: async () => {
      ToastMessage("تم إنشاء باقة الإضافة بنجاح.", "success");
      await invalidateAddons();
      setDialogOpen(false);
      setEditingPlan(null);
      setDialogError(null);
    },
    onError: (error) => {
      setDialogError(errorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AddonPlanWritePayload;
    }) => updateAddonPlan(id, payload),
    onSuccess: async () => {
      ToastMessage("تم تحديث باقة الإضافة بنجاح.", "success");
      await invalidateAddons();
      setDialogOpen(false);
      setEditingPlan(null);
      setDialogError(null);
    },
    onError: (error) => {
      setDialogError(errorMessage(error));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleAddonItem(id),
    onSuccess: async () => {
      ToastMessage("تم تحديث حالة الباقة.", "success");
      await invalidateAddons();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => fetchDeleteAddon(id),
    onSuccess: async () => {
      ToastMessage("تم أرشفة الباقة بأمان.", "success");
      await invalidateAddons();
      setArchivePlan(null);
    },
  });

  const openCreate = () => {
    setEditingPlan(null);
    setDialogError(null);
    setDialogOpen(true);
  };

  const openEdit = (plan: Addon) => {
    setEditingPlan(plan);
    setDialogError(null);
    setDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isMutating =
    isSaving || toggleMutation.isPending || archiveMutation.isPending;

  return (
    <>
      <div className="space-y-5 px-4 lg:px-6" dir="rtl">
        <section className="rounded-lg border bg-background">
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <PackagePlus className="size-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">
                  باقات الإضافات
                </h1>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  اربط منتجات المنيو الجاهزة بباقات إضافية، وحدد سعر كل باقة
                  حسب خطة الاشتراك الأساسية.
                </p>
              </div>
            </div>
            {canWrite ? (
            <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
              <Plus className="size-4" />
              باقة جديدة
            </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4">
          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChartIcon className="size-4 text-primary" />
                نظرة تشغيلية
              </CardTitle>
              <CardDescription>
                ملخص سريع لحالة الباقات والمنتجات والأسعار المرتبطة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricRadial
                    label="كل الباقات"
                    value={summaryPlansCount}
                    total={Math.max(summaryPlansCount, 1)}
                    colorKey="value"
                  />
                  <MetricRadial
                    label="نشطة"
                    value={activePlans}
                    total={Math.max(summaryPlansCount, 1)}
                    colorKey="active"
                  />
                  <MetricRadial
                    label="منتجات مرتبطة"
                    value={linkedProductsCount}
                    total={Math.max(products.length, linkedProductsCount, 1)}
                    colorKey="linked"
                  />
                  <MetricRadial
                    label="صفوف أسعار"
                    value={matrixRowsCount}
                    total={Math.max(plans.length * basePlans.length, matrixRowsCount, 1)}
                    colorKey="prices"
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <StatusChart active={activePlans} inactive={inactivePlans} />
                  <CategoryChart rows={categoryRows} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">أقوى الباقات</CardTitle>
              <CardDescription>
                مقارنة سريعة بعدد المنتجات وصفوف الأسعار لكل باقة.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlanBars rows={planRows} />
            </CardContent>
          </Card>
        </section>

        <FiltersPanel
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          categories={categories}
          resultCount={filteredPlans.length}
          totalCount={summaryPlansCount}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearchTerm}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
          onReset={() => {
            setSearchTerm("");
            setStatusFilter("all");
            setCategoryFilter("all");
          }}
        />

        {plans.length === 0 ? (
          <EmptyState
            categories={categories}
            matrixRowsCount={matrixRowsCount}
            plansCount={summaryPlansCount}
            canWrite={canWrite}
            onCreate={openCreate}
          />
        ) : filteredPlans.length === 0 ? (
          <NoFilterResults onReset={() => {
            setSearchTerm("");
            setStatusFilter("all");
            setCategoryFilter("all");
          }} />
        ) : (
          <section className="grid gap-4 2xl:grid-cols-2">
            {filteredPlans.map((plan) => (
              <AddonPlanCard
                key={addonId(plan)}
                plan={plan}
                isMutating={isMutating}
                canWrite={canWrite}
                onEdit={() => openEdit(plan)}
                onToggle={() => toggleMutation.mutate(addonId(plan))}
                onArchive={() => setArchivePlan(plan)}
              />
            ))}
          </section>
        )}
      </div>

      {canWrite && dialogOpen ? (
        <AddonPlanDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPlan(null);
              setDialogError(null);
            }
          }}
          plan={editingPlan}
          products={products}
          basePlans={basePlans}
          categories={categories}
          isSaving={isSaving}
          serverError={dialogError}
          onSubmit={(payload) => {
            if (isSaving) return;
            setDialogError(null);
            if (editingPlan) {
              updateMutation.mutate({ id: addonId(editingPlan), payload });
            } else {
              createMutation.mutate(payload);
            }
          }}
        />
      ) : null}

      {canWrite ? (
      <AlertDialog
        open={!!archivePlan}
        onOpenChange={(open) => {
          if (!open) setArchivePlan(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>أرشفة باقة الإضافة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إخفاء الباقة من القائمة الافتراضية بدون حذف البيانات
              التاريخية أو سجلات الاشتراكات السابقة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={archiveMutation.isPending || !archivePlan}
              onClick={() => {
                if (archivePlan) archiveMutation.mutate(addonId(archivePlan));
              }}
            >
              أرشفة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      ) : null}
    </>
  );
}

function MetricRadial({
  label,
  value,
  total,
  colorKey,
}: {
  label: string;
  value: number;
  total: number;
  colorKey: keyof typeof chartConfig;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const rows = [
    {
      name: label,
      value: percent,
      fill: `var(--color-${String(colorKey)})`,
    },
  ];

  return (
    <div className="grid min-h-32 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg border bg-muted/15 p-3">
      <ChartContainer config={chartConfig} className="h-20 w-20">
        <RadialBarChart
          data={rows}
          startAngle={90}
          endAngle={-270}
          innerRadius={30}
          outerRadius={40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: "var(--muted)" }}
            cornerRadius={8}
            isAnimationActive
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatNumber(percent)}٪ من المرجع
        </p>
      </div>
    </div>
  );
}

function StatusChart({ active, inactive }: { active: number; inactive: number }) {
  const legendRows = [
    { key: "active", label: "نشطة", value: active, fill: "var(--color-active)" },
    {
      key: "inactive",
      label: "غير نشطة",
      value: inactive,
      fill: "var(--color-inactive)",
    },
  ];
  const chartRows = legendRows.filter((row) => row.value > 0);

  if (active + inactive === 0) {
    return <ChartEmpty title="لا توجد حالات لعرضها" />;
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="mb-2 text-sm font-medium">توزيع الحالة</p>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="label" />}
          />
          <Pie
            data={chartRows}
            dataKey="value"
            nameKey="label"
            innerRadius={42}
            outerRadius={68}
            paddingAngle={3}
            strokeWidth={2}
            isAnimationActive
          >
            {chartRows.map((row) => (
              <Cell key={row.key} fill={row.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ChartLegendMini rows={legendRows} />
    </div>
  );
}

function CategoryChart({ rows }: { rows: ChartRow[] }) {
  if (rows.length === 0) {
    return <ChartEmpty title="لا توجد تصنيفات بعد" />;
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="mb-2 text-sm font-medium">الباقات حسب التصنيف</p>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={0}
          />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltipContent hideLabel nameKey="label" />}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive>
            {rows.map((row, index) => (
              <Cell
                key={row.key}
                fill={`var(--chart-${(index % 5) + 1})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-2 grid gap-1">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <span
                className="size-2.5 rounded-[3px]"
                style={{ backgroundColor: `var(--chart-${(index % 5) + 1})` }}
              />
              <span className="truncate">{row.label}</span>
            </span>
            <span className="text-sm font-medium tabular-nums">
              {formatNumber(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanBars({ rows }: { rows: PlanChartRow[] }) {
  if (rows.length === 0) {
    return <ChartEmpty title="لا توجد باقات كافية للمقارنة" />;
  }

  const maxValue = Math.max(
    ...rows.flatMap((row) => [row.products, row.prices]),
    1
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-[var(--chart-3)]" />
          المنتجات المرتبطة
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-[var(--chart-5)]" />
          صفوف الأسعار
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-lg border bg-muted/15 p-4"
            title={row.label}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">مقارنة داخل الباقة</p>
              </div>
              <Badge variant="outline">
                {formatNumber(row.products + row.prices)}
              </Badge>
            </div>
            <ComparisonBar
              label="المنتجات"
              value={row.products}
              maxValue={maxValue}
              className="bg-[var(--chart-3)]"
            />
            <ComparisonBar
              label="الأسعار"
              value={row.prices}
              maxValue={maxValue}
              className="bg-[var(--chart-5)]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  maxValue,
  className,
}: {
  label: string;
  value: number;
  maxValue: number;
  className: string;
}) {
  const width = `${Math.max(4, Math.round((value / maxValue) * 100))}%`;

  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${className}`}
          style={{ width }}
        />
      </div>
      <span className="text-left text-sm font-medium tabular-nums">
        {formatNumber(value)}
      </span>
    </div>
  );
}

function ChartLegendMini({
  rows,
}: {
  rows: Array<{ key: string; label: string; value: number; fill: string }>;
}) {
  return (
    <div className="mt-2 grid gap-1">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: row.fill }}
            />
            {row.label}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {formatNumber(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartEmpty({ title }: { title: string }) {
  return (
    <div className="flex h-44 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-2xl font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({
  categories,
  matrixRowsCount,
  plansCount,
  canWrite,
  onCreate,
}: {
  categories: AddonCategoryOption[];
  matrixRowsCount: number;
  plansCount: number;
  canWrite: boolean;
  onCreate: () => void;
}) {
  return (
    <section className="rounded-lg border border-dashed bg-muted/20 p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border">
              <Utensils className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">لا توجد باقات إضافات منشأة</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                استجاب الخادم بنجاح ولا توجد باقات إضافات محفوظة حاليا. التصنيفات
                المتاحة من الخادم ظاهرة بالأسفل ويمكن استخدامها عند إنشاء أول باقة.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.key}
                className="rounded-lg border bg-background p-4"
              >
                <p className="font-medium">{localizedName(category.label)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(category.key)}
                </p>
              </div>
            ))}
            {categories.length === 0 ? (
              <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                لا توجد تصنيفات إضافات في استجابة الخادم.
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-56 lg:grid-cols-1">
          <SummaryTile label="الباقات" value={plansCount} />
          <SummaryTile label="صفوف الأسعار" value={matrixRowsCount} />
          {canWrite ? (
          <Button onClick={onCreate} className="gap-2">
            <Plus className="size-4" />
            إنشاء باقة
          </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FiltersPanel({
  searchTerm,
  statusFilter,
  categoryFilter,
  categories,
  resultCount,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onReset,
}: {
  searchTerm: string;
  statusFilter: string;
  categoryFilter: string;
  categories: AddonCategoryOption[];
  resultCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(16rem,1fr)_12rem_14rem]">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              البحث
            </Label>
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث باسم الباقة أو المنتج أو التصنيف"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              الحالة
            </Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشطة فقط</SelectItem>
                <SelectItem value="inactive">غير نشطة فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {localizedName(category.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="h-9 px-3">
            {formatNumber(resultCount)} من {formatNumber(totalCount)} باقة
          </Badge>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={onReset} className="gap-2">
              <X className="size-4" />
              مسح الفلاتر
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function NoFilterResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <Search className="size-8 text-muted-foreground" />
      <h2 className="mt-4 text-base font-semibold">لا توجد نتائج مطابقة</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
        جرّب تغيير البحث أو الحالة أو التصنيف لعرض باقات أكثر.
      </p>
      <Button onClick={onReset} variant="outline" className="mt-5 gap-2">
        <X className="size-4" />
        مسح الفلاتر
      </Button>
    </div>
  );
}

function AddonPlanCard({
  plan,
  isMutating,
  canWrite,
  onEdit,
  onToggle,
  onArchive,
}: {
  plan: Addon;
  isMutating: boolean;
  canWrite: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
}) {
  return (
    <Card className="overflow-hidden shadow-none transition-colors hover:border-primary/35">
      <CardHeader className="border-b bg-muted/15 pb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{localizedName(plan.name)}</CardTitle>
              <Badge variant={plan.isActive ? "default" : "secondary"}>
                {plan.isActive ? "نشطة" : "غير نشطة"}
              </Badge>
              <Badge variant="outline">{categoryLabel(plan.category)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {plan.name.en || plan.name.ar}
            </p>
          </div>
          {canWrite ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isMutating}
              onClick={onEdit}
              title="تعديل"
            >
              <Edit3 className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isMutating}
              onClick={onToggle}
              title="تفعيل أو إيقاف"
            >
              <Power className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={isMutating}
              onClick={onArchive}
              title="أرشفة"
            >
              <Archive className="size-4" />
            </Button>
          </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <PlanStat label="الحد اليومي" value={plan.maxPerDay ?? 1} />
          <PlanStat label="منتجات مرتبطة" value={plan.menuProductIds.length} />
          <PlanStat label="أسعار الباقات" value={plan.planPrices.length} />
        </div>

        <section className="space-y-2">
          <p className="text-sm font-medium">المنتجات المرتبطة</p>
          {plan.menuProducts.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/15 p-3 text-sm text-muted-foreground">
              لا توجد تفاصيل منتجات من الخادم، لكن يوجد{" "}
              {formatNumber(plan.menuProductIds.length)} معرفات مرتبطة.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plan.menuProducts.map((product) => (
                <Badge key={product.id} variant="secondary" className="h-7">
                  {localizedName(product.name)}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الخطة الأساسية</TableHead>
                <TableHead className="text-right">الأيام</TableHead>
                <TableHead className="text-right">الوجبات</TableHead>
                <TableHead className="text-right">السعر</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.planPrices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-20 text-center text-sm text-muted-foreground"
                  >
                    لا توجد أسعار مرتبطة بهذه الباقة.
                  </TableCell>
                </TableRow>
              ) : (
                plan.planPrices.map((price) => (
                  <TableRow key={price.basePlanId}>
                    <TableCell>{localizedName(price.basePlanName)}</TableCell>
                    <TableCell>{price.daysCount ?? "-"}</TableCell>
                    <TableCell>{price.mealsCount ?? "-"}</TableCell>
                    <TableCell>
                      {price.priceLabel ??
                        `${formatNumber(price.priceHalala / 100)} ر.س`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={price.isActive ? "outline" : "secondary"}>
                        {price.isActive ? "نشط" : "متوقف"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-lg font-semibold tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

type ChartRow = {
  key: string;
  label: string;
  shortLabel: string;
  value: number;
};

type PlanChartRow = {
  key: string;
  label: string;
  shortLabel: string;
  products: number;
  prices: number;
};

function toCategoryRows(
  plans: Addon[],
  categoryOptions: AddonCategoryOption[] = []
): ChartRow[] {
  const labels = new Map(
    categoryOptions.map((category) => [
      String(category.key),
      localizedName(category.label),
    ])
  );
  const counts = new Map<string, number>(
    categoryOptions.map((category) => [String(category.key), 0])
  );

  plans.forEach((plan) => {
    counts.set(plan.category, (counts.get(plan.category) ?? 0) + 1);
  });

  return Array.from(counts.entries()).map(([key, value]) => ({
    key,
    label: labels.get(key) || categoryLabel(key),
    shortLabel: compactLabel(labels.get(key) || categoryLabel(key), 9),
    value,
  }));
}

function toPlanRows(plans: Addon[]): PlanChartRow[] {
  return plans.map((plan) => {
    const label = localizedName(plan.name);
    return {
      key: addonId(plan),
      label,
      shortLabel: compactLabel(label, 12),
      products: plan.menuProductIds.length,
      prices: plan.planPrices.length,
    };
  });
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    juice: "عصائر",
    snack: "سناك",
    small_salad: "سلطة صغيرة",
  };

  return labels[category] ?? category.replaceAll("_", " ");
}

function compactLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const response = "response" in error ? error.response : undefined;
    if (response && typeof response === "object" && "data" in response) {
      const data = response.data;
      if (data && typeof data === "object") {
        if ("message" in data && typeof data.message === "string") {
          return data.message;
        }
        if ("error" in data && typeof data.error === "string") {
          return data.error;
        }
      }
    }

    if ("message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return "تعذر تنفيذ العملية. تحقق من البيانات وحاول مرة أخرى.";
}
