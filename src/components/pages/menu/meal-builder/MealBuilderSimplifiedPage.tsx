import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  CircleDashed,
  ClipboardCheck,
  Eye,
  FileEdit,
  Layers3,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  invalidateMealBuilderQueries,
  MEAL_BUILDER_PUBLISHED_KEY,
  useCreateMealBuilderDraftMutation,
  useMealBuilderDraftQuery,
  useMealBuilderHydratedQuery,
  useMealBuilderPublishedQuery,
  useMealBuilderQuery,
  useMenuCategoriesQuery,
  useMenuOptionGroupsQuery,
  useMenuOptionsQuery,
  useMenuProductsQuery,
  usePublishMealBuilderDraftMutation,
  useResetMealBuilderDraftMutation,
  useSaveMealBuilderDraftMutation,
  useValidateMealBuilderDraftMutation,
} from "@/hooks/menu";
import type {
  MenuCategory,
  MenuOption,
  MenuOptionGroup,
  MenuProduct,
} from "@/types/menuTypes";
import type {
  MealBuilderCardActionResponse,
  MealBuilderCheck,
  MealBuilderConfig,
  MealBuilderPremiumSection,
  MealBuilderSection,
  MealBuilderValidation,
} from "@/types/mealBuilderTypes";
import { MealBuilderDirectCards } from "./MealBuilderDirectCards";
import { MealBuilderSimpleCardEditor } from "./MealBuilderSimpleCardEditor";
import {
  isDirectProductCard,
  selectedProductsForDirectCard,
} from "./mealBuilderDirectCardUtils";
import {
  mealBuilderErrorMessage,
  toEditableMealBuilderSections,
} from "./mealBuilderFrontendUtils";
import { orderSections, toBackendSections } from "./mealBuilderUtils";
import {
  buildMealBuilderVisualCards,
  type MealBuilderVisualCard,
  type MealBuilderVisualItem,
} from "./mealBuilderVisualModel";

export type MealBuilderNavigationState = {
  dirty: boolean;
  pending: boolean;
  draftWorkspaceReady: boolean;
};

type PageMode = "loading" | "draft" | "published";

type Catalog = {
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
};

type DirectBusyState = { dirty: boolean; pending: boolean };

