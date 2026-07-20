import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  MealPlannerCardActionResponseV2,
  MealPlannerConfigV2,
  MealPlannerCreatePayloadV2,
  MealPlannerPatchPayloadV2,
  MealPlannerSectionV2,
  MealPlannerStateResponseV2,
  MealPlannerValidationIssue,
  MealPlannerValidationV2,
} from "@/types/mealPlannerDashboardTypes";
import {
  createMealPlannerCard,
  deleteMealPlannerCard,
  getMealPlannerDashboardState,
  getMealPlannerReadiness,
  publishMealPlannerDraft,
  replaceMealPlannerCardItems,
  resetMealPlannerDraft,
  updateMealPlannerCard,
  validateMealPlannerDraft,
} from "@/utils/fetchMealPlannerDashboard";
import { MealPlannerCardDialogV2 } from "./MealPlannerCardDialogV2";
import { MealPlannerCardGridV2 } from "./MealPlannerCardGridV2";
import { MealPlannerItemsDialogV2 } from "./MealPlannerItemsDialogV2";
import {
  canonicalSelectionType,
  issueText,
  mealPlannerErrorMessage,
  normalizeCardType,
  sectionOptionRole,
  sectionTitle,
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

const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
const READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;
const PICKER_KEY = ["dashboard.meal-planner.v2.picker"] as const;

export function MealPlannerWorkspaceV2({
  externalNavigationBlocked = false,
  onNavigationStateChange,
}: {
  externalNavigationBlocked?: boolean;
  onNavigationStateChange?: (state: MealBuilderNavigationState) => void;
}) {
  const queryClient = useQueryClient();
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null);
  const [editor, setEditor] = useState<MealPlannerSectionV2 | "create" | null>(null);
  const [manageTarget, setManageTarget] = useState<MealPlannerSectionV2 | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MealPlannerSectionV2 | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishedOpen, setPublishedOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  const stateQuery = useQuery({
    queryKey: STATE_KEY,
    queryFn: getMealPlannerDashboardState,
    staleTime: 20_000,
  });
  const readinessQuery = useQuery({
    queryKey: READINESS_KEY,
    queryFn: getMealPlannerReadiness,
    staleTime: 20_000,
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
  const deleteMutation = useMutation({ mutationFn: deleteMealPlannerCard });
  const validateMutation = useMutation({ mutationFn: validateMealPlannerDraft });
  const publishMutation = useMutation({ mutationFn: publishMealPlannerDraft });
  const resetMutation = useMutation({ mutationFn: resetMealPlannerDraft });

  const pending =
    cardMutation.isPending ||
    visibilityMutation.isPending ||
    itemsMutation.isPending ||
    deleteMutation.isPending ||
    validateMutation.isPending ||
    publishMutation.isPending ||
    resetMutation.isPending;
  const dirty = editor !== null || manageTarget !== null;
  const state = stateQuery.data?.data;
  const workingConfig = workspace?.draft ?? state?.draft ?? state?.published ?? null;
  const validation = workspace?.validation ?? state?.validation?.draft ?? null;
  const catalog = state?.catalog ?? { products: [], optionGroups: [], options: [] };
  const hasUnpublishedChanges = Boolean(
    workspace ||
      state?.draft ||
      state?.metadata?.hasDraft ||
      state?.metadata?.hasUnpublishedChanges
  );
  const sections = useMemo(
    () =>
      [...(workingConfig?.sections || [])]
        .filter((section) => normalizeCardType(section) !== "system_premium")
        .sort(
          (left, right) =>
            Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
        ),
    [workingConfig?.sections]
  );
  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      const searchable = `${sectionTitle(section)} ${section.key || ""}`.toLowerCase();
      if (query && !searchable.includes(query)) return false;
      if (filterType === "all") return true;
      if (filterType === "direct_product") {
        return normalizeCardType(section) === "direct_product";
      }
      return sectionOptionRole(section) === filterType;
    });
  }, [filterType, search, sections]);
  const allIssues = [
    ...(validation?.errors || []),
    ...(validation?.warnings || []),
  ];
  const draftWorkspaceReady = Boolean(workingConfig && stateQuery.isSuccess);

  useEffect(() => {
    onNavigationStateChange?.({ dirty, pending, draftWorkspaceReady });
  }, [dirty, draftWorkspaceReady, onNavigationStateChange, pending]);

  useEffect(() => {
    return () =>
      onNavigationStateChange?.({
        dirty: false,
        pending: false,
        draftWorkspaceReady: false,
      });
  }, [onNavigationStateChange]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty && !pending) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, pending]);

  function applyAction(response: MealPlannerCardActionResponseV2) {
    const nextWorkspace = {
      draft: response.data.draft,
      validation: response.data.validation,
    };
    setWorkspace(nextWorkspace);
    queryClient.setQueryData<MealPlannerStateResponseV2>(STATE_KEY, (current) =>
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
    void queryClient.invalidateQueries({ queryKey: READINESS_KEY });
    void queryClient.invalidateQueries({ queryKey: PICKER_KEY });
  }

  async function reloadAuthoritative(showToast = false) {
    setWorkspace(null);
    await queryClient.invalidateQueries({ queryKey: PICKER_KEY });
    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);
    if (showToast) toast.success("تم تحديث بيانات منشئ الوجبات");
  }

  async function saveCard(
    payload: MealPlannerCreatePayloadV2,
    previousKey?: string
  ) {
    try {
      const response = await cardMutation.mutateAsync({ payload, previousKey });
      applyAction(response);
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
    try {
      const response = await itemsMutation.mutateAsync({
        sectionKey: manageTarget.key,
        payload:
          cardType === "direct_product"
            ? { productIds: ids }
            : { optionIds: ids },
      });
      applyAction(response);
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
      applyAction(response);
      toast.success(section.visible === false ? "تم إظهار الكارت" : "تم إخفاء الكارت");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر تحديث ظهور الكارت"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const response = await deleteMutation.mutateAsync(deleteTarget.key);
      applyAction(response);
      setDeleteTarget(null);
      toast.success("تم حذف الكارت من تغييرات العمل");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر حذف الكارت"));
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

  if (stateQuery.isLoading) return <WorkspaceLoading />;
  if (stateQuery.error || !state) {
    return (
      <LoadError
        message={mealPlannerErrorMessage(
          stateQuery.error,
          "تحقق من الاتصال وحاول مرة أخرى"
        )}
        onRetry={() => void stateQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <WorkspaceHeader
        versionNumber={state.published?.versionNumber ?? state.metadata?.versionNumber}
        publishedAt={state.published?.publishedAt ?? state.metadata?.publishedAt}
        hasUnpublishedChanges={hasUnpublishedChanges}
        validation={validation}
        readiness={readinessQuery.data?.data ?? null}
        pending={pending}
        onAdd={() => setEditor("create")}
        onReview={() => void review()}
        onPublished={() => setPublishedOpen(true)}
        onRefresh={() => void reloadAuthoritative(true)}
        onReset={() => setResetOpen(true)}
      />

      <StatusPanel
        validation={validation}
        pending={pending}
        onOpenIssues={() => setIssuesOpen(true)}
      />

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الكروت</SelectItem>
            <SelectItem value="direct_product">وجبات كاملة</SelectItem>
            <SelectItem value="protein">خيارات بروتين</SelectItem>
            <SelectItem value="carbs">خيارات كارب</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredSections.length || !search ? (
        <MealPlannerCardGridV2
          premiumSection={state.premiumSection}
          sections={filteredSections}
          issues={allIssues}
          pending={pending}
          onEdit={setEditor}
          onManageItems={setManageTarget}
          onToggleVisibility={(section) => void toggleVisibility(section)}
          onDelete={setDeleteTarget}
        />
      ) : (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
          لا توجد كروت مطابقة للبحث.
        </div>
      )}

      {manageTarget ? (
        <MealPlannerItemsDialogV2
          key={`items-${manageTarget.key}`}
          section={manageTarget}
          pending={itemsMutation.isPending}
          onClose={() => setManageTarget(null)}
          onSave={saveItems}
          onDeleteCard={() => {
            setManageTarget(null);
            setDeleteTarget(manageTarget);
          }}
        />
      ) : null}

      {editor ? (
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

      <ValidationDialog
        open={issuesOpen}
        validation={validation}
        sections={sections}
        onClose={() => setIssuesOpen(false)}
        onOpenSection={(sectionKey) => {
          const section = sections.find((item) => item.key === sectionKey);
          if (section) {
            setIssuesOpen(false);
            setEditor(section);
          }
        }}
      />
      <PublishedDialog
        open={publishedOpen}
        config={state.published}
        onClose={() => setPublishedOpen(false)}
      />
      <PublishDialog
        open={publishOpen}
        pending={publishMutation.isPending}
        notes={publishNotes}
        onNotesChange={setPublishNotes}
        onClose={() => !publishMutation.isPending && setPublishOpen(false)}
        onConfirm={() => void publish()}
      />
      <DeleteDialog
        section={deleteTarget}
        pending={deleteMutation.isPending}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ResetDialog
        open={resetOpen}
        pending={resetMutation.isPending}
        onClose={() => !resetMutation.isPending && setResetOpen(false)}
        onConfirm={() => void reset()}
      />

      {externalNavigationBlocked ? (
        <span className="sr-only">توجد تغييرات محلية تمنع المغادرة</span>
      ) : null}
    </div>
  );
}

function WorkspaceHeader({
  versionNumber,
  publishedAt,
  hasUnpublishedChanges,
  validation,
  readiness,
  pending,
  onAdd,
  onReview,
  onPublished,
  onRefresh,
  onReset,
}: {
  versionNumber?: number | string | null;
  publishedAt?: string | null;
  hasUnpublishedChanges: boolean;
  validation: MealPlannerValidationV2 | null;
  readiness: MealPlannerValidationV2 | null;
  pending: boolean;
  onAdd: () => void;
  onReview: () => void;
  onPublished: () => void;
  onRefresh: () => void;
  onReset: () => void;
}) {
  return (
    <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">منشئ وجبات الاشتراك</h1>
              <Badge variant={hasUnpublishedChanges ? "secondary" : "outline"}>
                {hasUnpublishedChanges
                  ? "تغييرات غير منشورة"
                  : "النسخة المنشورة"}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              أضف وجبات كاملة أو خيارات بروتين وكارب، راجع أخطاء الـBackend، ثم انشر.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:flex">
          <Button type="button" disabled={pending} onClick={onAdd}>
            <Plus className="size-4" /> إضافة كارت
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !hasUnpublishedChanges}
            onClick={onReview}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ClipboardCheck className="size-4" />
            )}
            مراجعة ونشر
          </Button>
          <Button type="button" variant="ghost" onClick={onPublished}>
            <Eye className="size-4" /> المنشور
          </Button>
          <Button type="button" variant="ghost" disabled={pending} onClick={onRefresh}>
            <RefreshCw className="size-4" /> تحديث
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || !hasUnpublishedChanges}
            onClick={onReset}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="size-4" /> إلغاء التغييرات
          </Button>
        </div>
      </div>
      <div className="grid border-t bg-muted/20 sm:grid-cols-3">
        <Metric
          title="النسخة المنشورة"
          value={versionNumber ? `#${versionNumber}` : "غير محدد"}
        />
        <Metric
          title="آخر نشر"
          value={publishedAt ? formatDate(publishedAt) : "لا يوجد تاريخ"}
        />
        <Metric
          title="حالة الجاهزية"
          value={
            readiness?.ready
              ? "جاهز"
              : readiness
                ? "يحتاج إصلاح"
                : validation?.ready
                  ? "جاهزة للنشر"
                  : "غير منشور"
          }
        />
      </div>
    </header>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-b p-3 last:border-b-0 sm:border-b-0 sm:border-l sm:last:border-l-0 sm:p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function StatusPanel({
  validation,
  pending,
  onOpenIssues,
}: {
  validation: MealPlannerValidationV2 | null;
  pending: boolean;
  onOpenIssues: () => void;
}) {
  const errors = validation?.errors?.length || 0;
  const warnings = validation?.warnings?.length || 0;
  const ready = Boolean(validation?.ready && errors === 0);
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
        ready
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20"
          : errors
            ? "border-destructive/30 bg-destructive/5"
            : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        {pending ? (
          <Loader2 className="mt-0.5 size-5 animate-spin" />
        ) : ready ? (
          <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" />
        ) : errors ? (
          <TriangleAlert className="mt-0.5 size-5 text-destructive" />
        ) : (
          <ClipboardCheck className="mt-0.5 size-5" />
        )}
        <div>
          <p className="font-medium">
            {pending
              ? "جاري تنفيذ العملية"
              : ready
                ? warnings
                  ? "جاهزة مع تنبيهات"
                  : "جاهزة للنشر"
                : validation
                  ? "تحتاج مراجعة"
                  : "لم تُراجع بعد"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {validation
              ? `${errors} أخطاء • ${warnings} تنبيهات`
              : "اضغط مراجعة ونشر بعد الانتهاء من تعديل الكروت."}
          </p>
        </div>
      </div>
      {validation && (errors || warnings) ? (
        <Button type="button" variant="outline" size="sm" onClick={onOpenIssues}>
          عرض التفاصيل
        </Button>
      ) : null}
    </div>
  );
}

function ValidationDialog({
  open,
  validation,
  sections,
  onClose,
  onOpenSection,
}: {
  open: boolean;
  validation: MealPlannerValidationV2 | null;
  sections: MealPlannerSectionV2[];
  onClose: () => void;
  onOpenSection: (sectionKey: string) => void;
}) {
  const errors = validation?.errors || [];
  const warnings = validation?.warnings || [];
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-h-[90dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader className="text-right">
          <DialogTitle>نتيجة مراجعة الـBackend</DialogTitle>
          <DialogDescription className="text-right leading-6">
            الأخطاء تمنع النشر. التنبيهات تحتاج مراجعة لكنها لا تمنعه عادةً.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <IssueGroup
            title="أخطاء تمنع النشر"
            issues={errors}
            sections={sections}
            onOpenSection={onOpenSection}
            destructive
          />
          <IssueGroup
            title="تنبيهات"
            issues={warnings}
            sections={sections}
            onOpenSection={onOpenSection}
          />
          {!errors.length && !warnings.length ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100">
              لا توجد أخطاء أو تنبيهات.
            </p>
          ) : null}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueGroup({
  title,
  issues,
  sections,
  onOpenSection,
  destructive = false,
}: {
  title: string;
  issues: MealPlannerValidationIssue[];
  sections: MealPlannerSectionV2[];
  onOpenSection: (sectionKey: string) => void;
  destructive?: boolean;
}) {
  if (!issues.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        {destructive ? (
          <AlertCircle className="size-4 text-destructive" />
        ) : (
          <TriangleAlert className="size-4 text-amber-600" />
        )}
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant={destructive ? "destructive" : "outline"}>
          {issues.length}
        </Badge>
      </div>
      {issues.map((issue, index) => {
        const section = issue.sectionKey
          ? sections.find((item) => item.key === issue.sectionKey)
          : undefined;
        return (
          <div key={`${issue.code}-${index}`} className="rounded-xl border p-3">
            <p className="text-sm leading-6">{issueText(issue)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {issue.code ? (
                <code className="text-[11px] text-muted-foreground">
                  {issue.code}
                </code>
              ) : null}
              {section ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenSection(section.key)}
                >
                  فتح {sectionTitle(section)}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function PublishDialog({
  open,
  pending,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>نشر تغييرات منشئ الوجبات؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            ستصبح الكروت الحالية هي النسخة الظاهرة في تطبيق العميل بعد التأكيد.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="ملاحظة النشر (اختيارية)"
          disabled={pending}
        />
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            تأكيد النشر
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteDialog({
  section,
  pending,
  onClose,
  onConfirm,
}: {
  section: MealPlannerSectionV2 | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={Boolean(section)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>
            حذف كارت «{section ? sectionTitle(section) : ""}»؟
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            سيتم حذفه من تغييرات العمل فقط، ولن يتأثر تطبيق العميل قبل النشر.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            حذف الكارت
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ResetDialog({
  open,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>إلغاء جميع التغييرات غير المنشورة؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            سيتم حذف تغييرات العمل والعودة إلى آخر نسخة منشورة. لا يمكن التراجع.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending}>الاحتفاظ بالتغييرات</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            إلغاء التغييرات
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PublishedDialog({
  open,
  config,
  onClose,
}: {
  open: boolean;
  config: MealPlannerConfigV2 | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        dir="rtl"
        className="max-h-[90dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader className="text-right">
          <DialogTitle>النسخة المنشورة</DialogTitle>
          <DialogDescription className="text-right leading-6">
            عرض للقراءة فقط لما هو منشور حاليًا.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {(config?.sections || []).map((section) => (
            <div
              key={section.key}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <div>
                <p className="text-sm font-medium">{sectionTitle(section)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {canonicalSelectionType(section)}
                </p>
              </div>
              <Badge variant="outline">
                {section.visible === false ? "مخفي" : "ظاهر"}
              </Badge>
            </div>
          ))}
          {!config?.sections?.length ? (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              لا توجد نسخة منشورة.
            </p>
          ) : null}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceLoading() {
  return (
    <div className="space-y-5" dir="rtl" aria-busy="true">
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="grid min-h-80 place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
      dir="rtl"
    >
      <div className="max-w-md space-y-4">
        <AlertCircle className="mx-auto size-10 text-destructive" />
        <div>
          <h2 className="font-semibold">تعذر تحميل منشئ الوجبات</h2>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" /> إعادة المحاولة
        </Button>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
