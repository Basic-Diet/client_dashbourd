import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
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
  MealBuilderHydratedItem,
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
import { mealBuilderIssueText } from "./mealBuilderIssueText";
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

type WorkspaceSnapshot = {
  sections: MealBuilderSection[];
  notes: string;
  validation: MealBuilderValidation | null;
};

type DirectBusyState = { dirty: boolean; pending: boolean };

type BuiltCards = {
  direct: MealBuilderSection[];
  visual: MealBuilderVisualCard[];
  totalCount: number;
};

export function MealBuilderSimplifiedPage({
  externalNavigationBlocked = false,
  onNavigationStateChange,
}: {
  externalNavigationBlocked?: boolean;
  onNavigationStateChange?: (state: MealBuilderNavigationState) => void;
}) {
  const queryClient = useQueryClient();
  const [modeOverride, setMode] = useState<Exclude<PageMode, "loading"> | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [directBusy, setDirectBusy] = useState<DirectBusyState>({
    dirty: false,
    pending: false,
  });
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

  const builderQuery = useMealBuilderQuery();
  const publishedQuery = useMealBuilderPublishedQuery();
  const state = builderQuery.data?.data ?? null;
  const hasDraft = Boolean(state?.metadata?.hasDraft || state?.draft);
  const mode: PageMode =
    modeOverride ??
    (builderQuery.isSuccess ? (hasDraft ? "draft" : "published") : "loading");

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

  const catalogProducts = productsQuery.data?.data.items;
  const catalogCategories = categoriesQuery.data?.data.items;
  const catalogGroups = groupsQuery.data?.data.items;
  const catalogOptions = optionsQuery.data?.data.items;
  const catalog = useMemo<Catalog>(
    () => ({
      products: catalogProducts ?? [],
      categories: catalogCategories ?? [],
      groups: catalogGroups ?? [],
      options: catalogOptions ?? [],
    }),
    [catalogCategories, catalogGroups, catalogOptions, catalogProducts]
  );
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
    hydratedQuery.data?.data.validation ?? state?.validation?.draft ?? null;

  const serverSections = useMemo(
    () =>
      authoritativeDraft
        ? toEditableMealBuilderSections(orderSections(authoritativeDraft.sections))
        : [],
    [authoritativeDraft]
  );
  const serverNotes = authoritativeDraft?.notes ?? "";
  const sections = workspace?.sections ?? serverSections;
  const notes = workspace?.notes ?? serverNotes;
  const validation = workspace?.validation ?? authoritativeValidation;

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

  const draftCards = useMemo(
    () => buildCards(sections, catalog, validation, draftPremium),
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

  function updateWorkspaceValidation(nextValidation: MealBuilderValidation | null) {
    setWorkspace((current) => ({
      sections: current?.sections ?? serverSections,
      notes: current?.notes ?? serverNotes,
      validation: nextValidation,
    }));
  }

  async function refreshAll(showToast = true) {
    await Promise.all([
      invalidateMealBuilderQueries(queryClient),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_PUBLISHED_KEY] }),
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      groupsQuery.refetch(),
      optionsQuery.refetch(),
    ]);
    setWorkspace(null);
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
      setWorkspace({
        sections: toEditableMealBuilderSections(orderSections(created.sections)),
        notes: created.notes ?? "",
        validation: null,
      });
      setMode("draft");
      await refreshAll(false);
    } catch {
      // Mutation hook presents the localized error.
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
    setWorkspace({
      sections: toEditableMealBuilderSections(orderSections(saved.sections)),
      notes: saved.notes ?? nextNotes,
      validation: null,
    });
    return saved;
  }

  async function saveLegacyCard(nextSections: MealBuilderSection[]) {
    try {
      await saveFullDraft(nextSections, notes);
      setLegacyEditorKey(null);
    } catch {
      // Keep the editor open so the user can retry.
    }
  }

  async function saveNotes() {
    try {
      await saveFullDraft(sections, notesDraft);
      setNotesOpen(false);
      setNotesDiscardOpen(false);
    } catch {
      // Keep the entered notes and dialog open.
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
    setWorkspace({
      sections: toEditableMealBuilderSections(orderSections(nextDraft.sections)),
      notes: nextDraft.notes ?? notes,
      validation: response.data.validation,
    });
  }

  async function reviewAndPublish() {
    if (pending || dirty) return;
    try {
      const response = await validateDraft.mutateAsync(undefined);
      updateWorkspaceValidation(response.data);
      if (response.data.ready && response.data.errors.length === 0) {
        setPublishOpen(true);
      } else {
        setIssuesOpen(true);
      }
    } catch {
      // Mutation hook presents the localized error.
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
      // Keep the confirmation dialog open for retry.
    }
  }

  async function confirmReset() {
    try {
      await resetDraft.mutateAsync();
      setResetOpen(false);
      setLegacyEditorKey(null);
      setWorkspace(null);
      setMode("draft");
      await refreshAll(false);
    } catch {
      // Mutation hook presents the localized error.
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
    (mode === "published"
      ? publishedQuery.error
      : draftQuery.error || hydratedQuery.error) ||
    productsQuery.error ||
    categoriesQuery.error ||
    groupsQuery.error ||
    optionsQuery.error;

  if (mode === "loading" || builderQuery.isLoading) {
    return <MealBuilderLoading />;
  }

  if (firstLoadError) {
    return (
      <LoadError
        message={mealBuilderErrorMessage(firstLoadError, "تعذر تحميل منشئ الوجبات")}
        onRetry={() => void refreshAll(false)}
      />
    );
  }

  if (mode === "published") {
    return (
      <div className="space-y-5" dir="rtl">
        <WorkspaceHero
          mode="published"
          busy={pending}
          reviewDisabled
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
          <ReadOnlyCards cards={publishedCards} />
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
        busy={pending}
        reviewDisabled={dirty || !catalogReady}
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
      <WorkspaceStatus
        validation={validation}
        pending={pending}
        dirty={dirty}
        onReview={() => setIssuesOpen(true)}
      />

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
            <LegacyCard
              key={card.key}
              card={card}
              pending={pending || !catalogReady}
              onEdit={() => setLegacyEditorKey(card.key)}
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
          setWorkspace(null);
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
): BuiltCards {
  const direct = sections.filter(isDirectProductCard);
  const directKeys = new Set(direct.map((section) => section.key).filter(Boolean));
  const issues = validation ? [...validation.errors, ...validation.warnings] : [];
  const visual = buildMealBuilderVisualCards({
    sections,
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues,
    premiumSection,
  }).filter((card) => !directKeys.has(card.key));
  return {
    direct,
    visual,
    totalCount: direct.length + visual.length,
  };
}

function WorkspaceHero({
  mode,
  busy,
  reviewDisabled,
  onOpenDraft,
  onShowPublished,
  onReview,
  onOpenNotes,
  onRefresh,
  onReset,
  hasDraft,
}: {
  mode: "draft" | "published";
  busy: boolean;
  reviewDisabled: boolean;
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
              <Button
                type="button"
                disabled={busy || reviewDisabled}
                onClick={onReview}
                className="w-full sm:w-auto"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="size-4" />
                )}
                مراجعة ونشر
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onShowPublished}
                className="w-full sm:w-auto"
              >
                <Eye className="size-4" />
                عرض النسخة المنشورة
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={busy}
              onClick={onOpenDraft}
              className="w-full sm:w-auto"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileEdit className="size-4" />
              )}
              {hasDraft ? "العودة إلى المسودة" : "ابدأ التعديل"}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={busy}
                aria-label="المزيد من إجراءات منشئ الوجبات"
              >
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
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onReset}
                  >
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
        <Step number="2" title="راجع المشاكل" description="الخادم يحدد الجاهزية" />
        <Step number="3" title="انشر" description="التطبيق يتغير بعد النشر فقط" />
      </div>
    </header>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
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
        <p className="font-medium">هذه هي النسخة الظاهرة للعملاء</p>
        <p className="mt-1 text-sm leading-6 opacity-85">
          {publishedAt
            ? `آخر نشر: ${formatDate(publishedAt)}`
            : "لا يوجد تاريخ نشر متاح من الخادم."}
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
  const errorCount = validation?.errors.length ?? 0;
  const warningCount = validation?.warnings.length ?? 0;
  const ready = Boolean(validation?.ready && errorCount === 0);

  let icon = <ClipboardCheck className="size-5" />;
  let title = "المسودة لم تُراجع بعد";
  let description = "بعد الانتهاء من التعديل اضغط «مراجعة ونشر» لفحص المسودة من الخادم.";
  let classes = "border-border bg-card";

  if (pending) {
    icon = <Loader2 className="size-5 animate-spin" />;
    title = "جاري تنفيذ العملية";
    description = "انتظر حتى تكتمل العملية الحالية قبل تنفيذ إجراء آخر.";
  } else if (dirty) {
    icon = <Pencil className="size-5" />;
    title = "توجد نافذة تعديل مفتوحة أو تغييرات غير محفوظة";
    description = "أكمل الحفظ أو أغلق نافذة التعديل قبل مراجعة المسودة ونشرها.";
    classes = "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/25";
  } else if (ready) {
    icon = <CheckCircle2 className="size-5" />;
    title = warningCount ? "المسودة جاهزة مع تنبيهات" : "المسودة جاهزة للنشر";
    description = warningCount
      ? `يوجد ${warningCount} تنبيهات لا تمنع النشر. راجعها قبل المتابعة.`
      : "لم يُرجع الخادم أخطاء تمنع النشر.";
    classes = "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25";
  } else if (validation) {
    icon = <TriangleAlert className="size-5" />;
    title = "المسودة تحتاج مراجعة";
    description = errorCount
      ? `يوجد ${errorCount} أخطاء تمنع النشر و${warningCount} تنبيهات.`
      : `يوجد ${warningCount} تنبيهات تحتاج مراجعة.`;
    classes = "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/25";
  }

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${classes}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
        </div>
      </div>
      {validation && (errorCount > 0 || warningCount > 0) ? (
        <Button type="button" variant="outline" size="sm" onClick={onReview}>
          عرض التفاصيل
        </Button>
      ) : null}
    </div>
  );
}

