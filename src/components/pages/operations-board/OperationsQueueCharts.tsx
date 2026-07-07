import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getOperationsOrderTypeLabel } from "@/lib/operationsBoard";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";

const chartConfig = {
  count: {
    label: "العدد",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatNumber(value: number) {
  return value.toLocaleString("ar-EG");
}

function formatAxisLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

function getStatusLabel(item: UnifiedQueueItem) {
  return item.statusLabel || item.ui?.label || item.status || "غير محدد";
}

function getSourceLabel(item: UnifiedQueueItem) {
  return getOperationsOrderTypeLabel(item);
}

function aggregateByLabel<T>(
  items: T[],
  getLabel: (item: T) => string,
  limit = 6
) {
  const map = new Map<string, number>();

  items.forEach((item) => {
    const label = getLabel(item) || "غير محدد";
    map.set(label, (map.get(label) ?? 0) + 1);
  });

  const rows = Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (rows.length <= limit) return rows;

  const visible = rows.slice(0, limit - 1);
  const other = rows.slice(limit - 1).reduce((sum, row) => sum + row.count, 0);
  return [...visible, { label: "أخرى", count: other }];
}

function buildActionRows(items: UnifiedQueueItem[]) {
  const needsAction = items.filter((item) => item.allowedActions?.length).length;
  const noAction = Math.max(0, items.length - needsAction);

  return [
    { label: "يحتاج إجراء", count: needsAction },
    { label: "بدون إجراء", count: noAction },
  ].filter((row) => row.count > 0);
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ChartLegendList({
  data,
}: {
  data: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="grid gap-2">
      {data.map((item, index) => (
        <div
          key={item.label}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
        >
          <span
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
          />
          <span className="truncate text-xs text-muted-foreground">
            {item.label}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatNumber(item.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OperationsQueueCharts({
  items,
  title = "قراءة سريعة للطابور",
  description = "رسوم مختصرة تساعدك تعرف الضغط والحالات بدون كروت كثيرة.",
}: {
  items: UnifiedQueueItem[];
  title?: string;
  description?: string;
}) {
  const statusData = aggregateByLabel(items, getStatusLabel);
  const sourceData = aggregateByLabel(items, getSourceLabel, 4);
  const actionData = buildActionRows(items);
  const total = items.length;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="gap-1 pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {statusData.length ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 8, right: 36, left: 8, bottom: 8 }}
                barCategoryGap={10}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  dataKey="label"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={150}
                  tickMargin={8}
                  interval={0}
                  tickFormatter={formatAxisLabel}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" labelKey="label" />}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 8, 8]}
                  fill="var(--color-count)"
                  barSize={20}
                >
                  <LabelList
                    dataKey="count"
                    position="right"
                    className="fill-foreground font-semibold"
                    formatter={(value: number) => formatNumber(value)}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart message="لا توجد بيانات كافية لعرض الرسم." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="gap-1 pb-2">
            <CardTitle className="text-base font-semibold">مصدر الطلبات</CardTitle>
            <CardDescription>
              إجمالي الطابور: {formatNumber(total)} عنصر.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-1">
            {sourceData.length ? (
              <ChartContainer config={chartConfig} className="mx-auto h-[170px] w-full max-w-[220px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" />}
                  />
                  <Pie
                    data={sourceData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={44}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    <Label
                      position="center"
                      content={() => (
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-foreground text-sm font-bold"
                        >
                          {formatNumber(
                            sourceData.reduce((sum, row) => sum + row.count, 0)
                          )}
                        </text>
                      )}
                    />
                    {sourceData.map((entry, index) => (
                      <Cell
                        key={entry.label}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChart message="لا توجد مصادر للعرض." />
            )}
            <ChartLegendList data={sourceData} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="gap-1 pb-2">
            <CardTitle className="text-base font-semibold">الإجراءات</CardTitle>
            <CardDescription>هل يوجد شيء يحتاج تدخل الآن؟</CardDescription>
          </CardHeader>
          <CardContent>
            {actionData.length ? (
              <ChartContainer config={chartConfig} className="h-[170px] w-full">
                <BarChart data={actionData} margin={{ top: 12, right: 12, left: 12, bottom: 6 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    minTickGap={0}
                    tickFormatter={formatAxisLabel}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis hide allowDecimals={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" labelKey="label" />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[8, 8, 0, 0]}
                    barSize={42}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      className="fill-foreground font-semibold"
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart message="لا توجد إجراءات للعرض." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
