import { useMemo, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";

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
  usePremiumUpgradesQuery,
} from "@/hooks/usePremiumUpgradesQuery";
import { PremiumUpgradeFilters } from "./PremiumUpgradeFilters";
import { PremiumUpgradesTable } from "./PremiumUpgradesTable";
import { CandidateLinkDialog } from "./CandidateLinkDialog";
import { EditPremiumUpgradeDialog } from "./EditPremiumUpgradeDialog";
import { ArchivePremiumUpgradeDialog } from "./ArchivePremiumUpgradeDialog";
import { PremiumUpgradeDetailDrawer } from "./PremiumUpgradeDetailDrawer";

export function PremiumMealsPage() {
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
  const { invalidatePremiumUpgrades } = usePremiumUpgradeInvalidation();

  const rows = useMemo(
    () => (listQuery.data?.data ?? []).map(normalizePremiumUpgradeRow),
    [listQuery.data?.data]
  );
  const total = listQuery.data?.meta?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <div
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-6 lg:px-6"
      dir="rtl"
    >
      <header className="rounded-lg border bg-card p-5 shadow-xs lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={invalidatePremiumUpgrades}
            >
              <RefreshCw
                data-icon="inline-start"
                className={listQuery.isFetching ? "animate-spin" : undefined}
              />
              تحديث
            </Button>
            <Button type="button" onClick={() => setCandidateOpen(true)}>
              <Link2 data-icon="inline-start" />
              إضافة ترقية مميزة
            </Button>
          </div>
        </div>
      </header>

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
        onRetry={() => listQuery.refetch()}
        onEdit={setEditingRow}
        onRelink={setRelinkRow}
        onArchive={setArchiveRow}
        onDetails={setDetailRow}
      />

      <CandidateLinkDialog
        open={candidateOpen}
        onClose={() => setCandidateOpen(false)}
        onCreated={() => setCandidateOpen(false)}
      />

      <EditPremiumUpgradeDialog
        row={editingRow}
        mode="edit"
        onClose={() => setEditingRow(null)}
        onSaved={() => setEditingRow(null)}
      />

      <EditPremiumUpgradeDialog
        row={relinkRow}
        mode="relink"
        onClose={() => setRelinkRow(null)}
        onSaved={() => setRelinkRow(null)}
      />

      <ArchivePremiumUpgradeDialog
        row={archiveRow}
        onClose={() => setArchiveRow(null)}
        onArchived={() => setArchiveRow(null)}
      />

      <PremiumUpgradeDetailDrawer
        row={detailRow}
        onClose={() => setDetailRow(null)}
      />
    </div>
  );
}
