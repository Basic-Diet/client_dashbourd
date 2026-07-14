import { useState } from "react";
import type { FormEvent } from "react";
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
import type { PremiumUpgradeConfigDto } from "@/types/premiumUpgradeTypes";
import { useUpdatePremiumUpgradeMutation } from "@/hooks/usePremiumUpgradesQuery";
import {
  premiumDisplayGroupLabel,
  premiumNameAr,
  premiumSelectionTypeLabel,
  premiumSourceTypeLabel,
} from "@/utils/fetchPremiumUpgrades";
import { isValidRiyalInput, riyalToHalala } from "@/utils/price";
import { SelectField } from "./PremiumUpgradeFilters";
import { ReadOnlyItem } from "./PremiumCandidateCard";

export function EditPremiumUpgradeDialog({
  row,
  onClose,
  onSaved,
}: {
  row: PremiumUpgradeConfigDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل إعداد الترقية</DialogTitle>
          <DialogDescription>
            عدّل مجموعة العرض، فرق سعر الترقية، والترتيب فقط.
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <EditPremiumUpgradeForm key={row.id} row={row} onClose={onClose} onSaved={onSaved} />
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
  const [form, setForm] = useState({
    displayGroupKey: row.displayGroup.key ?? "premium_proteins",
    upgradeDeltaSarInput: String(row.upgradeDeltaSar ?? 0),
    sortOrder: String(row.sortOrder ?? 0),
  });
  const updateMutation = useUpdatePremiumUpgradeMutation(onSaved);

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!isValidRiyalInput(form.upgradeDeltaSarInput)) {
      toast.error("فرق سعر الترقية يجب أن يكون رقما غير سالب بالريال.");
      return;
    }

    const sortOrder = Number(form.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      toast.error("الترتيب يجب أن يكون رقما.");
      return;
    }

    updateMutation.mutate({
      id: row.id,
      payload: {
        expectedRevision: row.revision,
        displayGroupKey: form.displayGroupKey,
        upgradeDeltaHalala: riyalToHalala(form.upgradeDeltaSarInput),
        sortOrder,
      },
    });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-2">
        <ReadOnlyItem label="الاسم" value={premiumNameAr(row.sourceName)} />
        <ReadOnlyItem label="مفتاح الترقية" value={row.premiumKey} />
        <ReadOnlyItem label="نوع المصدر" value={premiumSourceTypeLabel(row.sourceType)} />
        <ReadOnlyItem label="نوع الترقية" value={premiumSelectionTypeLabel(row.selectionType)} />
        <ReadOnlyItem label="المراجعة الحالية" value={row.revision} />
        <ReadOnlyItem label="الحالة" value={row.status === "active" ? "نشط" : "مؤرشف"} />
        <ReadOnlyItem label="مجموعة العرض الحالية" value={premiumDisplayGroupLabel(row.displayGroup.key)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SelectField
          label="مجموعة العرض"
          value={form.displayGroupKey}
          onValueChange={(displayGroupKey) =>
            setForm((current) => ({ ...current, displayGroupKey }))
          }
          options={[
            ["premium_proteins", "بروتينات مميزة"],
            ["premium_salads", "سلطات مميزة"],
          ]}
        />
        <NumberField
          label="فرق سعر الترقية بالريال"
          value={form.upgradeDeltaSarInput}
          min="0"
          step="0.01"
          suffix="ر.س"
          onChange={(upgradeDeltaSarInput) =>
            setForm((current) => ({ ...current, upgradeDeltaSarInput }))
          }
        />
        <NumberField
          label="الترتيب"
          value={form.sortOrder}
          step="1"
          onChange={(sortOrder) =>
            setForm((current) => ({ ...current, sortOrder }))
          }
        />
      </div>

      <DialogFooter className="gap-2 sm:justify-start">
        <Button type="submit" disabled={updateMutation.isPending}>
          حفظ التعديل
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </DialogFooter>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  step?: string;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          step={step}
          dir="ltr"
          className={suffix ? "pl-12 text-left" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
