import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  invalidateMealBuilderQueries,
  useAddMealBuilderProductsMutation,
  useCreateMealBuilderProductSectionMutation,
  useDeleteMealBuilderProductSectionMutation,
  useDirectMealBuilderPickerQuery,
  useRemoveMealBuilderProductMutation,
  useUpdateMealBuilderProductSectionMutation,
} from "@/hooks/menu";
import { parseApiError } from "@/lib/apiErrors";
import type {
  MealBuilderCardActionResponse,
  MealBuilderCheck,
  MealBuilderDirectCardPatchPayload,
  MealBuilderPickerCandidate,
  MealBuilderSection,
  MealBuilderValidation,
} from "@/types/mealBuilderTypes";
import { halalaToRiyal } from "@/utils/price";
import {
  isDirectProductCard,
  productIdsForDirectCard,
  selectedProductsForDirectCard,
} from "./mealBuilderDirectCardUtils";
import { isDirectMealBuilderCandidateSelectable } from "./mealBuilderFrontendUtils";
import { mealBuilderIssueText } from "./mealBuilderIssueText";

const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/;

type DialogMode =
  | { type: "create" }
  | { type: "products"; sectionKey: string }
  | { type: "details"; sectionKey: string }
  | null;

type BusyState = { dirty: boolean; pending: boolean };

