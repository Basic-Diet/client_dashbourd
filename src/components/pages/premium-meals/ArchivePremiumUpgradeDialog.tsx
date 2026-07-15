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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PremiumUpgradeConfigDto } from "@/types/premiumUpgradeTypes";
import { useArchivePremiumUpgradeMutation } from "@/hooks/usePremiumUpgradesQuery";
import { premiumRowName } from "@/utils/fetchPremiumUpgrades";

export function ArchivePremiumUpgradeDialog({
  row,
  onClose,
  onArchived,
}: {
  row: PremiumUpgradeConfigDto | null;
  onClose: () => void;
  onArchived: () => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>أرشفة ترقية مميزة</DialogTitle>
          <DialogDescription>
            سيتم الاحتفاظ بالسجل في الأرشيف ولن يظهر كترقية نشطة للعملاء.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <ArchivePremiumUpgradeForm
            key={row.id}
            row={row}
            onClose={onClose}
            onArchived={onArchived}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ArchivePremiumUpgradeForm({
  row,
  onClose,
  onArchived,
}: {
  row: PremiumUpgradeConfigDto;
  onClose: () => void;
  onArchived: () => void;
}) {
  const [reason, setReason] = useState("");
  const archiveMutation = useArchivePremiumUpgradeMutation(onArchived);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) {
      toast.error("اكتب سبب الأرشفة بوضوح.");
      return;
    }
    archiveMutation.mutate({
      id: row.id,
      payload: { expectedRevision: row.revision, reason: reason.trim() },
    });
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="rounded-lg border bg-muted/20 p-3 text-sm">
        {premiumRowName(row)}
      </div>
      <div className="space-y-2">
        <Label htmlFor="archive-reason">سبب الأرشفة</Label>
        <Textarea
          id="archive-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="مثال: لم يعد متاحا من المورد"
        />
      </div>
      <DialogFooter className="gap-2 sm:justify-start">
        <Button
          type="submit"
          variant="destructive"
          disabled={archiveMutation.isPending}
        >
          أرشفة
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          إلغاء
        </Button>
      </DialogFooter>
    </form>
  );
}
