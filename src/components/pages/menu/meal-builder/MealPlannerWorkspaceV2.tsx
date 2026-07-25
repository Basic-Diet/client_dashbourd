import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import type {
  MealPlannerCardActionResponseV2,
  MealPlannerCatalogV2,
  MealPlannerConfigV2,
  MealPlannerCreatePayloadV2,
  MealPlannerPatchPayloadV2,
  MealPlannerSectionV2,
  MealPlannerStateResponseV2,
  MealPlannerValidationV2,
} from "@/types/mealPlannerDashboardTypes";
import {
  addMealPlannerOptions,
  createMealPlannerCard,
  deleteMealPlannerCard,
  getMealPlannerDashboardState,
  getMealPlannerReadiness,
  publishMealPlannerDraft,
  removeMealPlannerOption,
  replaceMealPlannerCardItems,
  resetMealPlannerDraft,
  updateMealPlannerCard,
  validateMealPlannerDraft,
} from "@/utils/fetchMealPlannerDashboard";
import { MealPlannerCardDialogV2 } from "./MealPlannerCardDialogV2";
import { MealPlannerCardGridV2 } from "./MealPlannerCardGridV2";
import { MealPlannerItemsDialogV2 } from "./MealPlannerItemsDialogV2";
import {
  issueText,
  mealPlannerErrorMessage,
  normalizeCardType,
  sectionOptionRole,
  sectionTitle,
  selectedIdsForSection,
} from "./mealPlannerV2Utils";

export type MealBuilderNavigationState = {
  dirty: boolean;
  pending: boolean;
  draftWorkspaceReady: boolean;
};

type LocalWorkspace = {
  draft: MealPlannerConfigV2;
  validation: MealPlannerValidationV2;
};

type FilterType = "all" | "direct_product" | "protein" | "carbs";

export const MEAL_PLANNER_STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
export const MEAL_PLANNER_READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;
export const MEAL_PLANNER_CATALOG_KEY = ["dashboard.meal-planner.v2.catalog"] as const;
export const MEAL_PLANNER_OPTION_PICKER_KEY = [
  "dashboard.meal-planner.v2.picker",
  "option",
] as const;

const EMPTY_CATALOG: MealPlannerCatalogV2 = {
  products: [],
  optionGroups: [],
  options: [],
  builderGroups: [],
};