function LegacyCard({
  card,
  pending,
  onEdit,
}: {
  card: MealBuilderVisualCard;
  pending: boolean;
  onEdit: () => void;
}) {
  const premium = card.key === "premium";
  const issueCount = card.errors.length + card.backendIssues.filter(isErrorIssue).length;
  const warningCount = card.warnings.length + card.backendIssues.filter((issue) => !isErrorIssue(issue)).length;

  return (
    <article className="flex min-h-64 flex-col rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{card.labelAr}</h3>
            {premium ? <Badge variant="secondary">تلقائية</Badge> : null}
            {issueCount ? (
              <Badge variant="destructive">{issueCount} مشاكل</Badge>
            ) : warningCount ? (
              <Badge variant="outline">{warningCount} تنبيهات</Badge>
            ) : (
              <Badge variant="outline">جاهزة</Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {card.items.length} {card.items.length === 1 ? "عنصر" : "عناصر"}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
          {premium ? <CheckCircle2 className="size-5" /> : <Package className="size-5" />}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {card.items.slice(0, 3).map((item) => (
          <ItemPreview key={`${item.kind}:${item.id}`} item={item} />
        ))}
        {!card.items.length ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            لا توجد عناصر ظاهرة في هذه البطاقة حاليًا.
          </p>
        ) : null}
        {card.items.length > 3 ? (
          <p className="text-xs text-muted-foreground">+ {card.items.length - 3} عناصر أخرى</p>
        ) : null}
      </div>

      <div className="mt-auto pt-5">
        {premium ? (
          <p className="rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
            هذه البطاقة يديرها الخادم تلقائيًا من إعدادات الوجبات المميزة.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
            تعديل المكونات
          </Button>
        )}
      </div>
    </article>
  );
}

function ItemPreview({ item }: { item: MealBuilderVisualItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="size-10 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
          <Package className="size-4 text-muted-foreground" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</p>
    </div>
  );
}

function ReadOnlyCards({ cards }: { cards: BuiltCards }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">البطاقات المنشورة</h2>
          <p className="mt-1 text-sm text-muted-foreground">عرض للقراءة فقط كما يصل من الخادم.</p>
        </div>
        <Badge variant="outline">{cards.totalCount} بطاقات</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cards.direct.map((section) => (
          <ReadOnlyDirectCard key={section.key || section.id} section={section} />
        ))}
        {cards.visual.map((card) => (
          <LegacyCard key={card.key} card={card} pending onEdit={() => undefined} />
        ))}
      </div>
    </section>
  );
}