export function MealBuilderSimplifiedPage({
  externalNavigationBlocked = false,
  onNavigationStateChange,
}: {
  externalNavigationBlocked?: boolean;
  onNavigationStateChange?: (state: MealBuilderNavigationState) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PageMode>("loading");
  const [sections, setSections] = useState<MealBuilderSection[]>([]);
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState<MealBuilderValidation | null>(null);
  const [directBusy, setDirectBusy] = useState<DirectBusyState>({ dirty: false, pending: false });
  const [legacyEditorKey, setLegacyEditorKey] = useState<string | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesDiscardOpen, setNotesDiscardOpen] = useState(false);
  const [legacyDiscardOpen, setLegacyDiscardOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [showPublishedConfirm, setShowPublishedConfirm] = useState(false);
  const initializedRef = useRef(false);

  const builderQuery = useMealBuilderQuery();
  const publishedQuery = useMealBuilderPublishedQuery();
  const state = builderQuery.data?.data ?? null;
  const hasDraft = Boolean(state?.metadata?.hasDraft || state?.draft);
  const draftQuery = useMealBuilderDraftQuery(mode === "draft" || hasDraft);
  const hydratedQuery = useMealBuilderHydratedQuery(
    (mode === "draft" || hasDraft) && draftQuery.isSuccess
  );

  const loadCatalog = mode !== "loading";
  const productsQuery = useMenuProductsQuery(
    { limit: 500, includeInactive: true },
    loadCatalog
  );
  const categoriesQuery = useMenuCategoriesQuery(
    { limit: 500, includeInactive: true },
    loadCatalog
  );
  const groupsQuery = useMenuOptionGroupsQuery(
    { limit: 500, includeInactive: true },
    loadCatalog
  );
  const optionsQuery = useMenuOptionsQuery(
    { limit: 1000, includeInactive: true },
    loadCatalog
  );

  const createDraft = useCreateMealBuilderDraftMutation();
  const saveDraft = useSaveMealBuilderDraftMutation();
  const validateDraft = useValidateMealBuilderDraftMutation();
  const publishDraft = usePublishMealBuilderDraftMutation();
  const resetDraft = useResetMealBuilderDraftMutation();

  const catalog: Catalog = {
    products: productsQuery.data?.data.items ?? [],
    categories: categoriesQuery.data?.data.items ?? [],
    groups: groupsQuery.data?.data.items ?? [],
    options: optionsQuery.data?.data.items ?? [],
  };
  const catalogReady =
    productsQuery.isSuccess &&
    categoriesQuery.isSuccess &&
    groupsQuery.isSuccess &&
    optionsQuery.isSuccess;

  const authoritativeDraft =
    hydratedQuery.data?.data.draft ??
    (draftQuery.data?.data.config as MealBuilderConfig | null | undefined) ??
    state?.draft ??
    null;
  const publishedConfig =
    (publishedQuery.data?.data.config as MealBuilderConfig | null | undefined) ??
    state?.published ??
    null;
  const draftPremium =
    hydratedQuery.data?.data.premiumSection ?? state?.premiumSection ?? null;
  const publishedPremium =
    publishedQuery.data?.data.premiumSection ?? state?.premiumSection ?? null;
  const authoritativeValidation =
    hydratedQuery.data?.data.validation ??
    state?.validation?.draft ??
    null;

  const ownPending =
    createDraft.isPending ||
    saveDraft.isPending ||
    validateDraft.isPending ||
    publishDraft.isPending ||
    resetDraft.isPending;
  const notesDirty = notesOpen && notesDraft !== notes;
  const dirty = directBusy.dirty || notesDirty || Boolean(legacyEditorKey);
  const pending = ownPending || directBusy.pending;
  const draftWorkspaceReady =
    mode === "draft" && Boolean(authoritativeDraft) && hydratedQuery.isSuccess;

  useEffect(() => {
    if (initializedRef.current || !builderQuery.isSuccess) return;
    initializedRef.current = true;
    setMode(hasDraft ? "draft" : "published");
  }, [builderQuery.isSuccess, hasDraft]);

  useEffect(() => {
    if (!authoritativeDraft || pending || directBusy.dirty || legacyEditorKey) return;
    setSections(toEditableMealBuilderSections(orderSections(authoritativeDraft.sections)));
    setNotes(authoritativeDraft.notes ?? "");
    setValidation(authoritativeValidation);
  }, [
    authoritativeDraft,
    authoritativeValidation,
    directBusy.dirty,
    legacyEditorKey,
    pending,
  ]);

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

  const draftCards = useMemo(
    () =>
      buildCards(
        sections,
        catalog,
        validation,
        draftPremium
      ),
    [catalog, draftPremium, sections, validation]
  );

  const publishedCards = useMemo(
    () =>
      buildCards(
        publishedConfig?.sections ?? [],
        catalog,
        state?.validation?.published ?? null,
        publishedPremium
      ),
    [catalog, publishedConfig?.sections, publishedPremium, state?.validation?.published]
  );
  const selectedLegacyCard = legacyEditorKey
    ? draftCards.visual.find((card) => card.key === legacyEditorKey) ?? null
    : null;

  async function refreshAll(showToast = true) {
    await Promise.all([
      invalidateMealBuilderQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_PUBLISHED_KEY] }),
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      groupsQuery.refetch(),
      optionsQuery.refetch(),
    ]);
    if (showToast) toast.success("تم تحديث منشئ الوجبات");
  }

  async function openDraft() {
    if (pending) return;
    if (authoritativeDraft || hasDraft) {
      setMode("draft");
      return;
    }
    try {
      const response = await createDraft.mutateAsync();
      const created = response.data;
      setSections(toEditableMealBuilderSections(orderSections(created.sections)));
      setNotes(created.notes ?? "");
      setValidation(null);
      setMode("draft");
      await refreshAll(false);
    } catch {
      // The mutation hook owns the Arabic error toast.
    }
  }

  async function saveFullDraft(
    nextSections: MealBuilderSection[] = sections,
    nextNotes: string = notes
  ) {
    const response = await saveDraft.mutateAsync({
      sections: toBackendSections(nextSections),
      notes: nextNotes,
    });
    const saved = response.data;
    setSections(toEditableMealBuilderSections(orderSections(saved.sections)));
    setNotes(saved.notes ?? nextNotes);
    setValidation(null);
    return saved;
  }

  async function saveLegacyCard(nextSections: MealBuilderSection[]) {
    try {
      await saveFullDraft(nextSections, notes);
      setLegacyEditorKey(null);
    } catch {
      // Keep the editor open; the mutation hook owns the error toast.
    }
  }

  async function saveNotes() {
    try {
      await saveFullDraft(sections, notesDraft);
      setNotesOpen(false);
      setNotesDiscardOpen(false);
    } catch {
      // Keep entered notes and dialog open.
    }
  }

  function requestNotesClose() {
    if (saveDraft.isPending) return;
    if (notesDraft !== notes) {
      setNotesDiscardOpen(true);
      return;
    }
    setNotesOpen(false);
  }

  function requestLegacyEditorClose() {
    if (saveDraft.isPending) return;
    setLegacyDiscardOpen(true);
  }

  async function beforeDirectAction() {
    if (notesDirty) await saveFullDraft(sections, notesDraft);
  }

  function applyDirectAction(response: MealBuilderCardActionResponse) {
    const nextDraft = response.data.draft;
    setSections(toEditableMealBuilderSections(orderSections(nextDraft.sections)));
    setNotes(nextDraft.notes ?? notes);
    setValidation(response.data.validation);
  }

  async function reviewAndPublish() {
    if (pending || directBusy.dirty || legacyEditorKey) return;
    try {
      if (notesDirty) await saveFullDraft(sections, notesDraft);
      const response = await validateDraft.mutateAsync(undefined);
      setValidation(response.data);
      if (response.data.ready && response.data.errors.length === 0) {
        setPublishOpen(true);
      } else {
        setIssuesOpen(true);
      }
    } catch {
      // The mutation hook owns the error toast.
    }
  }

  async function confirmPublish() {
    try {
      await publishDraft.mutateAsync(publishNote.trim() || undefined);
      setPublishOpen(false);
      setPublishNote("");
      setMode("published");
      await refreshAll(false);
    } catch {
      // Keep dialog open for retry.
    }
  }

  async function confirmReset() {
    try {
      await resetDraft.mutateAsync();
      setResetOpen(false);
      setLegacyEditorKey(null);
      setValidation(null);
      setMode("draft");
      await refreshAll(false);
    } catch {
      // The mutation hook owns the error toast.
    }
  }

  function requestPublishedView() {
    if (pending) return;
    if (dirty) {
      if (!externalNavigationBlocked) setShowPublishedConfirm(true);
      return;
    }
    setMode("published");
  }

  const firstLoadError =
    builderQuery.error ||
    publishedQuery.error ||
    (mode === "draft" ? draftQuery.error || hydratedQuery.error : null);

  if (mode === "loading" || builderQuery.isLoading) {
    return <MealBuilderLoading />;
  }

  if (firstLoadError) {
    return (
      <LoadError
        message={mealBuilderErrorMessage(
          firstLoadError,
          "تعذر تحميل منشئ الوجبات"
        )}
        onRetry={() => void refreshAll(false)}
      />
    );
  }

  if (mode === "published") {
    return (
      <div className="space-y-5" dir="rtl">
        <WorkspaceHero
          mode="published"
          pending={pending}
          onOpenDraft={() => void openDraft()}
          onShowPublished={() => undefined}
          onReview={() => undefined}
          onOpenNotes={() => undefined}
          onRefresh={() => void refreshAll()}
          onReset={() => undefined}
          hasDraft={Boolean(authoritativeDraft || hasDraft)}
        />
        <PublishedNotice publishedAt={publishedConfig?.publishedAt ?? null} />
        {publishedConfig ? (
          <UnifiedReadOnlyCards cards={publishedCards} />
        ) : (
          <EmptyPublished onStart={() => void openDraft()} pending={pending} />
        )}
      </div>
    );
  }

  if (!authoritativeDraft || !draftWorkspaceReady) {
    return <MealBuilderLoading message="جاري تجهيز مسودة التعديل..." />;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <WorkspaceHero
        mode="draft"
        pending={pending}
        onOpenDraft={() => undefined}
        onShowPublished={requestPublishedView}
        onReview={() => void reviewAndPublish()}
        onOpenNotes={() => {
          setNotesDraft(notes);
          setNotesOpen(true);
        }}
        onRefresh={() => void refreshAll()}
        onReset={() => setResetOpen(true)}
        hasDraft
      />

      <DraftNotice />
      <WorkspaceStatus validation={validation} pending={pending} dirty={dirty} onReview={() => setIssuesOpen(true)} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">بطاقات منشئ الوجبات</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              كل إجراء موجود داخل البطاقة التي يؤثر عليها. عدّل البطاقات ثم اضغط مراجعة ونشر.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {draftCards.totalCount} بطاقات
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <MealBuilderDirectCards
            sections={sections}
            validation={validation}
            parentPending={ownPending}
            onBeforeAction={beforeDirectAction}
            onActionApplied={applyDirectAction}
            onBusyChange={setDirectBusy}
          />
          {draftCards.visual.map((card) => (
            <LegacyOrPremiumCard
              key={card.key}
              card={card}
              pending={pending || !catalogReady}
              onEdit={() => setLegacyEditorKey(card.key)}
              readOnly={false}
            />
          ))}
        </div>
      </section>

      {selectedLegacyCard ? (
        <MealBuilderSimpleCardEditor
          key={selectedLegacyCard.key}
          open
          card={selectedLegacyCard}
          sections={sections}
          catalog={catalog}
          onClose={requestLegacyEditorClose}
          onSave={(nextSections) => void saveLegacyCard(nextSections)}
        />
      ) : null}

      <IssuesDialog
        open={issuesOpen}
        validation={validation}
        onClose={() => setIssuesOpen(false)}
      />
      <PublishDialog
        open={publishOpen}
        note={publishNote}
        pending={publishDraft.isPending}
        onNoteChange={setPublishNote}
        onClose={() => !publishDraft.isPending && setPublishOpen(false)}
        onConfirm={() => void confirmPublish()}
      />
      <NotesDialog
        open={notesOpen}
        value={notesDraft}
        pending={saveDraft.isPending}
        onChange={setNotesDraft}
        onClose={requestNotesClose}
        onSave={() => void saveNotes()}
      />
      <DiscardChangesDialog
        open={notesDiscardOpen}
        title="تجاهل ملاحظات المسودة؟"
        description="توجد ملاحظات لم يتم حفظها. يمكنك العودة وحفظها أو تجاهلها وإغلاق النافذة."
        onClose={() => setNotesDiscardOpen(false)}
        onDiscard={() => {
          setNotesDiscardOpen(false);
          setNotesDraft(notes);
          setNotesOpen(false);
        }}
      />
      <DiscardChangesDialog
        open={legacyDiscardOpen}
        title="إغلاق تعديل المكونات؟"
        description="قد توجد تعديلات لم تُحفظ داخل محرر البطاقة. ارجع للمحرر لحفظها أو تجاهلها وإغلاقه."
        onClose={() => setLegacyDiscardOpen(false)}
        onDiscard={() => {
          setLegacyDiscardOpen(false);
          setLegacyEditorKey(null);
        }}
      />
      <ResetDialog
        open={resetOpen}
        pending={resetDraft.isPending}
        onClose={() => !resetDraft.isPending && setResetOpen(false)}
        onConfirm={() => void confirmReset()}
      />
      <DiscardToPublishedDialog
        open={showPublishedConfirm}
        onClose={() => setShowPublishedConfirm(false)}
        onConfirm={() => {
          setShowPublishedConfirm(false);
          setLegacyEditorKey(null);
          setMode("published");
        }}
      />
    </div>
  );
}

