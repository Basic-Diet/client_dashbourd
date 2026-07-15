import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
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
  PremiumUpgradeKind,
  PremiumUpgradeSourceDto,
  PremiumUpgradeSourceFilters,
} from "@/types/premiumUpgradeTypes";
import {
  buildCreatePremiumUpgradePayload,
  defaultPremiumUpgradeSourceFilters,
  getSourceRelationId,
  premiumDisplayName,
  sourceHasRequiredRelation,
  sourceRelationContext,
} from "@/utils/fetchPremiumUpgrades";
import { isValidRiyalInput } from "@/utils/price";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useCreatePremiumUpgradeMutation,
  usePremiumUpgradeSourcesQuery,
} from "@/hooks/usePremiumUpgradesQuery";
import { SelectField } from "./PremiumUpgradeFilters";
import { MenuSourcePicker } from "./MenuSourcePicker";
import { ReadOnlyItem, StateToggleLine } from "./PremiumCandidateCard";

type LinkFormState = {
  kind: PremiumUpgradeKind;
  selectedSource: PremiumUpgradeSourceDto | null;
  upgradePriceSarInput: string;
  currency: "SAR";
  isActive: boolean;
  isVisible: boolean;
  sortOrder: string;
};

const defaultLinkForm: LinkFormState = {
  kind: "product",
  selectedSource: null,
  upgradePriceSarInput: "0",
  currency: "SAR",
  isActive: true,
  isVisible: true,
  sortOrder: "10",
};

export function CandidateLinkDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {open ? (
        <CandidateLinkDialogContent onClose={onClose} onCreated={onCreated} />
      ) : null}
    </Dialog>
  );
}

function CandidateLinkDialogContent({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<LinkFormState>(defaultLinkForm);
  const [sourceFilters, setSourceFilters] =
    useState<PremiumUpgradeSourceFilters>(defaultPremiumUpgradeSourceFilters);
  const [sourceSearch, setSourceSearch] = useState("");
  const debouncedSourceSearch = useDebounce(sourceSearch, 350);

  const sourceQueryFilters = {
    ...sourceFilters,
    q: debouncedSourceSearch,
  };
  const sourcesQuery = usePremiumUpgradeSourcesQuery(sourceQueryFilters, true);
  const createMutation = useCreatePremiumUpgradeMutation(onCreated);
  const sources = sourcesQuery.data?.data ?? [];
  const sourceTotal = sourcesQuery.data?.meta?.total ?? sources.length;
  const sourceTotalPages = Math.max(1, Math.ceil(sourceTotal / sourceFilters.limit));

  function update(next: Partial<LinkFormState>) {
    setForm((current) => ({ ...current, ...next }));
  }

  function updateKind(kind: string) {
    const nextKind = kind as PremiumUpgradeKind;
    setForm((current) => ({
      ...current,
      kind: nextKind,
      selectedSource: null,
    }));
    setSourceFilters((current) => ({
      ...current,
      kind: nextKind,
      page: 1,
    }));
    setSourceSearch("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();

    const selectedSource = form.selectedSource;
    if (!selectedSource) {
      toast.error("اختر المصدر أولاً.");
      return;
    }
    if (selectedSource.selectable === false) {
      toast.error("المصدر المحدد غير متاح للاشتراكات.");
      return;
    }
    if (!sourceHasRequiredRelation(selectedSource)) {
      toast.error(
        "تعذر تحديد علاقة هذا الخيار. حدّث قائمة المصادر واختر العنصر مرة أخرى."
      );
      return;
    }
    if (!isValidRiyalInput(form.upgradePriceSarInput)) {
      toast.error("سعر الترقية يجب أن يكون رقمًا غير سالب بالريال.");
      return;
    }

    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      toast.error("الترتيب يجب أن يكون رقمًا صحيحًا وغير سالب.");
      return;
    }

    createMutation.mutate(
      buildCreatePremiumUpgradePayload({ ...form, selectedSource })
    );
  }

  return (
    <DialogContent
      className="grid max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      dir="rtl"
    >
      <DialogHeader className="border-b px-5 py-4 text-right">
        <DialogTitle>إضافة ترقية مميزة</DialogTitle>
        <DialogDescription>
          اختر نوع الترقية ثم حدد العنصر المطلوب من المنيو.
        </DialogDescription>
      </DialogHeader>

      <form className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5" onSubmit={submit}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="space-y-4 rounded-lg border p-4">
            <SelectField
              label="النوع"
              value={form.kind}
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
                selectedSource={form.selectedSource}
                selectedRelationId={
                  form.selectedSource ? getSourceRelationId(form.selectedSource) : ""
                }
                search={sourceSearch}
                loading={sourcesQuery.isLoading || sourcesQuery.isFetching}
                error={sourcesQuery.error}
                page={sourceQueryFilters.page}
                totalPages={sourceTotalPages}
                onSearchChange={(value) => {
                  setSourceSearch(value);
                  setSourceFilters((current) => ({ ...current, page: 1 }));
                }}
                onPageChange={(page) =>
                  setSourceFilters((current) => ({ ...current, page }))
                }
                onRetry={() => sourcesQuery.refetch()}
                onSelect={(source) => update({ selectedSource: source })}
              />
            </div>

            {form.selectedSource ? (
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                <ReadOnlyItem
                  label="اسم المصدر"
                  value={premiumDisplayName(form.selectedSource.name)}
                />
                <ReadOnlyItem
                  label="مفتاح المصدر"
                  value={form.selectedSource.key || form.selectedSource.sourceId}
                />
                <ReadOnlyItem
                  label="السياق"
                  value={sourceRelationContext(form.selectedSource) || "-"}
                />
              </div>
            ) : null}
          </section>

          <section className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>فرق سعر الترقية بالريال</Label>
              <PriceInput
                value={form.upgradePriceSarInput}
                onChange={(upgradePriceSarInput) =>
                  update({ upgradePriceSarInput })
                }
              />
            </div>
            <ReadOnlyItem label="العملة" value={form.currency} />
            <NumberField
              label="الترتيب"
              value={form.sortOrder}
              step="1"
              onChange={(sortOrder) => update({ sortOrder })}
            />
            <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/20 p-3">
              <StateToggleLine
                label="نشط"
                checked={form.isActive}
                onCheckedChange={(isActive) => update({ isActive })}
              />
              <StateToggleLine
                label="ظاهر"
                checked={form.isVisible}
                onCheckedChange={(isVisible) => update({ isVisible })}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="sticky bottom-0 -mx-4 mt-5 border-t bg-background px-4 pt-4 sm:-mx-5 sm:px-5 sm:justify-start">
          <Button
            type="submit"
            disabled={createMutation.isPending || !form.selectedSource}
          >
            <Link2 data-icon="inline-start" />
            إضافة
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function PriceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        min="0"
        step="0.01"
        dir="ltr"
        className="pl-12 text-left"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
        SAR
      </span>
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
