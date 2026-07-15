import { Archive, Eye, Link2, Pencil } from "lucide-react";

import { parseApiError } from "@/lib/apiErrors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  PremiumUpgradeConfigDto,
  PremiumUpgradeListFilters,
} from "@/types/premiumUpgradeTypes";
import {
  formatPremiumSar,
  premiumIssueMessage,
  premiumKindLabel,
  premiumPriceSar,
  premiumRowHealth,
  premiumRowKey,
  premiumRowKind,
  premiumRowName,
  premiumRowStatus,
  premiumStatusLabel,
} from "@/utils/fetchPremiumUpgrades";
import { HealthBadge, ReadOnlyItem } from "./PremiumCandidateCard";

export function PremiumUpgradesTable({
  rows,
  loading,
  fetching,
  error,
  filters,
  total,
  totalPages,
  onPageChange,
  onRetry,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
}: {
  rows: PremiumUpgradeConfigDto[];
  loading: boolean;
  fetching: boolean;
  error: unknown;
  filters: PremiumUpgradeListFilters;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onEdit: (row: PremiumUpgradeConfigDto) => void;
  onRelink: (row: PremiumUpgradeConfigDto) => void;
  onArchive: (row: PremiumUpgradeConfigDto) => void;
  onDetails: (row: PremiumUpgradeConfigDto) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>قائمة الوجبات المميزة</CardTitle>
          <CardDescription>
            جدول مختصر لإدارة السعر والحالة وصحة الربط.
          </CardDescription>
        </div>
        <Badge variant="secondary">{total} عنصر</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <MobileRows
          rows={rows}
          loading={loading}
          error={error}
          filters={filters}
          onRetry={onRetry}
          onEdit={onEdit}
          onRelink={onRelink}
          onArchive={onArchive}
          onDetails={onDetails}
        />
        <DesktopRows
          rows={rows}
          loading={loading}
          error={error}
          filters={filters}
          onRetry={onRetry}
          onEdit={onEdit}
          onRelink={onRelink}
          onArchive={onArchive}
          onDetails={onDetails}
        />

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            صفحة {filters.page} من {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
            disabled={fetching || filters.page <= 1}
              onClick={() => onPageChange(filters.page - 1)}
            >
              السابق
            </Button>
            <Button
              type="button"
              variant="outline"
            disabled={fetching || filters.page >= totalPages}
              onClick={() => onPageChange(filters.page + 1)}
            >
              التالي
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileRows({
  rows,
  loading,
  error,
  filters,
  onRetry,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
}: {
  rows: PremiumUpgradeConfigDto[];
  loading: boolean;
  error: unknown;
  filters: PremiumUpgradeListFilters;
  onRetry: () => void;
  onEdit: (row: PremiumUpgradeConfigDto) => void;
  onRelink: (row: PremiumUpgradeConfigDto) => void;
  onArchive: (row: PremiumUpgradeConfigDto) => void;
  onDetails: (row: PremiumUpgradeConfigDto) => void;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/20 p-5 text-center text-sm text-muted-foreground md:hidden">
        جاري تحميل الترقيات...
      </div>
    );
  }

  if (error) {
    return <ListErrorState error={error} onRetry={onRetry} mobile />;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-5 text-center text-sm text-muted-foreground md:hidden">
        {hasActiveFilters(filters)
          ? "لا توجد نتائج مطابقة للفلاتر الحالية"
          : "لا توجد وجبات مميزة"}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <PremiumUpgradeMobileCard
          key={row.id}
          row={row}
          onEdit={() => onEdit(row)}
          onRelink={() => onRelink(row)}
          onArchive={() => onArchive(row)}
          onDetails={() => onDetails(row)}
        />
      ))}
    </div>
  );
}