export function MealBuilderDirectCards({
  sections,
  validation,
  parentPending,
  onBeforeAction,
  onActionApplied,
  onBusyChange,
}: {
  sections: MealBuilderSection[];
  validation: MealBuilderValidation | null;
  parentPending: boolean;
  onBeforeAction: () => Promise<void>;
  onActionApplied: (response: MealBuilderCardActionResponse) => void;
  onBusyChange?: (state: BusyState) => void;
}) {
  const queryClient = useQueryClient();
  const actionLockRef = useRef(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogDirty, setDialogDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteSection, setDeleteSection] = useState<MealBuilderSection | null>(null);
  const createMutation = useCreateMealBuilderProductSectionMutation();
  const updateMutation = useUpdateMealBuilderProductSectionMutation();
  const addMutation = useAddMealBuilderProductsMutation();
  const removeMutation = useRemoveMealBuilderProductMutation();
  const deleteMutation = useDeleteMealBuilderProductSectionMutation();
  const directSections = useMemo(
    () => sections.filter(isDirectProductCard).sort((a, b) => a.sortOrder - b.sortOrder),
    [sections]
  );
  const ownedPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    addMutation.isPending ||
    removeMutation.isPending ||
    deleteMutation.isPending;
  const pending = parentPending || ownedPending;

  useEffect(() => {
    onBusyChange?.({ dirty: dialogDirty, pending: ownedPending });
    return () => onBusyChange?.({ dirty: false, pending: false });
  }, [dialogDirty, onBusyChange, ownedPending]);

  const activeSection =
    dialogMode && dialogMode.type !== "create"
      ? sections.find((section) => section.key === dialogMode.sectionKey) ?? null
      : null;

  function closeActiveDialog() {
    setDiscardOpen(false);
    setDialogDirty(false);
    setDialogMode(null);
  }

  function requestDialogClose() {
    if (pending) return;
    if (dialogDirty) {
      setDiscardOpen(true);
      return;
    }
    closeActiveDialog();
  }

  async function runAction(
    action: () => Promise<MealBuilderCardActionResponse>,
    successMessage: string,
    options: { closeDialog?: boolean; closeDelete?: boolean } = {}
  ) {
    if (pending || actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await onBeforeAction();
      const response = await action();
      onActionApplied(response);
      setDialogDirty(false);
      if (options.closeDialog) setDialogMode(null);
      if (options.closeDelete) setDeleteSection(null);
      toast.success(successMessage);
    } catch (error) {
      const parsed = parseApiError(error);
      if (
        parsed.code === "MEAL_BUILDER_CARD_NOT_FOUND" ||
        parsed.code === "MEAL_BUILDER_PRODUCT_NOT_FOUND" ||
        parsed.code === "MEAL_BUILDER_PRODUCT_NOT_IN_CARD" ||
        parsed.code === "MEAL_BUILDER_CONFLICT" ||
        parsed.code === "MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED"
      ) {
        await invalidateMealBuilderQueries(queryClient);
      }
      if (
        parsed.code === "MEAL_BUILDER_CARD_NOT_FOUND" ||
        parsed.code === "MEAL_BUILDER_CARD_TYPE_UNSUPPORTED"
      ) {
        setDialogMode(null);
        setDeleteSection(null);
      }
      toast.error(cardActionErrorMessage(error));
      throw error;
    } finally {
      actionLockRef.current = false;
    }
  }

  async function updateVisibility(section: MealBuilderSection, nextVisible: boolean) {
    await runAction(
      () =>
        updateMutation.mutateAsync({
          sectionKey: section.key || "",
          patch: { visible: nextVisible },
        }),
      nextVisible ? "تم إظهار البطاقة" : "تم إخفاء البطاقة"
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setDialogMode({ type: "create" })}
        className="group flex min-h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-card/50 p-6 text-center transition hover:border-primary/60 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
        aria-label="إضافة بطاقة جديدة"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition group-hover:scale-105">
          <Plus className="size-6" />
        </span>
        <span className="space-y-1">
          <span className="block text-base font-semibold">إضافة بطاقة جديدة</span>
          <span className="block max-w-xs text-sm leading-6 text-muted-foreground">
            أنشئ بطاقة منتجات واختر العناصر التي ستظهر للعميل.
          </span>
        </span>
      </button>

      {directSections.map((section) => (
        <DirectCard
          key={section.key}
          section={section}
          validation={validation}
          pending={pending}
          onManage={() => setDialogMode({ type: "products", sectionKey: section.key || "" })}
          onEdit={() => setDialogMode({ type: "details", sectionKey: section.key || "" })}
          onDelete={() => setDeleteSection(section)}
          onVisibilityChange={(visible) => updateVisibility(section, visible)}
        />
      ))}

      {dialogMode?.type === "create" ? (
        <CreateCardDialog
          open
          pending={pending}
          defaultSortOrder={Math.max(0, ...sections.map((section) => section.sortOrder || 0)) + 10}
          onDirtyChange={setDialogDirty}
          onClose={requestDialogClose}
          onCreate={(payload) =>
            runAction(
              () => createMutation.mutateAsync(payload),
              "تم إنشاء بطاقة المنتجات",
              { closeDialog: true }
            )
          }
        />
      ) : null}

      {dialogMode?.type === "products" && activeSection ? (
        <ManageProductsDialog
          section={activeSection}
          pending={pending}
          onDirtyChange={setDialogDirty}
          onClose={requestDialogClose}
          onAdd={(productIds) =>
            runAction(
              () =>
                addMutation.mutateAsync({
                  sectionKey: activeSection.key || "",
                  productIds,
                }),
              "تمت إضافة المنتجات"
            )
          }
          onRemove={(productId) =>
            runAction(
              () =>
                removeMutation.mutateAsync({
                  sectionKey: activeSection.key || "",
                  productId,
                }),
              "تمت إزالة المنتج"
            )
          }
          onDeleteCard={() => setDeleteSection(activeSection)}
        />
      ) : null}

      {dialogMode?.type === "details" && activeSection ? (
        <CardDetailsDialog
          section={activeSection}
          pending={pending}
          onDirtyChange={setDialogDirty}
          onClose={requestDialogClose}
          onSave={(patch) =>
            runAction(
              () =>
                updateMutation.mutateAsync({
                  sectionKey: activeSection.key || "",
                  patch,
                }),
              "تم حفظ بيانات البطاقة",
              { closeDialog: true }
            )
          }
        />
      ) : null}

      <DeleteCardDialog
        section={deleteSection}
        pending={pending}
        onClose={() => setDeleteSection(null)}
        onConfirm={() =>
          deleteSection
            ? runAction(
                () => deleteMutation.mutateAsync(deleteSection.key || ""),
                "تم حذف بطاقة المنتجات",
                { closeDialog: true, closeDelete: true }
              )
            : Promise.resolve()
        }
      />

      <AlertDialog
        open={discardOpen}
        onOpenChange={(open) => !open && !pending && setDiscardOpen(false)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تجاهل التغييرات غير المحفوظة؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              توجد بيانات أو اختيارات مؤقتة داخل النافذة الحالية. يمكنك متابعة التعديل أو تجاهلها وإغلاق النافذة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel disabled={pending} onClick={() => setDiscardOpen(false)}>
              متابعة التعديل
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={closeActiveDialog}
            >
              تجاهل وإغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DirectCard({
  section,
  validation,
  pending,
  onManage,
  onEdit,
  onDelete,
  onVisibilityChange,
}: {
  section: MealBuilderSection;
  validation: MealBuilderValidation | null;
  pending: boolean;
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onVisibilityChange: (visible: boolean) => Promise<void>;
}) {
  const products = selectedProductsForDirectCard(section);
  const issues = validationIssuesForSection(validation, section);
  const errorCount = issues.filter((issue) => issue.level === "error").length;
  const title = section.titleOverride?.ar || section.titleOverride?.en || section.key || "بطاقة منتجات";

  return (
    <article className="flex min-h-64 flex-col rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-6">{title}</h3>
            <Badge variant={errorCount ? "destructive" : "outline"}>
              {errorCount ? `${errorCount} مشاكل` : "جاهزة"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "منتج" : "منتجات"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border bg-background px-2.5 py-1.5">
          {section.visible === false ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-primary" />}
          <Switch
            checked={section.visible !== false}
            disabled={pending}
            onCheckedChange={(checked) => {
              void onVisibilityChange(checked).catch(() => undefined);
            }}
            aria-label={section.visible === false ? `إظهار ${title}` : `إخفاء ${title}`}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {products.slice(0, 3).map((product) => (
          <ProductPreview
            key={product.productId || product.id || product.key}
            name={localizedName(product.name, product.label, product.key)}
            imageUrl={product.imageUrl}
          />
        ))}
        {!products.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            لا توجد منتجات داخل البطاقة. أضف منتجا قبل النشر.
          </div>
        ) : null}
        {products.length > 3 ? (
          <p className="text-xs text-muted-foreground">+{products.length - 3} منتجات أخرى</p>
        ) : null}
      </div>

      {issues.length ? (
        <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
          {localizedIssueMessage(issues[0])}
        </div>
      ) : null}

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <Button type="button" disabled={pending} onClick={onManage}>
          <Package className="size-4" />
          إدارة المنتجات
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onEdit}>
          <Pencil className="size-4" />
          تعديل البيانات
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDelete}
          className="col-span-2 justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
          حذف البطاقة
        </Button>
      </div>
    </article>
  );
}

function CreateCardDialog({
  open,
  pending,
  defaultSortOrder,
  onDirtyChange,
  onClose,
  onCreate,
}: {
  open: boolean;
  pending: boolean;
  defaultSortOrder: number;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onCreate: (payload: {
    key: string;
    titleOverride: { ar: string; en: string };
    selectedProductIds: string[];
    sortOrder: number;
    visible: boolean;
  }) => Promise<void>;
}) {
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [initialKey] = useState(() => `card_${Date.now().toString(36)}`);
  const [key, setKey] = useState(initialKey);
  const [keyTouched, setKeyTouched] = useState(false);
  const [sortOrder, setSortOrder] = useState(String(defaultSortOrder));
  const [visible, setVisible] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const pickerQuery = useDirectMealBuilderPickerQuery("products", {
    q: deferredQuery || undefined,
    search: deferredQuery || undefined,
    limit: 1000,
    unassignedOnly: true,
    includeUnavailable: false,
  });
  const candidates = pickerQuery.data?.data.candidates ?? [];
  const dirty = Boolean(
    titleAr ||
      titleEn ||
      key !== initialKey ||
      selectedIds.length ||
      !visible ||
      sortOrder !== String(defaultSortOrder)
  );

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function updateEnglishTitle(value: string) {
    setTitleEn(value);
    if (!keyTouched) {
      const suggested = slugify(value);
      setKey(suggested.length >= 2 ? suggested : initialKey);
    }
  }

  async function submit() {
    const parsedSort = Number(sortOrder);
    if (!titleAr.trim() && !titleEn.trim()) {
      setError("أدخل اسما عربيا أو إنجليزيا للبطاقة.");
      return;
    }
    if (!KEY_PATTERN.test(key.trim())) {
      setError("المفتاح مطلوب ويجب أن يبدأ بحرف أو رقم ويحتوي على أحرف إنجليزية صغيرة أو أرقام أو _ أو -.");
      return;
    }
    if (!selectedIds.length) {
      setError("اختر منتجا واحدا على الأقل.");
      return;
    }
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setError("الترتيب يجب أن يكون رقما صحيحا غير سالب.");
      return;
    }
    setError("");
    try {
      await onCreate({
      key: key.trim(),
      titleOverride: {
        ar: titleAr.trim() || titleEn.trim(),
        en: titleEn.trim() || titleAr.trim(),
      },
      selectedProductIds: selectedIds,
      sortOrder: parsedSort,
      visible,
      });
    } catch (actionError) {
      setError(cardActionErrorMessage(actionError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <DialogContent
        className="grid h-[min(92dvh,860px)] w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:!max-w-[min(94vw,64rem)]"
        dir="rtl"
      >
        <DialogHeader className="border-b px-4 py-4 text-right sm:px-6">
          <DialogTitle>إضافة بطاقة جديدة</DialogTitle>
          <DialogDescription>
            اكتب اسم البطاقة واختر المنتجات. الإعدادات التقنية موجودة تحت الإعدادات المتقدمة.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              {error ? <InlineError message={error} /> : null}
              <Field label="الاسم العربي" value={titleAr} onChange={setTitleAr} disabled={pending} />
              <Field label="الاسم الإنجليزي" value={titleEn} onChange={updateEnglishTitle} disabled={pending} dir="ltr" />
              <details className="rounded-xl border bg-muted/20 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
                  إعدادات متقدمة
                  <ChevronDown className="size-4" />
                </summary>
                <div className="mt-4 space-y-4">
                  <Field
                    label="المفتاح التقني"
                    value={key}
                    onChange={(value) => {
                      setKeyTouched(true);
                      setKey(value.toLowerCase());
                    }}
                    disabled={pending}
                    dir="ltr"
                  />
                  <Field label="الترتيب" value={sortOrder} onChange={setSortOrder} disabled={pending} type="number" dir="ltr" />
                  <div className="flex items-center justify-between rounded-xl border bg-background p-3">
                    <Label>ظاهرة للعميل</Label>
                    <Switch checked={visible} onCheckedChange={setVisible} disabled={pending} />
                  </div>
                </div>
              </details>
            </div>
            <ProductPicker
              title="اختر المنتجات"
              query={query}
              onQueryChange={setQuery}
              candidates={candidates}
              selectedIds={selectedIds}
              onToggle={(candidate) => {
                const id = candidate.productId || candidate.id;
                if (!isDirectMealBuilderCandidateSelectable(candidate)) return;
                setSelectedIds((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
                );
              }}
              loading={pickerQuery.isLoading}
              error={pickerQuery.isError ? cardActionErrorMessage(pickerQuery.error) : ""}
              onRetry={() => pickerQuery.refetch()}
              pending={pending}
            />
          </div>
        </div>
        <DialogFooter className="border-t bg-background/95 px-4 py-3 sm:justify-start sm:px-6">
          <Button type="button" onClick={() => void submit()} disabled={pending || pickerQuery.isLoading} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            إنشاء البطاقة
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageProductsDialog({
  section,
  pending,
  onDirtyChange,
  onClose,
  onAdd,
  onRemove,
  onDeleteCard,
}: {
  section: MealBuilderSection;
  pending: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onAdd: (productIds: string[]) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onDeleteCard: () => void;
}) {
  const [query, setQuery] = useState("");
  const [addIds, setAddIds] = useState<string[]>([]);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const pickerQuery = useDirectMealBuilderPickerQuery(section.key || "", {
    q: deferredQuery || undefined,
    search: deferredQuery || undefined,
    limit: 1000,
    unassignedOnly: true,
    includeUnavailable: false,
    targetSectionKey: section.key,
  });
  const candidates = pickerQuery.data?.data.candidates ?? [];
  const currentProducts = selectedProductsForDirectCard(section);
  const currentIds = new Set(productIdsForDirectCard(section));

  useEffect(() => onDirtyChange(addIds.length > 0), [addIds.length, onDirtyChange]);

  async function addSelected() {
    if (!addIds.length) return;
    try {
      setError("");
      await onAdd(addIds);
      setAddIds([]);
      await pickerQuery.refetch();
    } catch (actionError) {
      setError(cardActionErrorMessage(actionError));
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    try {
      setError("");
      await onRemove(removeTarget.id);
      setRemoveTarget(null);
      await pickerQuery.refetch();
    } catch (actionError) {
      setError(cardActionErrorMessage(actionError));
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
        <DialogContent
          className="grid h-[min(92dvh,860px)] w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:!max-w-[min(94vw,72rem)]"
          dir="rtl"
        >
          <DialogHeader className="border-b px-4 py-4 text-right sm:px-6">
            <DialogTitle>إدارة منتجات {section.titleOverride?.ar || section.titleOverride?.en || section.key}</DialogTitle>
            <DialogDescription>
              احذف المنتجات الحالية أو اختر منتجات متاحة لإضافتها. المنتج لا يمكن أن يوجد في بطاقتين معا.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {error ? <InlineError message={error} /> : null}
            <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
              <section className="space-y-3 rounded-2xl border bg-muted/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">المنتجات الحالية</h4>
                    <p className="text-sm text-muted-foreground">{currentProducts.length} منتجات داخل البطاقة</p>
                  </div>
                  <Badge variant="outline">{currentProducts.length}</Badge>
                </div>
                <div className="divide-y overflow-hidden rounded-xl border bg-background">
                  {currentProducts.map((product) => {
                    const id = product.productId || product.id || "";
                    const name = localizedName(product.name, product.label, product.key);
                    return (
                      <div key={id || product.key} className="flex items-center gap-3 p-3">
                        <ProductThumb name={name} imageUrl={product.imageUrl} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{name}</p>
                          <bdi dir="ltr" className="block truncate text-xs text-muted-foreground">{id}</bdi>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={pending}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`إزالة ${name}`}
                          onClick={() => {
                            if (currentProducts.length <= 1) {
                              onDeleteCard();
                              return;
                            }
                            setRemoveTarget({ id, name });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  لا يمكن ترك بطاقة المنتجات فارغة. إزالة آخر منتج ستطلب حذف البطاقة كاملة.
                </p>
              </section>

              <ProductPicker
                title="إضافة منتجات"
                query={query}
                onQueryChange={setQuery}
                candidates={candidates}
                selectedIds={addIds}
                currentIds={currentIds}
                onToggle={(candidate) => {
                  const id = candidate.productId || candidate.id;
                  if (currentIds.has(id) || !isDirectMealBuilderCandidateSelectable(candidate)) return;
                  setAddIds((current) =>
                    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
                  );
                }}
                loading={pickerQuery.isLoading}
                error={pickerQuery.isError ? cardActionErrorMessage(pickerQuery.error) : ""}
                onRetry={() => pickerQuery.refetch()}
                pending={pending}
              />
            </div>
          </div>
          <DialogFooter className="border-t bg-background/95 px-4 py-3 sm:justify-start sm:px-6">
            <Button type="button" onClick={() => void addSelected()} disabled={pending || !addIds.length} className="w-full sm:w-auto">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              إضافة المحدد ({addIds.length})
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && !pending && setRemoveTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>إزالة المنتج من البطاقة؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              سيتم إزالة <bdi dir="auto">{removeTarget?.name}</bdi> من المسودة، وسيصبح متاحا لبطاقة أخرى. تطبيق العميل لن يتغير حتى النشر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={() => void confirmRemove()}>
              إزالة المنتج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CardDetailsDialog({
  section,
  pending,
  onDirtyChange,
  onClose,
  onSave,
}: {
  section: MealBuilderSection;
  pending: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onSave: (patch: MealBuilderDirectCardPatchPayload) => Promise<void>;
}) {
  const [titleAr, setTitleAr] = useState(section.titleOverride?.ar || "");
  const [titleEn, setTitleEn] = useState(section.titleOverride?.en || "");
  const [key, setKey] = useState(section.key || "");
  const [sortOrder, setSortOrder] = useState(String(section.sortOrder || 0));
  const [visible, setVisible] = useState(section.visible !== false);
  const [error, setError] = useState("");
  const dirty =
    titleAr !== (section.titleOverride?.ar || "") ||
    titleEn !== (section.titleOverride?.en || "") ||
    key !== (section.key || "") ||
    sortOrder !== String(section.sortOrder || 0) ||
    visible !== (section.visible !== false);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  async function submit() {
    const parsedSort = Number(sortOrder);
    if (!titleAr.trim() && !titleEn.trim()) {
      setError("أدخل اسما عربيا أو إنجليزيا للبطاقة.");
      return;
    }
    if (!KEY_PATTERN.test(key.trim())) {
      setError("المفتاح غير صالح. استخدم أحرفا إنجليزية صغيرة أو أرقاما أو _ أو -.");
      return;
    }
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setError("الترتيب يجب أن يكون رقما صحيحا غير سالب.");
      return;
    }
    const patch: MealBuilderDirectCardPatchPayload = {};
    if (titleAr.trim() !== (section.titleOverride?.ar || "") || titleEn.trim() !== (section.titleOverride?.en || "")) {
      patch.titleOverride = {
        ar: titleAr.trim() || titleEn.trim(),
        en: titleEn.trim() || titleAr.trim(),
      };
    }
    if (key.trim() !== section.key) patch.key = key.trim();
    if (parsedSort !== section.sortOrder) patch.sortOrder = parsedSort;
    if (visible !== (section.visible !== false)) patch.visible = visible;
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setError("");
    try {
      await onSave(patch);
    } catch (actionError) {
      setError(cardActionErrorMessage(actionError));
    }
  }

  return (
    <Dialog open onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>تعديل بيانات البطاقة</DialogTitle>
          <DialogDescription>
            عدّل الاسم وحالة الظهور. المفتاح والترتيب موجودان في الإعدادات المتقدمة.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error ? <InlineError message={error} /> : null}
          <Field label="الاسم العربي" value={titleAr} onChange={setTitleAr} disabled={pending} />
          <Field label="الاسم الإنجليزي" value={titleEn} onChange={setTitleEn} disabled={pending} dir="ltr" />
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <Label>ظاهرة للعميل</Label>
              <p className="mt-1 text-xs text-muted-foreground">لن يظهر التغيير في التطبيق قبل النشر.</p>
            </div>
            <Switch checked={visible} onCheckedChange={setVisible} disabled={pending} />
          </div>
          <details className="rounded-xl border bg-muted/20 p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
              إعدادات متقدمة
              <ChevronDown className="size-4" />
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="المفتاح التقني" value={key} onChange={(value) => setKey(value.toLowerCase())} disabled={pending} dir="ltr" />
              <Field label="الترتيب" value={sortOrder} onChange={setSortOrder} disabled={pending} type="number" dir="ltr" />
            </div>
          </details>
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" onClick={() => void submit()} disabled={pending || !dirty} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            حفظ التعديلات
          </Button>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductPicker({
  title,
  query,
  onQueryChange,
  candidates,
  selectedIds,
  currentIds = new Set<string>(),
  onToggle,
  loading,
  error,
  onRetry,
  pending,
}: {
  title: string;
  query: string;
  onQueryChange: (value: string) => void;
  candidates: MealBuilderPickerCandidate[];
  selectedIds: string[];
  currentIds?: Set<string>;
  onToggle: (candidate: MealBuilderPickerCandidate) => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  pending: boolean;
}) {
  return (
    <section className="space-y-3 rounded-2xl border bg-muted/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">اختر فقط المنتجات المتاحة وغير المستخدمة في بطاقة أخرى.</p>
        </div>
        <Badge variant="secondary">{selectedIds.length} محدد</Badge>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ابحث باسم المنتج"
          className="pr-9"
          disabled={pending}
        />
      </div>
      <div className="max-h-[52dvh] overflow-y-auto rounded-xl border bg-background">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> جاري تحميل المنتجات...
          </div>
        ) : error ? (
          <div className="space-y-3 p-4">
            <InlineError message={error} />
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              إعادة المحاولة
            </Button>
          </div>
        ) : candidates.length ? (
          <div className="divide-y">
            {candidates.map((candidate) => {
              const id = candidate.productId || candidate.id;
              const inCard = currentIds.has(id) || candidate.selected;
              const selectable = isDirectMealBuilderCandidateSelectable(candidate) && !inCard;
              const checked = inCard || selectedIds.includes(id);
              const name = candidateName(candidate);
              return (
                <label
                  key={id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 ${
                    selectable && !pending ? "cursor-pointer hover:bg-muted/40" : "bg-muted/15 opacity-75"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={!selectable || pending}
                    onCheckedChange={() => selectable && onToggle(candidate)}
                    aria-label={`اختيار ${name}`}
                  />
                  <div className="flex min-w-0 items-center gap-3">
                    <ProductThumb name={name} imageUrl={candidate.imageUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {candidate.category?.name?.ar || candidate.category?.name?.en || candidate.categoryKey || "بدون تصنيف"}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <Badge variant={inCard ? "secondary" : selectable ? "outline" : "secondary"}>
                      {inCard ? "موجودة" : selectable ? "متاحة" : "غير متاحة"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">{formatPrice(candidate)}</p>
                  </div>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">لا توجد منتجات متاحة لهذا البحث.</p>
        )}
      </div>
    </section>
  );
}

function DeleteCardDialog({
  section,
  pending,
  onClose,
  onConfirm,
}: {
  section: MealBuilderSection | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const products = section ? selectedProductsForDirectCard(section) : [];
  return (
    <AlertDialog open={Boolean(section)} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>حذف بطاقة المنتجات؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            سيتم حذف بطاقة <bdi dir="auto">{section?.titleOverride?.ar || section?.titleOverride?.en || section?.key}</bdi> من المسودة، وستصبح {products.length} منتجات متاحة لبطاقات أخرى. تطبيق العميل لن يتغير حتى النشر.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={() => {
            void onConfirm().catch(() => undefined);
          }}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            حذف البطاقة
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  dir,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  dir?: "ltr" | "rtl";
  type?: "text" | "number";
}) {
  const id = `meal-builder-${label.replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} dir={dir} type={type} />
    </div>
  );
}

function ProductPreview({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
      <ProductThumb name={name} imageUrl={imageUrl} />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
    </div>
  );
}

function ProductThumb({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return imageUrl ? (
    <img src={imageUrl} alt="" className="size-11 shrink-0 rounded-lg object-cover" loading="lazy" />
  ) : (
    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
      <Package className="size-4" />
      <span className="sr-only">{name}</span>
    </span>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function validationIssuesForSection(
  validation: MealBuilderValidation | null,
  section: MealBuilderSection
) {
  if (!validation) return [];
  const sectionIndex = section.metadata?.sectionIndex;
  return [...validation.errors, ...validation.warnings].filter((issue) => {
    const issueSectionKey =
      typeof issue.sectionKey === "string" ? issue.sectionKey : undefined;
    return (
      issueSectionKey === section.key ||
      (typeof sectionIndex === "number" && issue.sectionIndex === sectionIndex) ||
      issue.sectionType === section.sectionType
    );
  });
}

function localizedIssueMessage(issue: MealBuilderCheck) {
  const localized = mealBuilderIssueText({
    ...issue,
    message: undefined,
    title: undefined,
  });
  return /[\u0600-\u06FF]/.test(localized)
    ? localized
    : "توجد مشكلة تحتاج مراجعة في هذه البطاقة.";
}

function candidateName(candidate: MealBuilderPickerCandidate) {
  return localizedName(candidate.name, candidate.label, candidate.key);
}

function localizedName(
  name?: { ar?: string; en?: string } | null,
  label?: string,
  fallback?: string
) {
  return name?.ar || name?.en || label || fallback || "عنصر";
}

function formatPrice(candidate: MealBuilderPickerCandidate) {
  const price = candidate.pricing?.priceHalala ?? candidate.priceHalala;
  const currency = candidate.pricing?.currency || candidate.currency || "SAR";
  if (typeof price !== "number") return "";
  return `${halalaToRiyal(price)} ${currency === "SAR" ? "ر.س" : currency}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function cardActionErrorMessage(error: unknown) {
  const parsed = parseApiError(error);
  switch (parsed.code) {
    case "MEAL_BUILDER_CARD_KEY_DUPLICATE":
      return "هذا المفتاح مستخدم في بطاقة أخرى. اختر مفتاحا مختلفا.";
    case "MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED":
      return "بعض المنتجات مختارة بالفعل في بطاقة أخرى. تم تحديث المنتجات المتاحة.";
    case "MEAL_BUILDER_CARD_WOULD_BE_EMPTY":
      return "لا يمكن ترك بطاقة المنتجات فارغة. احذف البطاقة بدلا من إزالة آخر منتج.";
    case "MEAL_BUILDER_CARD_NOT_FOUND":
      return "هذه البطاقة لم تعد موجودة أو تغير اسمها. تم تحديث المسودة.";
    case "MEAL_BUILDER_PRODUCT_NOT_FOUND":
      return "أحد المنتجات لم يعد موجودا. تم تحديث قائمة المنتجات.";
    case "MEAL_BUILDER_PRODUCT_NOT_IN_CARD":
      return "هذا المنتج لم يعد موجودا في البطاقة. تم تحديث المسودة.";
    case "MEAL_BUILDER_PRODUCT_TYPE_INVALID":
      return "هذا النوع من المنتجات غير مسموح داخل البطاقة.";
    case "MEAL_BUILDER_PRODUCT_UNAVAILABLE":
      return "أحد المنتجات غير متاح حاليا ولا يمكن إضافته.";
    case "MEAL_BUILDER_CONFLICT":
      return "تغيرت المسودة على الخادم. تم تحديث البيانات، حاول مرة أخرى.";
    case "MEAL_BUILDER_CARD_TYPE_UNSUPPORTED":
      return "هذه البطاقة تدار من محرر المكونات وليست بطاقة منتجات مباشرة.";
    default:
      return parsed.message || "تعذر تنفيذ العملية. حاول مرة أخرى.";
  }
}
