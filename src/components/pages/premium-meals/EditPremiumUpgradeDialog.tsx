import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  PremiumUpgradeConfigDto,
  PremiumUpgradeKind,
  PremiumUpgradeSourceDto,
  PremiumUpgradeSourceFilters,
} from "@/types/premiumUpgradeTypes";
import {
  usePremiumUpgradeSourcesQuery,
  useUpdatePremiumUpgradeMutation,
} from "@/hooks/usePremiumUpgradesQuery";
import {
  buildRelinkPremiumUpgradePayload,
  defaultPremiumUpgradeSourceFilters,
  getSourceRelationId,
  premiumEditStateFromRow,
  premiumDisplayName,
  premiumKindLabel,
  premiumPriceSar,
  premiumRowHealth,
  premiumRowKind,
  premiumRowName,
  sourceRelationContext,
} from "@/utils/fetchPremiumUpgrades";
import { useDebounce } from "@/hooks/useDebounce";
import { isValidRiyalInput, riyalToHalala } from "@/utils/price";
import { SelectField } from "./PremiumUpgradeFilters";
import { ReadOnlyItem, StateToggleLine } from "./PremiumCandidateCard";
import { MenuSourcePicker } from "./MenuSourcePicker";
import { PriceInput } from "./CandidateLinkDialog";