function ReadOnlyDirectCard({ section }: { section: MealBuilderSection }) {
  const products = selectedProductsForDirectCard(section);
  const title =
    section.titleOverride?.ar || section.titleOverride?.en || section.key || "بطاقة منتجات";
  return (
    <article className="flex min-h-64 flex-col rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            <Badge variant={section.visible === false ? "outline" : "secondary"}>
              {section.visible === false ? "مخفية" : "ظاهرة"}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length} {products.length === 1 ? "منتج" : "منتجات"}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-muted">
          <Package className="size-5" />
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {products.slice(0, 4).map((product, index) => (
          <HydratedItemPreview
            key={product.productId || product.id || product.key || index}
            item={product}
          />
        ))}
        {!products.length ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            لا توجد منتجات منشورة في هذه البطاقة.
          </p>
        ) : null}
      </div>
    </article>
  );
}

function HydratedItemPreview({ item }: { item: MealBuilderHydratedItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          className="size-10 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
          <Package className="size-4 text-muted-foreground" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{hydratedItemName(item)}</p>
    </div>
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
  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl"
        dir="rtl"
      >
        <DialogHeader className="text-right">
          <DialogTitle>نتيجة مراجعة المسودة</DialogTitle>
          <DialogDescription className="text-right leading-6">
            هذه النتائج صادرة من الخادم. يجب معالجة الأخطاء قبل النشر، أما التنبيهات فلا تمنع النشر عادةً.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <IssueGroup title="أخطاء تمنع النشر" issues={errors} destructive />
          <IssueGroup title="تنبيهات" issues={warnings} />
          {!errors.length && !warnings.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
              <CheckCircle2 className="size-5 shrink-0" />
              <p className="text-sm">لم يُرجع الخادم أخطاء أو تنبيهات لهذه المسودة.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueGroup({
  title,
  issues,
  destructive = false,
}: {
  title: string;
  issues: MealBuilderCheck[];
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
        <Badge variant={destructive ? "destructive" : "outline"}>{issues.length}</Badge>
      </div>
      <div className="grid gap-2">
        {issues.map((issue, index) => (
          <div key={`${issue.code || "issue"}-${index}`} className="rounded-xl border p-3">
            <p className="text-sm leading-6">{mealBuilderIssueText(issue)}</p>
            {issue.code ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{issue.code}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
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
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && !pending && onClose()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>نشر المسودة للعملاء؟</AlertDialogTitle>
          <AlertDialogDescription className="text-right leading-6">
            بعد التأكيد ستصبح هذه المسودة هي النسخة الفعالة في التطبيق. تأكد أنك راجعت البطاقات والتنبيهات.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="meal-builder-publish-note" className="text-sm font-medium">
            ملاحظة النشر <span className="text-muted-foreground">(اختيارية)</span>
          </label>
          <Textarea
            id="meal-builder-publish-note"
            value={note}
            disabled={pending}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="مثال: تحديث بطاقات الوجبات لهذا الأسبوع"
            className="min-h-24"
          />
        </div>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending} onClick={onClose}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            تأكيد النشر
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ملاحظات المسودة</DialogTitle>
          <DialogDescription className="text-right leading-6">
            أضف ملاحظة داخلية تساعد الفريق على فهم سبب التعديل. لا تظهر هذه الملاحظة للعميل.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-40"
          placeholder="اكتب ملاحظات التعديل هنا..."
        />
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            إغلاق
          </Button>
          <Button type="button" disabled={pending} onClick={onSave}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <StickyNote className="size-4" />}
            حفظ الملاحظات
          </Button>
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
            سيتم حذف جميع تعديلات المسودة الحالية واستبدالها بآخر نسخة منشورة. لا يمكن التراجع عن هذا الإجراء.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel disabled={pending} onClick={onClose}>
            إلغاء
          </AlertDialogCancel>
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
            توجد نافذة تعديل مفتوحة أو تغييرات مؤقتة. سيتم تجاهلها عند الانتقال إلى العرض المنشور.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-start">
          <AlertDialogCancel onClick={onClose}>متابعة التعديل</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            تجاهل وعرض المنشور
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EmptyPublished({
  onStart,
  pending,
}: {
  onStart: () => void;
  pending: boolean;
}) {
  return (
    <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed bg-card p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted">
          <Package className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">لا توجد نسخة منشورة بعد</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ابدأ مسودة، أضف البطاقات المطلوبة، ثم راجعها وانشرها عندما تصبح جاهزة.
          </p>
        </div>
        <Button type="button" disabled={pending} onClick={onStart}>
          <FileEdit className="size-4" />
          ابدأ التعديل
        </Button>
      </div>
    </div>
  );
}

function MealBuilderLoading({ message = "جاري تحميل منشئ الوجبات..." }: { message?: string }) {
  return (
    <div className="space-y-5" dir="rtl" aria-busy="true">
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-2xl" />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-950 dark:border-red-900/60 dark:bg-red-950/25 dark:text-red-100" dir="rtl">
      <div className="max-w-md space-y-4">
        <AlertCircle className="mx-auto size-10" />
        <div>
          <h2 className="text-lg font-semibold">تعذر تحميل منشئ الوجبات</h2>
          <p className="mt-2 text-sm leading-6 opacity-85">{message}</p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </Button>
      </div>
    </div>
  );
}

function hydratedItemName(item: MealBuilderHydratedItem) {
  const localized = item.name;
  return localized?.ar || localized?.en || item.label || item.key || "عنصر";
}

function isErrorIssue(issue: MealBuilderCheck) {
  return issue.level === "error";
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