function buildCards(
  sections: MealBuilderSection[],
  catalog: Catalog,
  validation: MealBuilderValidation | null,
  premiumSection: MealBuilderPremiumSection | null
) {
  const directKeys = new Set(
    sections.filter(isDirectProductCard).map((section) => section.key).filter(Boolean)
  );
  const visual = buildMealBuilderVisualCards({
    sections,
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues: validation ? [...validation.errors, ...validation.warnings] : [],
    premiumSection,
  }).filter((card) => !directKeys.has(card.key));
  return {
    direct: sections.filter(isDirectProductCard),
    visual,
    totalCount: sections.filter(isDirectProductCard).length + visual.length,
  };
}

function WorkspaceHero({
  mode,
  pending,
  onOpenDraft,
  onShowPublished,
  onReview,
  onOpenNotes,
  onRefresh,
  onReset,
  hasDraft,
}: {
  mode: "draft" | "published";
  pending: boolean;
  onOpenDraft: () => void;
  onShowPublished: () => void;
  onReview: () => void;
  onOpenNotes: () => void;
  onRefresh: () => void;
  onReset: () => void;
  hasDraft: boolean;
}) {
  return (
    <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Layers3 className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">منشئ وجبات الاشتراك</h1>
              <Badge variant={mode === "draft" ? "secondary" : "outline"}>
                {mode === "draft" ? "مسودة التعديل" : "النسخة المنشورة"}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              العملية بسيطة: عدّل البطاقات، راجع المشاكل، ثم انشر التغييرات للتطبيق.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mode === "draft" ? (
            <>
              <Button type="button" disabled={pending} onClick={onReview} className="w-full sm:w-auto">
                {pending ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
                مراجعة ونشر
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={onShowPublished} className="w-full sm:w-auto">
                <Eye className="size-4" />
                عرض النسخة المنشورة
              </Button>
            </>
          ) : (
            <Button type="button" disabled={pending} onClick={onOpenDraft} className="w-full sm:w-auto">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <FileEdit className="size-4" />}
              {hasDraft ? "العودة إلى المسودة" : "ابدأ التعديل"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon" variant="outline" disabled={pending} aria-label="المزيد من إجراءات منشئ الوجبات">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 text-right">
              {mode === "draft" ? (
                <DropdownMenuItem onClick={onOpenNotes}>
                  <StickyNote className="size-4" />
                  ملاحظات المسودة
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onRefresh}>
                <RefreshCw className="size-4" />
                تحديث البيانات
              </DropdownMenuItem>
              {mode === "draft" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onReset}>
                    <RotateCcw className="size-4" />
                    إعادة المسودة للنسخة المنشورة
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid border-t bg-muted/20 sm:grid-cols-3">
        <Step number="1" title="عدّل البطاقات" description="الإجراءات موجودة داخل كل بطاقة" />
        <Step number="2" title="راجع المشاكل" description="الـBackend يحدد الجاهزية" />
        <Step number="3" title="انشر" description="التطبيق يتغير بعد النشر فقط" />
      </div>
    </header>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border-b p-3 last:border-b-0 sm:border-b-0 sm:border-l sm:last:border-l-0 sm:p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-sm font-semibold ring-1 ring-border">
        {number}
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function DraftNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
      <FileEdit className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-medium">أنت تعدّل مسودة</p>
        <p className="mt-1 text-sm leading-6 opacity-85">
          احفظ تعديلاتك داخل البطاقات، ثم استخدم «مراجعة ونشر». تطبيق العميل والجوال لن يتغيرا قبل النشر.
        </p>
      </div>
    </div>
  );
}

function PublishedNotice({ publishedAt }: { publishedAt: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-medium">هذه النسخة الظاهرة حاليا للعميل</p>
        <p className="mt-1 text-sm opacity-85">
          {publishedAt ? `آخر نشر: ${formatDate(publishedAt)}` : "لم يتم تسجيل وقت النشر."}
        </p>
      </div>
    </div>
  );
}

function WorkspaceStatus({
  validation,
  pending,
  dirty,
  onReview,
}: {
  validation: MealBuilderValidation | null;
  pending: boolean;
  dirty: boolean;
  onReview: () => void;
}) {
  const errors = validation?.errors.length ?? 0;
  const warnings = validation?.warnings.length ?? 0;
  const ready = Boolean(validation?.ready && errors === 0);
  const state = pending
    ? { title: "جاري تنفيذ العملية...", description: "انتظر حتى ينتهي الحفظ أو التحديث.", icon: Loader2, tone: "border-primary/30 bg-primary/5" }
    : dirty
      ? { title: "توجد تعديلات لم تُحفظ بعد", description: "أكمل التعديل أو احفظ قبل المراجعة والنشر.", icon: CircleDashed, tone: "border-amber-300 bg-amber-50 dark:bg-amber-950/20" }
      : ready
        ? { title: "المسودة جاهزة للنشر", description: warnings ? `توجد ${warnings} تنبيهات لا تمنع النشر.` : "لا توجد أخطاء تمنع النشر.", icon: CheckCircle2, tone: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" }
        : errors
          ? { title: `يوجد ${errors} أخطاء تمنع النشر`, description: "راجع المشاكل المرتبطة بالبطاقات ثم أعد الفحص.", icon: AlertCircle, tone: "border-destructive/35 bg-destructive/5" }
          : { title: "المسودة تحتاج مراجعة", description: "اضغط «مراجعة ونشر» ليقوم الـBackend بفحص الجاهزية.", icon: ClipboardCheck, tone: "border-border bg-muted/20" };
  const Icon = state.icon;

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${state.tone}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${pending ? "animate-spin" : ""}`} />
        <div>
          <p className="font-medium">{state.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{state.description}</p>
        </div>
      </div>
      {(errors || warnings) && validation ? (
        <Button type="button" variant="outline" size="sm" onClick={onReview} className="w-full sm:w-auto">
          مراجعة المشاكل
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function LegacyOrPremiumCard({
  card,
  pending,
  onEdit,
  readOnly,
}: {
  card: MealBuilderVisualCard;
  pending: boolean;
  onEdit: () => void;
  readOnly: boolean;
}) {
  const premium = card.key === "premium";
  const issueCount = card.errors.length + card.backendIssues.filter((issue) => issue.level === "error").length;
  const previewItems = card.items.slice(0, 3);

  return (
    <article className="flex min-h-64 flex-col rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{card.labelAr}</h3>
            <Badge variant={premium ? "secondary" : issueCount ? "destructive" : "outline"}>
              {premium ? "تدار تلقائيا" : issueCount ? `${issueCount} مشاكل` : "جاهزة"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {card.items.length} {card.items.length === 1 ? "عنصر" : "عناصر"}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          {premium ? <Settings2 className="size-4" /> : <Package className="size-4" />}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {previewItems.map((item) => (
          <VisualItemPreview key={`${item.kind}:${item.id}`} item={item} />
        ))}
        {!previewItems.length ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            لا توجد عناصر ظاهرة حاليا في هذه البطاقة.
          </p>
        ) : null}
        {card.items.length > 3 ? (
          <p className="text-xs text-muted-foreground">+{card.items.length - 3} عناصر أخرى</p>
        ) : null}
      </div>

      {card.backendIssues.length || card.errors.length || card.warnings.length ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100">
          {firstCardMessage(card)}
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        {premium ? (
          <p className="rounded-xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">
            محتوى Premium يُدار تلقائيا من الـBackend ولا يحتاج إجراء يدوي هنا.
          </p>
        ) : readOnly ? (
          <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">عرض فقط ضمن النسخة المنشورة.</p>
        ) : (
          <Button type="button" variant="outline" disabled={pending} onClick={onEdit} className="w-full">
            <Pencil className="size-4" />
            تعديل المكونات
          </Button>
        )}
      </div>
    </article>
  );
}

function UnifiedReadOnlyCards({
  cards,
}: {
  cards: ReturnType<typeof buildCards>;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">البطاقات المنشورة</h2>
        <p className="mt-1 text-sm text-muted-foreground">عرض فقط للنسخة التي يستهلكها التطبيق حاليا.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cards.direct.map((section) => {
          const products = selectedProductsForDirectCard(section);
          return (
            <article key={section.key} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{section.titleOverride?.ar || section.titleOverride?.en || section.key}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{products.length} منتجات</p>
                </div>
                <Badge variant="outline">{section.visible === false ? "مخفية" : "ظاهرة"}</Badge>
              </div>
              <div className="mt-4 grid gap-2">
                {products.slice(0, 3).map((product) => (
                  <div key={product.productId || product.id || product.key} className="flex items-center gap-3 rounded-xl border p-2.5">
                    <ProductPlaceholder imageUrl={product.imageUrl} />
                    <p className="truncate text-sm font-medium">{product.name?.ar || product.name?.en || product.label || product.key}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
        {cards.visual.map((card) => (
          <LegacyOrPremiumCard key={card.key} card={card} pending onEdit={() => undefined} readOnly />
        ))}
      </div>
    </section>
  );
}

function VisualItemPreview({ item }: { item: MealBuilderVisualItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
      <ProductPlaceholder imageUrl={item.imageUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{item.kind === "product" ? "منتج" : "خيار"}</p>
      </div>
    </div>
  );
}

function ProductPlaceholder({ imageUrl }: { imageUrl?: string | null }) {
  return imageUrl ? (
    <img src={imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
      <Package className="size-4" />
    </span>
  );
}

function IssuesDialog({
  open,
  validation,
  onClose,
}: {
  open: boolean;
  validation: MealBuilderValidation | null;
  onClose: () => void;
}) {
  const issues = validation ? [...validation.errors, ...validation.warnings] : [];
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="grid max-h-[88dvh] w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0" dir="rtl">
        <DialogHeader className="border-b px-4 py-4 text-right sm:px-6">
          <DialogTitle>مراجعة المسودة</DialogTitle>
          <DialogDescription>
            هذه النتائج قادمة من فحص الـBackend وهي المصدر النهائي لقرار الجاهزية.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto p-4 sm:p-6">
          {issues.length ? (
            issues.map((issue, index) => <IssueRow key={`${issue.code || "issue"}-${index}`} issue={issue} />)
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
              لا توجد مشاكل مسجلة. اضغط «مراجعة ونشر» لإجراء فحص جديد.
            </div>
          )}
        </div>
        <DialogFooter className="border-t px-4 py-3 sm:justify-start sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueRow({ issue }: { issue: MealBuilderCheck }) {
  const error = issue.level === "error";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${error ? "border-destructive/30 bg-destructive/5" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"}`}>
      {error ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" /> : <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />}
      <div className="min-w-0">
        <p className="font-medium">{error ? "خطأ يمنع النشر" : "تنبيه"}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{issue.message || issue.code || "مشكلة تحتاج مراجعة"}</p>
        {typeof issue.sectionIndex === "number" ? (
          <p className="mt-2 text-xs text-muted-foreground">البطاقة رقم {issue.sectionIndex + 1}</p>
        ) : null}
      </div>
    </div>
  );
}

function PublishDialog({
  open,
  note,
  pending,
  onNoteChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  note: string;
  pending: boolean;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>نشر المسودة؟</DialogTitle>
          <DialogDescription>
            المسودة اجتازت الفحص. بعد النشر ستصبح هذه البطاقات هي النسخة الظاهرة في تطبيق العميل والجوال.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="meal-builder-publish-note" className="text-sm font-medium">ملاحظة النشر (اختيارية)</label>
          <Textarea id="meal-builder-publish-note" value={note} onChange={(event) => onNoteChange(event.target.value)} disabled={pending} rows={4} />
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" disabled={pending} onClick={onConfirm} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            نشر الآن
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="w-full sm:w-auto">إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotesDialog({
  open,
  value,
  pending,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ملاحظات المسودة</DialogTitle>
          <DialogDescription>ملاحظات داخلية تساعد فريق الإدارة ولا تظهر للعميل.</DialogDescription>
        </DialogHeader>
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={pending} rows={7} placeholder="اكتب ملاحظة عن التغييرات الحالية..." />
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" disabled={pending} onClick={onSave} className="w-full sm:w-auto">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
            حفظ الملاحظات
          </Button>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="w-full sm:w-auto">إلغاء</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscardChangesDialog({
  open,
  title,
  description,
  onClose,
  onDiscard,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel onClick={onClose}>متابعة التعديل</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            تجاهل وإغلاق
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
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>إعادة المسودة للنسخة المنشورة؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            سيتم تجاهل جميع تغييرات المسودة الحالية وإعادتها لتطابق آخر نسخة منشورة. لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            إعادة المسودة
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DiscardToPublishedDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>عرض النسخة المنشورة؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            توجد نافذة تعديل أو اختيارات غير محفوظة. أغلقها أو احفظها أولا حتى لا تفقد عملك.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel>العودة للتعديل</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>تجاهل الاختيارات المؤقتة</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center" dir="rtl">
      <AlertCircle className="mx-auto size-8 text-destructive" />
      <h2 className="mt-3 font-semibold">تعذر تحميل منشئ الوجبات</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry} className="mt-4">
        <RefreshCw className="size-4" /> إعادة المحاولة
      </Button>
    </div>
  );
}

function MealBuilderLoading({ message = "جاري تحميل منشئ الوجبات..." }: { message?: string }) {
  return (
    <div className="space-y-4" dir="rtl" aria-label={message}>
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function EmptyPublished({ onStart, pending }: { onStart: () => void; pending: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
      <CircleDashed className="mx-auto size-10 text-muted-foreground" />
      <h2 className="mt-4 text-lg font-semibold">لا توجد نسخة منشورة بعد</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        ابدأ مسودة جديدة، جهز البطاقات، ثم راجعها وانشرها لتظهر في التطبيق.
      </p>
      <Button type="button" onClick={onStart} disabled={pending} className="mt-5">
        <FileEdit className="size-4" /> ابدأ التعديل
      </Button>
    </div>
  );
}

function firstCardMessage(card: MealBuilderVisualCard) {
  const backend = card.backendIssues[0];
  return backend?.message || backend?.code || card.errors[0] || card.warnings[0] || "توجد ملاحظة تحتاج مراجعة.";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