export function EditPremiumUpgradeDialog({
  row,
  mode,
  onClose,
  onSaved,
}: {
  row: PremiumUpgradeConfigDto | null;
  mode: "edit" | "relink";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isRelink = mode === "relink";

  return (
    <Dialog open={Boolean(row)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isRelink ? "إعادة ربط الترقية" : "تعديل الترقية"}
          </DialogTitle>
          <DialogDescription>
            {isRelink
              ? "اختر مصدرًا متوافقًا يحافظ على هوية الترقية الحالية."
              : "عدّل السعر والحالة والظهور والترتيب فقط."}
          </DialogDescription>
        </DialogHeader>

        {row ? (
          isRelink ? (
            <RelinkPremiumUpgradeForm
              key={row.id}
              row={row}
              onClose={onClose}
              onSaved={onSaved}
            />
          ) : (
            <EditPremiumUpgradeForm
              key={row.id}
              row={row}
              onClose={onClose}
              onSaved={onSaved}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditPremiumUpgradeForm({
  row,
  onClose,
  onSaved,
}: {
  row: PremiumUpgradeConfigDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editState = premiumEditStateFromRow(row);
  const [form, setForm] = useState({
    upgradePriceSarInput: String(premiumPriceSar(row)),
    currency: "SAR" as const,
    isActive: editState.isActive,
    isVisible: editState.isVisible,
    sortOrder: String(row.sortOrder ?? 0),
  });
  const updateMutation = useUpdatePremiumUpgradeMutation(onSaved);

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!isValidRiyalInput(form.upgradePriceSarInput)) {
      toast.error("سعر الترقية يجب أن يكون رقمًا غير سالب بالريال.");
      return;
    }

    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      toast.error("الترتيب يجب أن يكون رقمًا صحيحًا وغير سالب.");
      return;
    }

    updateMutation.mutate({
      id: row.id,
      payload: {
        expectedRevision: row.revision ?? 0,
        upgradeDeltaHalala: riyalToHalala(form.upgradePriceSarInput),
        currency: form.currency,
        isActive: form.isActive,
        isVisible: form.isVisible,
        sortOrder,
      },
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <Summary row={row} />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>فرق سعر الترقية بالريال</Label>
          <PriceInput
            value={form.upgradePriceSarInput}
            onChange={(upgradePriceSarInput) =>
              setForm((current) => ({ ...current, upgradePriceSarInput }))
            }
          />
        </div>
        <ReadOnlyItem label="العملة" value={form.currency} />
        <NumberField
          label="الترتيب"
          value={form.sortOrder}
          step="1"
          onChange={(sortOrder) =>
            setForm((current) => ({ ...current, sortOrder }))
          }
        />
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/20 p-3">
        <StateToggleLine
          label="نشط"
          checked={form.isActive}
          onCheckedChange={(isActive) =>
            setForm((current) => ({ ...current, isActive }))
          }
        />
        <StateToggleLine
          label="ظاهر"
          checked={form.isVisible}
          onCheckedChange={(isVisible) =>
            setForm((current) => ({ ...current, isVisible }))
          }
        />
      </div>

      <DialogFooter className="gap-2 sm:justify-start">
        <Button type="submit" disabled={updateMutation.isPending}>
          حفظ
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </DialogFooter>
    </form>
  );
}

function RelinkPremiumUpgradeForm({
  row,
  onClose,
  onSaved,
}: {
  row: PremiumUpgradeConfigDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<PremiumUpgradeKind>(premiumRowKind(row));
  const [selectedSource, setSelectedSource] =
    useState<PremiumUpgradeSourceDto | null>(null);
  const [sourceFilters, setSourceFilters] = useState<PremiumUpgradeSourceFilters>({
    ...defaultPremiumUpgradeSourceFilters,
    kind,
    excludeConfigId: row.id,
  });
  const [sourceSearch, setSourceSearch] = useState("");
  const debouncedSourceSearch = useDebounce(sourceSearch, 350);
  const sourceQueryFilters = {
    ...sourceFilters,
    q: debouncedSourceSearch,
  };
  const sourcesQuery = usePremiumUpgradeSourcesQuery(sourceQueryFilters, true);
  const updateMutation = useUpdatePremiumUpgradeMutation(onSaved);
  const sources = sourcesQuery.data?.data ?? [];
  const sourceTotal = sourcesQuery.data?.meta?.total ?? sources.length;
  const sourceTotalPages = Math.max(1, Math.ceil(sourceTotal / sourceFilters.limit));

  function updateKind(value: string) {
    const nextKind = value as PremiumUpgradeKind;
    setKind(nextKind);
    setSelectedSource(null);
    setSourceFilters((current) => ({
      ...current,
      kind: nextKind,
      excludeConfigId: row.id,
      page: 1,
    }));
    setSourceSearch("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedSource) {
      toast.error("اختر مصدرًا صالحًا أولاً.");
      return;
    }
    if (selectedSource.selectable === false) {
      toast.error("المصدر المحدد غير متاح للاشتراكات.");
      return;
    }

    updateMutation.mutate({
      id: row.id,
      payload: buildRelinkPremiumUpgradePayload({ row, selectedSource }),
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <Summary row={row} />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        يحتاج إلى إعادة ربط بمصدر صالح ومتوافق مع مفتاح الترقية الحالي.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="النوع"
          value={kind}
          onValueChange={updateKind}
          options={[
            ["product", "منتج كامل"],
            ["option", "خيار داخل وجبة"],
          ]}
        />
        <div className="space-y-2">
          <Label>المصدر</Label>
          <MenuSourcePicker
            sources={sources}
            selectedSource={selectedSource}
            selectedRelationId={
              selectedSource ? getSourceRelationId(selectedSource) : ""
            }
            search={sourceSearch}
            loading={sourcesQuery.isLoading || sourcesQuery.isFetching}
            error={sourcesQuery.error}
            page={sourceQueryFilters.page}
            totalPages={sourceTotalPages}
            currentConfigId={row.id}
            onSearchChange={(value) => {
              setSourceSearch(value);
              setSourceFilters((current) => ({ ...current, page: 1 }));
            }}
            onPageChange={(page) =>
              setSourceFilters((current) => ({ ...current, page }))
            }
            onRetry={() => sourcesQuery.refetch()}
            onSelect={setSelectedSource}
          />
        </div>
      </div>

      {selectedSource ? (
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-2">
          <ReadOnlyItem
            label="المصدر الجديد"
            value={premiumDisplayName(selectedSource.name)}
          />
          <ReadOnlyItem
            label="العلاقة"
            value={sourceRelationContext(selectedSource) || getSourceRelationId(selectedSource)}
          />
        </div>
      ) : null}

      <DialogFooter className="gap-2 sm:justify-start">
        <Button
          type="submit"
          disabled={updateMutation.isPending || !selectedSource}
        >
          إعادة الربط
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </DialogFooter>
    </form>
  );
}

function Summary({ row }: { row: PremiumUpgradeConfigDto }) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
      <ReadOnlyItem label="الاسم" value={premiumRowName(row)} />
      <ReadOnlyItem label="المفتاح" value={row.key || row.premiumKey || "-"} />
      <ReadOnlyItem label="النوع" value={premiumKindLabel(premiumRowKind(row))} />
      <ReadOnlyItem label="المصدر" value={row.sourceId || "-"} />
      <ReadOnlyItem
        label="الصحة"
        value={premiumRowHealth(row) === "broken" ? "يحتاج إصلاح" : "جاهز"}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