export function MealPlannerWorkspaceV2({
  externalNavigationBlocked = false,
  onNavigationStateChange,
}: {
  externalNavigationBlocked?: boolean;
  onNavigationStateChange?: (state: MealBuilderNavigationState) => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "superadmin";
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [editor, setEditor] = useState<MealPlannerSectionV2 | "create" | null>(null);
  const [manageTarget, setManageTarget] = useState<MealPlannerSectionV2 | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealPlannerSectionV2 | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [publishedOpen, setPublishedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const stateQuery = useQuery({
    queryKey: MEAL_PLANNER_STATE_KEY,
    queryFn: getMealPlannerDashboardState,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
  const readinessQuery = useQuery({
    queryKey: MEAL_PLANNER_READINESS_KEY,
    queryFn: getMealPlannerReadiness,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const cardMutation = useMutation({
    mutationFn: ({
      payload,
      previousKey,
    }: {
      payload: MealPlannerCreatePayloadV2;
      previousKey?: string;
    }) =>
      previousKey
        ? updateMealPlannerCard({ sectionKey: previousKey, patch: payload })
        : createMealPlannerCard(payload),
  });
  const visibilityMutation = useMutation({
    mutationFn: ({
      sectionKey,
      patch,
    }: {
      sectionKey: string;
      patch: MealPlannerPatchPayloadV2;
    }) => updateMealPlannerCard({ sectionKey, patch }),
  });
  const itemsMutation = useMutation({ mutationFn: replaceMealPlannerCardItems });
  const addOptionsMutation = useMutation({ mutationFn: addMealPlannerOptions });
  const removeOptionMutation = useMutation({ mutationFn: removeMealPlannerOption });
  const deleteMutation = useMutation({ mutationFn: deleteMealPlannerCard });
  const validateMutation = useMutation({ mutationFn: validateMealPlannerDraft });
  const publishMutation = useMutation({ mutationFn: publishMealPlannerDraft });
  const resetMutation = useMutation({ mutationFn: resetMealPlannerDraft });

  const pending = [
    cardMutation,
    visibilityMutation,
    itemsMutation,
    addOptionsMutation,
    removeOptionMutation,
    deleteMutation,
    validateMutation,
    publishMutation,
    resetMutation,
  ].some((mutation) => mutation.isPending);
  const dirty = editor !== null || manageTarget !== null;
  const state = stateQuery.data?.data;
  const workingConfig = workspace?.draft ?? state?.draft ?? state?.published ?? null;
  const validation = workspace?.validation ?? state?.validation?.draft ?? null;
  const catalog = state?.catalog ?? EMPTY_CATALOG;
  const sections = useMemo(
    () =>
      [...(workingConfig?.sections ?? [])].sort(
        (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)
      ),
    [workingConfig?.sections]
  );
  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      if (
        query &&
        !`${sectionTitle(section)} ${section.key}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (filterType === "all") return true;
      if (filterType === "direct_product") {
        return normalizeCardType(section) === "direct_product";
      }
      return sectionOptionRole(section) === filterType;
    });
  }, [filterType, search, sections]);
  const hasUnpublishedChanges = Boolean(
    workspace ||
      state?.draft ||
      state?.metadata?.hasDraft ||
      state?.metadata?.hasUnpublishedChanges
  );
  const allIssues = [
    ...(validation?.errors ?? []),
    ...(validation?.warnings ?? []),
  ];

  useEffect(() => {
    onNavigationStateChange?.({
      dirty,
      pending,
      draftWorkspaceReady: Boolean(workingConfig && stateQuery.isSuccess),
    });
  }, [dirty, onNavigationStateChange, pending, stateQuery.isSuccess, workingConfig]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !pending) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, pending]);

  function applyAction(
    response: MealPlannerCardActionResponseV2,
    optionContextChanged = false
  ) {
    const nextWorkspace = {
      draft: response.data.draft,
      validation: response.data.validation,
    };
    setWorkspace(nextWorkspace);
    queryClient.setQueryData<MealPlannerStateResponseV2>(
      MEAL_PLANNER_STATE_KEY,
      (current) =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                draft: response.data.draft,
                validation: {
                  ...current.data.validation,
                  draft: response.data.validation,
                },
                metadata: {
                  ...current.data.metadata,
                  hasDraft: true,
                  hasUnpublishedChanges: true,
                },
              },
            }
          : current
    );
    void queryClient.invalidateQueries({ queryKey: MEAL_PLANNER_STATE_KEY });
    void queryClient.invalidateQueries({ queryKey: MEAL_PLANNER_READINESS_KEY });
    if (optionContextChanged) {
      void queryClient.invalidateQueries({
        queryKey: MEAL_PLANNER_OPTION_PICKER_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: MEAL_PLANNER_CATALOG_KEY });
    }
  }

  async function reloadAuthoritative(showToast = false) {
    setWorkspace(null);
    await queryClient.invalidateQueries({
      queryKey: MEAL_PLANNER_OPTION_PICKER_KEY,
    });
    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);
    if (showToast) toast.success("تم تحديث بيانات منشئ الوجبات");
  }

  async function saveCard(
    payload: MealPlannerCreatePayloadV2,
    previousKey?: string
  ) {
    if (!canWrite) throw new Error("ليست لديك صلاحية تعديل منشئ الوجبات");
    try {
      const response = await cardMutation.mutateAsync({ payload, previousKey });
      applyAction(response, payload.cardType === "option_family");
      setEditor(null);
      toast.success(previousKey ? "تم حفظ الكارت" : "تم إنشاء الكارت");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر حفظ الكارت"));
      throw error;
    }
  }

  async function saveItems(ids: string[]) {
    if (!manageTarget) return;
    const cardType = normalizeCardType(manageTarget);
    const originalIds = selectedIdsForSection(manageTarget);
    const added = ids.filter((id) => !originalIds.includes(id));
    const removed = originalIds.filter((id) => !ids.includes(id));
    try {
      let response: MealPlannerCardActionResponseV2;
      if (cardType === "option_family" && added.length && !removed.length) {
        response = await addOptionsMutation.mutateAsync({
          sectionKey: manageTarget.key,
          optionIds: added,
        });
      } else if (
        cardType === "option_family" &&
        removed.length === 1 &&
        !added.length
      ) {
        response = await removeOptionMutation.mutateAsync({
          sectionKey: manageTarget.key,
          optionId: removed[0],
        });
      } else {
        response = await itemsMutation.mutateAsync({
          sectionKey: manageTarget.key,
          payload:
            cardType === "direct_product"
              ? { productIds: ids }
              : { optionIds: ids },
        });
      }
      applyAction(response, cardType === "option_family");
      setManageTarget(null);
      toast.success("تم حفظ عناصر الكارت");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر حفظ عناصر الكارت"));
      throw error;
    }
  }

  async function toggleVisibility(section: MealPlannerSectionV2) {
    const cardType = normalizeCardType(section);
    if (cardType !== "direct_product" && cardType !== "option_family") return;
    const patch: MealPlannerPatchPayloadV2 =
      cardType === "direct_product"
        ? {
            cardType: "direct_product",
            selectionType: "full_meal_product",
            visible: section.visible === false,
          }
        : {
            cardType: "option_family",
            selectionType: "standard_meal",
            visible: section.visible === false,
          };
    try {
      const response = await visibilityMutation.mutateAsync({
        sectionKey: section.key,
        patch,
      });
      applyAction(response, cardType === "option_family");
      toast.success(
        section.visible === false ? "تم إظهار الكارت" : "تم إخفاء الكارت"
      );
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر تحديث ظهور الكارت"));
    }
  }

  async function review() {
    try {
      const response = await validateMutation.mutateAsync();
      if (workingConfig) {
        setWorkspace({ draft: workingConfig, validation: response.data });
      }
      if (response.data.ready && response.data.errors.length === 0) {
        setPublishOpen(true);
      } else {
        setIssuesOpen(true);
      }
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر فحص تغييرات العمل"));
    }
  }

  async function publish() {
    try {
      await publishMutation.mutateAsync(publishNotes);
      setPublishOpen(false);
      setPublishNotes("");
      await reloadAuthoritative();
      toast.success("تم نشر تغييرات منشئ الوجبات بنجاح");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر نشر التغييرات"));
    }
  }

  async function reset() {
    try {
      await resetMutation.mutateAsync();
      setResetOpen(false);
      setEditor(null);
      setManageTarget(null);
      await reloadAuthoritative();
      toast.success("تم إلغاء التغييرات غير المنشورة");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر إلغاء التغييرات"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const optionContextChanged =
      normalizeCardType(deleteTarget) === "option_family";
    try {
      const response = await deleteMutation.mutateAsync(deleteTarget.key);
      applyAction(response, optionContextChanged);
      setDeleteTarget(null);
      toast.success("تم حذف الكارت");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر حذف الكارت"));
    }
  }

  if (stateQuery.isLoading) {
    return (
      <div className="grid min-h-72 place-items-center">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }
  if (stateQuery.error || !state) {
    return (
      <div
        className="grid min-h-72 place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        dir="rtl"
      >
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            {mealPlannerErrorMessage(
              stateQuery.error,
              "تعذر تحميل منشئ الوجبات"
            )}
          </p>
          <Button variant="outline" onClick={() => void stateQuery.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">منشئ وجبات الاشتراك</h1>
                <Badge
                  variant={hasUnpublishedChanges ? "secondary" : "outline"}
                >
                  {hasUnpublishedChanges
                    ? "تغييرات غير منشورة"
                    : "النسخة المنشورة"}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                أضف منتجات المنيو أو مجموعات الخيارات، ثم راجع وانشر التغييرات.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <Button disabled={pending} onClick={() => setEditor("create")}>
                <Plus className="size-4" /> إضافة كارت
              </Button>
            ) : null}
            {canWrite ? (
              <Button
                variant="outline"
                disabled={pending || !hasUnpublishedChanges}
                onClick={() => void review()}
              >
                <ClipboardCheck className="size-4" /> مراجعة ونشر
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setPublishedOpen(true)}>
              <Eye className="size-4" /> المنشور
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => void reloadAuthoritative(true)}
            >
              <RefreshCw className="size-4" /> تحديث
            </Button>
            {canWrite ? (
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={pending || !hasUnpublishedChanges}
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw className="size-4" /> إلغاء التغييرات
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid border-t bg-muted/20 p-3 text-sm sm:grid-cols-3">
          <span>الكروت: {sections.length}</span>
          <span>
            الجاهزية: {readinessQuery.data?.data?.ready ? "جاهز" : "يحتاج مراجعة"}
          </span>
          <span>المشكلات: {allIssues.length}</span>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث باسم الكارت أو المفتاح..."
            className="pr-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as FilterType)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الكروت</SelectItem>
            <SelectItem value="direct_product">منتجات المنيو</SelectItem>
            <SelectItem value="protein">بروتين</SelectItem>
            <SelectItem value="carbs">كارب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MealPlannerCardGridV2
        premiumSection={state.premiumSection}
        catalog={catalog}
        sections={filteredSections}
        issues={allIssues}
        pending={pending}
        readOnly={!canWrite}
        onEdit={setEditor}
        onManageItems={setManageTarget}
        onToggleVisibility={(section) => void toggleVisibility(section)}
        onDelete={setDeleteTarget}
      />

      {canWrite && editor ? (
        <MealPlannerCardDialogV2
          key={editor === "create" ? "create" : editor.key}
          section={editor === "create" ? null : editor}
          catalog={catalog}
          cardContract={state.cardContract ?? catalog.cardContract}
          pending={cardMutation.isPending}
          onClose={() => setEditor(null)}
          onSubmit={saveCard}
        />
      ) : null}
      {canWrite && manageTarget ? (
        <MealPlannerItemsDialogV2
          key={manageTarget.key}
          section={manageTarget}
          pending={
            itemsMutation.isPending ||
            addOptionsMutation.isPending ||
            removeOptionMutation.isPending
          }
          onClose={() => setManageTarget(null)}
          onSave={saveItems}
          onDeleteCard={() => {
            setManageTarget(null);
            setDeleteTarget(manageTarget);
          }}
        />
      ) : null}

      <Dialog open={issuesOpen} onOpenChange={setIssuesOpen}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>نتيجة المراجعة</DialogTitle>
            <DialogDescription className="text-right">
              راجع الرسائل قبل النشر.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {allIssues.length ? (
              allIssues.map((issue, index) => (
                <p
                  key={`${issue.code}-${index}`}
                  className="rounded-xl border p-3 text-sm"
                >
                  {issueText(issue)}
                </p>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد مشكلات.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={publishedOpen} onOpenChange={setPublishedOpen}>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>النسخة المنشورة</DialogTitle>
            <DialogDescription className="text-right">
              عدد الكروت المنشورة: {state.published?.sections?.length ?? 0}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {state.published?.sections?.map((section) => (
              <div key={section.key} className="rounded-xl border p-3">
                <p className="font-medium">{sectionTitle(section)}</p>
                <p className="text-xs text-muted-foreground">{section.key}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={publishOpen}
        onOpenChange={(open) =>
          !publishMutation.isPending && setPublishOpen(open)
        }
      >
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>نشر التغييرات</DialogTitle>
            <DialogDescription className="text-right">
              أضف ملاحظة اختيارية ثم أكد النشر.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={publishNotes}
            onChange={(event) => setPublishNotes(event.target.value)}
          />
          <DialogFooter className="gap-2 sm:justify-start">
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              إلغاء
            </Button>
            <Button
              disabled={publishMutation.isPending}
              onClick={() => void publish()}
            >
              {publishMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              نشر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف الكارت؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيتم حذف «{deleteTarget ? sectionTitle(deleteTarget) : ""}» من مسودة
              العمل.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void confirmDelete()}
            >
              <Trash2 className="size-4" /> حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>إلغاء كل التغييرات؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              ستعود المسودة إلى آخر نسخة منشورة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>رجوع</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={resetMutation.isPending}
              onClick={() => void reset()}
            >
              إلغاء التغييرات
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {externalNavigationBlocked ? (
        <span className="sr-only">توجد تغييرات تمنع المغادرة</span>
      ) : null}
    </div>
  );
}
