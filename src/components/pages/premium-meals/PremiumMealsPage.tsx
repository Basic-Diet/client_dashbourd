import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Link2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  PremiumUpgradeConfigDto,
  PremiumUpgradeListFilters,
} from "@/types/premiumUpgradeTypes";
import {
  defaultPremiumUpgradeListFilters,
  normalizePremiumUpgradeRow,
} from "@/utils/fetchPremiumUpgrades";
import {
  usePremiumUpgradeInvalidation,
  usePremiumUpgradeReadinessQuery,
  usePremiumUpgradesQuery,
} from "@/hooks/usePremiumUpgradesQuery";
import { PremiumUpgradeFilters } from "./PremiumUpgradeFilters";
import { PremiumUpgradesTable } from "./PremiumUpgradesTable";
import { CandidateLinkDialog } from "./CandidateLinkDialog";
import { EditPremiumUpgradeDialog } from "./EditPremiumUpgradeDialog";
import { ArchivePremiumUpgradeDialog } from "./ArchivePremiumUpgradeDialog";
import { PremiumUpgradeDetailDrawer } from "./PremiumUpgradeDetailDrawer";
import { useAuth } from "@/hooks/useAuth";
import { canManagePremiumUpgrades } from "@/lib/rolePermissions";

export function PremiumMealsPage() {
  const { user } = useAuth();
  const canWrite = canManagePremiumUpgrades(user?.role);
  const [filters, setFilters] = useState<PremiumUpgradeListFilters>(
    defaultPremiumUpgradeListFilters
  );
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [editingRow, setEditingRow] =
    useState<PremiumUpgradeConfigDto | null>(null);
  const [relinkRow, setRelinkRow] =
    useState<PremiumUpgradeConfigDto | null>(null);
  const [archiveRow, setArchiveRow] =
    useState<PremiumUpgradeConfigDto | null>(null);
  const [detailRow, setDetailRow] =
    useState<PremiumUpgradeConfigDto | null>(null);

  const listQuery = usePremiumUpgradesQuery(filters);
  const readinessQuery = usePremiumUpgradeReadinessQuery();
  const { invalidatePremiumUpgrades } = usePremiumUpgradeInvalidation();

  const rows = useMemo(
    () => (listQuery.data?.data ?? []).map(normalizePremiumUpgradeRow),
    [listQuery.data?.data]
  );
  const total = listQuery.data?.meta?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const refreshing = listQuery.isFetching || readinessQuery.isFetching;
  const readiness = readinessQuery.data;
  const diagnostics = readiness?.diagnostics;
  const readinessIssues =
    (diagnostics?.missingSources ?? 0) +
    (diagnostics?.invalidRelations ?? 0) +
    (diagnostics?.duplicateKeys ?? 0);

  async function refreshPage() {
    await invalidatePremiumUpgrades();
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-3 py-4 sm:px-4 sm:py-6 lg:px-6"
      dir="rtl"
    >
      <header className="rounded-xl border bg-card p-4 shadow-xs sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3 sm:gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:size-11">
              <Link2 className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                الوجبات المميزة
              </h1>
              <p className="max-w-4xl text-sm leading-6 text-muted-foreground">
                إدارة ترقيات الوجبات وربطها بمنتجات وخيارات المنيو الحالية.
              </p>
            </div>
          </div>
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={refreshing}
              onClick={() => void refreshPage()}
            >
              <RefreshCw
                data-icon="inline-start"
                className={refreshing ? "animate-spin" : undefined}
              />
              {refreshing ? "جاري التحديث" : "تحديث"}
            </Button>
            {canWrite ? (
            <Button type="button" onClick={() => setCandidateOpen(true)}>
              <Link2 data-icon="inline-start" />
              إضافة ترقية مميزة
            </Button>
            ) : null}
          </div>
        </div>
      </header>

      {readinessQuery.isError ? (
        <section className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>تعذر التحقق من جاهزية ترقيات الوجبات من الخادم.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void readinessQuery.refetch()}
          >
            إعادة المحاولة
          </Button>
        </section>
      ) : readiness ? (
        <section
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            readiness.isReady
              ? "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
          }`}
        >
          {readiness.isReady ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          )}
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">
              {readiness.isReady
                ? "ربط الوجبات المميزة جاهز ويعمل بصورة سليمة"
                : "توجد عناصر تحتاج مراجعة في ربط الوجبات المميزة"}
            </p>
            <p className="leading-6 opacity-90">
              {readiness.isReady
                ? `${diagnostics?.activeConfigs ?? total} ترقية نشطة ومتاحة للاستخدام.`
                : `${readinessIssues} مشكلة ربط مسجلة من الخادم. استخدم فلتر «يحتاج إصلاح» لإعادة الربط.`}
            </p>
          </div>
        </section>
      ) : null}

      <PremiumUpgradeFilters filters={filters} onChange={setFilters} />

      <PremiumUpgradesTable
        rows={rows}
        loading={listQuery.isLoading}
        fetching={listQuery.isFetching}
        error={listQuery.error}
        filters={filters}
        total={total}
        totalPages={totalPages}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
        onRetry={() => void listQuery.refetch()}
        onEdit={setEditingRow}
        onRelink={setRelinkRow}
        onArchive={setArchiveRow}
        onDetails={setDetailRow}
        canWrite={canWrite}
      />

      {canWrite ? (
      <CandidateLinkDialog
        open={candidateOpen}
        onClose={() => setCandidateOpen(false)}
        onCreated={() => setCandidateOpen(false)}
      />
      ) : null}

      {canWrite ? (
      <EditPremiumUpgradeDialog
        row={editingRow}
        mode="edit"
        onClose={() => setEditingRow(null)}
        onSaved={() => setEditingRow(null)}
      />
      ) : null}

      {canWrite ? (
      <EditPremiumUpgradeDialog
        row={relinkRow}
        mode="relink"
        onClose={() => setRelinkRow(null)}
        onSaved={() => setRelinkRow(null)}
      />
      ) : null}

      {canWrite ? (
      <ArchivePremiumUpgradeDialog
        row={archiveRow}
        onClose={() => setArchiveRow(null)}
        onArchived={() => setArchiveRow(null)}
      />
      ) : null}

      <PremiumUpgradeDetailDrawer
        row={detailRow}
        onClose={() => setDetailRow(null)}
      />
    </div>
  );
}
