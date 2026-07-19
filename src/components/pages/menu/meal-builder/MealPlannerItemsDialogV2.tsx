import { useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MealPlannerSectionV2 } from "@/types/mealPlannerDashboardTypes";
import { MealPlannerCandidatePickerV2 } from "./MealPlannerCandidatePickerV2";
import {
  normalizeCardType,
  sectionItems,
  sectionOptionRole,
  sectionTitle,
  selectedIdsForSection,
} from "./mealPlannerV2Utils";

export function MealPlannerItemsDialogV2({
  section,
  pending,
  onClose,
  onSave,
  onDeleteCard,
}: {
  section: MealPlannerSectionV2;
  pending: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
  onDeleteCard: () => void;
}) {
  const initialIds = useMemo(() => selectedIdsForSection(section), [section]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [emptyOpen, setEmptyOpen] = useState(false);
  const [error, setError] = useState("");
  const cardType = normalizeCardType(section);
  const dirty = JSON.stringify(selectedIds) !== JSON.stringify(initialIds);

  function requestClose() {
    if (pending) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }

  async function save() {
    if (!selectedIds.length) {
      setEmptyOpen(true);
      return;
    }
    setError("");
    try {
      await onSave(selectedIds);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "تعذر حفظ العناصر"
      );
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestClose()}>
        <DialogContent
          dir="rtl"
          className="max-h-[94dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-3xl"
        >
          <DialogHeader className="text-right">
            <DialogTitle>إدارة عناصر «{sectionTitle(section)}»</DialogTitle>
            <DialogDescription className="text-right leading-6">
              احفظ القائمة كاملة دفعة واحدة. سيعيد الـBackend النسخة الكاملة بعد التحقق.
            </DialogDescription>
          </DialogHeader>

          <MealPlannerCandidatePickerV2
            type={cardType === "direct_product" ? "product" : "option"}
            targetSectionKey={section.key}
            selectedIds={selectedIds}
            seedCandidates={sectionItems(section)}
            productContextId={String(section.productContextId || "")}
            sourceGroupId={String(section.sourceGroupId || "")}
            optionRole={sectionOptionRole(section) || undefined}
            familyKey={String(
              section.metadata?.familyKey ||
                section.metadata?.proteinFamilyKey ||
                ""
            )}
            onChange={setSelectedIds}
          />

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" variant="outline" disabled={pending} onClick={requestClose}>
              إلغاء
            </Button>
            <Button type="button" disabled={pending || !dirty} onClick={() => void save()}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              حفظ العناصر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تجاهل تغييرات العناصر؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              توجد اختيارات لم تُحفظ بعد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>متابعة التعديل</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              تجاهل وإغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>لا يمكن ترك الكارت فارغًا</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              احذف الكارت بدلًا من إرسال قائمة عناصر فارغة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>العودة للاختيار</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDeleteCard}>
              حذف الكارت
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