function DesktopRows({
  rows,
  loading,
  error,
  filters,
  onRetry,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
}: {
  rows: PremiumUpgradeConfigDto[];
  loading: boolean;
  error: unknown;
  filters: PremiumUpgradeListFilters;
  onRetry: () => void;
  onEdit: (row: PremiumUpgradeConfigDto) => void;
  onRelink: (row: PremiumUpgradeConfigDto) => void;
  onArchive: (row: PremiumUpgradeConfigDto) => void;
  onDetails: (row: PremiumUpgradeConfigDto) => void;
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">المفتاح</TableHead>
            <TableHead className="text-right">النوع</TableHead>
            <TableHead className="text-right">فرق سعر الترقية</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead className="text-right">صحة الربط</TableHead>
            <TableHead className="text-right">الترتيب</TableHead>
            <TableHead className="text-right">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                جاري تحميل الترقيات...
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={8}>
                <ListErrorState error={error} onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                {hasActiveFilters(filters)
                  ? "لا توجد نتائج مطابقة للفلاتر الحالية"
                  : "لا توجد وجبات مميزة"}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <PremiumUpgradeRow
                key={row.id}
                row={row}
                onEdit={() => onEdit(row)}
                onRelink={() => onRelink(row)}
                onArchive={() => onArchive(row)}
                onDetails={() => onDetails(row)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PremiumUpgradeRow({
  row,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
}: {
  row: PremiumUpgradeConfigDto;
  onEdit: () => void;
  onRelink: () => void;
  onArchive: () => void;
  onDetails: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-[180px] font-medium">
        {premiumRowName(row)}
      </TableCell>
      <TableCell>
        <code className="rounded bg-muted px-2 py-1 text-xs">
          {premiumRowKey(row)}
        </code>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{premiumKindLabel(premiumRowKind(row))}</Badge>
      </TableCell>
      <TableCell className="font-medium">
        {formatPremiumSar(premiumPriceSar(row))}
      </TableCell>
      <TableCell>
        <StatusBadge row={row} />
      </TableCell>
      <TableCell>
        <HealthBadge row={row} />
        {premiumRowHealth(row) === "broken" ? (
          <p className="mt-1 max-w-[220px] whitespace-normal text-xs text-muted-foreground">
            {premiumIssueMessage(row.issueCode)}
          </p>
        ) : null}
      </TableCell>
      <TableCell>{row.sortOrder ?? 0}</TableCell>
      <TableCell>
        <Actions
          row={row}
          onEdit={onEdit}
          onRelink={onRelink}
          onArchive={onArchive}
          onDetails={onDetails}
        />
      </TableCell>
    </TableRow>
  );
}

function PremiumUpgradeMobileCard({
  row,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
}: {
  row: PremiumUpgradeConfigDto;
  onEdit: () => void;
  onRelink: () => void;
  onArchive: () => void;
  onDetails: () => void;
}) {
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{premiumRowName(row)}</h3>
          <p className="text-sm text-muted-foreground">{premiumRowKey(row)}</p>
        </div>
        <StatusBadge row={row} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <ReadOnlyItem label="النوع" value={premiumKindLabel(premiumRowKind(row))} />
        <ReadOnlyItem label="سعر الترقية" value={formatPremiumSar(premiumPriceSar(row))} />
        <ReadOnlyItem label="الترتيب" value={row.sortOrder ?? 0} />
      </div>

      <HealthBadge row={row} />
      {premiumRowHealth(row) === "broken" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {premiumIssueMessage(row.issueCode)}
        </p>
      ) : null}
      <Actions
        row={row}
        onEdit={onEdit}
        onRelink={onRelink}
        onArchive={onArchive}
        onDetails={onDetails}
        mobile
      />
    </article>
  );
}

function StatusBadge({ row }: { row: PremiumUpgradeConfigDto }) {
  const status = premiumRowStatus(row);
  const variant = status === "active" ? "default" : "secondary";

  return <Badge variant={variant}>{premiumStatusLabel(status)}</Badge>;
}

function Actions({
  row,
  onEdit,
  onRelink,
  onArchive,
  onDetails,
  mobile,
}: {
  row: PremiumUpgradeConfigDto;
  onEdit: () => void;
  onRelink: () => void;
  onArchive: () => void;
  onDetails: () => void;
  mobile?: boolean;
}) {
  const archived = premiumRowStatus(row) === "archived";
  const broken = premiumRowHealth(row) === "broken";

  if (archived) {
    return (
      <div className={mobile ? "grid grid-cols-1 gap-2" : "flex flex-wrap gap-2"}>
        <Button type="button" size="sm" variant="outline" onClick={onDetails}>
          <Eye data-icon="inline-start" />
          التفاصيل
        </Button>
      </div>
    );
  }

  return (
    <div className={mobile ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}>
      {broken ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRelink}
          aria-label="إعادة الربط"
          title="إعادة الربط"
        >
          <Link2 data-icon="inline-start" />
          إعادة الربط
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onEdit}
          aria-label="تعديل"
          title="تعديل"
        >
          <Pencil data-icon="inline-start" />
          تعديل
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onArchive}
        aria-label="أرشفة"
        title="أرشفة"
      >
        <Archive data-icon="inline-start" />
        أرشفة
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onDetails}
        aria-label="التفاصيل"
        title="التفاصيل"
      >
        <Eye data-icon="inline-start" />
        التفاصيل
      </Button>
    </div>
  );
}

function hasActiveFilters(filters: PremiumUpgradeListFilters) {
  return Boolean(filters.q.trim()) || filters.kind !== "all" || filters.status !== "all" || filters.health !== "all";
}

function ListErrorState({
  error,
  onRetry,
  mobile,
}: {
  error: unknown;
  onRetry: () => void;
  mobile?: boolean;
}) {
  const parsed = parseApiError(error);
  return (
    <div
      className={
        mobile
          ? "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 md:hidden"
          : "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
      }
    >
      <p className="font-medium">{parsed.message}</p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  );
}
