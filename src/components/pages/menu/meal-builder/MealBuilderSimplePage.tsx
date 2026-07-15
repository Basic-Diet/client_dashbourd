import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileEdit,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MenuEmptyState } from "@/components/pages/menu/MenuTabScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  MEAL_BUILDER_DRAFT_KEY,
  MEAL_BUILDER_HYDRATED_KEY,
  MEAL_BUILDER_KEY,
  MEAL_BUILDER_PUBLISHED_KEY,
  MEAL_BUILDER_READINESS_KEY,
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
  MealBuilderConfig,
  MealBuilderContract,
  MealBuilderHydratedDraft,
  MealBuilderLifecycleResponseData,
  MealBuilderPremiumSection,
  MealBuilderSection,
  MealBuilderSectionType,
  MealBuilderState,
  MealBuilderValidation,
} from "@/types/mealBuilderTypes";
import { MealBuilderSectionEditor } from "./MealBuilderSectionEditor";
import { MealBuilderSimpleCard } from "./MealBuilderSimpleCard";
import { MealBuilderSimpleCardEditor } from "./MealBuilderSimpleCardEditor";
import {
  mealBuilderErrorMessage,
  toEditableMealBuilderSections,
} from "./mealBuilderFrontendUtils";
import { mealBuilderIssueText } from "./mealBuilderIssueText";
import { orderSections, toBackendSections } from "./mealBuilderUtils";
import { buildMealBuilderVisualCards } from "./mealBuilderVisualModel";

type PageMode = "published" | "draft";
type EditorState = {
  type: MealBuilderSectionType;
  index: number | null;
} | null;

type Catalog = {
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
};

type NormalizedMealBuilderView = {
  config: MealBuilderConfig | null;
  validation: MealBuilderValidation | null;
  premiumSection: MealBuilderPremiumSection | null;
  versionId: string | null;
  versionNumber: string | number | null;
  hasUnpublishedChanges: boolean;
  updatedAt: string | null;
};

export function MealBuilderSimplePage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<PageMode>("published");
  const [dirty, setDirty] = useState(false);

  const builderQuery = useMealBuilderQuery();
  const publishedQuery = useMealBuilderPublishedQuery();
  const draftQuery = useMealBuilderDraftQuery(mode === "draft");
  const hydratedQuery = useMealBuilderHydratedQuery(mode === "draft");

  const productsQuery = useMenuProductsQuery({
    limit: 500,
    includeInactive: true,
  });
  const categoriesQuery = useMenuCategoriesQuery({
    limit: 500,
    includeInactive: true,
  });
  const groupsQuery = useMenuOptionGroupsQuery({
    limit: 500,
    includeInactive: true,
  });
  const optionsQuery = useMenuOptionsQuery({
    limit: 1000,
    includeInactive: true,
  });

  const state = builderQuery.data?.data ?? null;
  const publishedView = useMemo(
    () => normalizePublished(publishedQuery.data?.data ?? null, state),
    [publishedQuery.data, state]
  );
  const draftView = useMemo(
    () =>
      normalizeDraft(
        draftQuery.data?.data ?? null,
        hydratedQuery.data?.data ?? null,
        state
      ),
    [draftQuery.data, hydratedQuery.data, state]
  );
  const activeView = mode === "draft" ? draftView : publishedView;

  const catalog: Catalog = {
    products: productsQuery.data?.data.items ?? [],
    categories: categoriesQuery.data?.data.items ?? [],
    groups: groupsQuery.data?.data.items ?? [],
    options: optionsQuery.data?.data.items ?? [],
  };

  const loading =
    builderQuery.isLoading ||
    publishedQuery.isLoading ||
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    groupsQuery.isLoading ||
    optionsQuery.isLoading ||
    (mode === "draft" && (draftQuery.isLoading || hydratedQuery.isLoading));

  const loadError = firstQueryError([
    builderQuery,
    publishedQuery,
    productsQuery,
    categoriesQuery,
    groupsQuery,
    optionsQuery,
    ...(mode === "draft" ? [draftQuery, hydratedQuery] : []),
  ]);

  const hasDraft = Boolean(
    state?.metadata?.hasDraft || state?.draft || draftView.config
  );

  useEffect(() => {
    if (loading || mode !== "published") return;
    if (!publishedView.config && (state?.draft || state?.metadata?.hasDraft)) {
      setMode("draft");
    }
  }, [loading, mode, publishedView.config, state]);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_KEY] }),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_PUBLISHED_KEY] }),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_DRAFT_KEY] }),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_HYDRATED_KEY] }),
      queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_READINESS_KEY] }),
    ]);
    toast.success("تم تحديث منشئ الوجبات");
  }

  function openDraft() {
    if (mode === "draft") return;
    setDirty(false);
    queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_DRAFT_KEY] });
    queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_HYDRATED_KEY] });
    setMode("draft");
  }

  function showPublished() {
    if (
      dirty &&
      !window.confirm("لديك تغييرات غير محفوظة. هل تريد ترك المسودة؟")
    ) {
      return;
    }
    setDirty(false);
    setMode("published");
  }

  async function retry() {
    await Promise.all([
      builderQuery.refetch(),
      publishedQuery.refetch(),
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      groupsQuery.refetch(),
      optionsQuery.refetch(),
      ...(mode === "draft"
        ? [draftQuery.refetch(), hydratedQuery.refetch()]
        : []),
    ]);
  }

  return (
    <div className="grid gap-4" dir="rtl">
      <SimpleHeader
        mode={mode}
        dirty={dirty}
        loading={loading}
        hasDraft={hasDraft}
        onRefresh={refresh}
        onOpenDraft={openDraft}
        onShowPublished={showPublished}
      />

      {loadError ? (
        <LoadError error={loadError} onRetry={retry} />
      ) : activeView.config ? (
        mode === "draft" ? (
          <SimpleWorkspace
            key={`${activeView.versionId ?? activeView.config.id}:${activeView.updatedAt ?? ""}`}
            draft={activeView.config}
            initialValidation={activeView.validation}
            premiumSection={activeView.premiumSection}
            catalog={catalog}
            loading={loading}
            dirty={dirty}
            onDirtyChange={setDirty}
            onPublished={() => {
              setDirty(false);
              setMode("published");
              publishedQuery.refetch();
              builderQuery.refetch();
            }}
          />
        ) : (
          <PublishedView
            config={activeView.config}
            validation={activeView.validation}
            premiumSection={activeView.premiumSection}
            catalog={catalog}
            loading={loading}
            onOpenDraft={openDraft}
          />
        )
      ) : (
        <EmptyState mode={mode} loading={loading} onOpenDraft={openDraft} />
      )}
    </div>
  );
}

function SimpleHeader({
  mode,
  dirty,
  loading,
  hasDraft,
  onOpenDraft,
  onShowPublished,
  onRefresh,
}: {
  mode: PageMode;
  dirty: boolean;
  loading: boolean;
  hasDraft: boolean;
  onOpenDraft: () => void;
  onShowPublished: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">ترتيب خيارات وجبات الاشتراك</h2>
              {dirty ? (
                <Badge variant="secondary">غير محفوظ</Badge>
              ) : mode === "draft" ? (
                <Badge variant="outline">مسودة محفوظة</Badge>
              ) : null}
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              اختر ما يظهر للعميل داخل كل بطاقة، ثم احفظ وانشر التغييرات.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div className="grid grid-cols-2 rounded-lg border bg-muted/30 p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "published" ? "default" : "ghost"}
              disabled={loading}
              onClick={onShowPublished}
            >
              <Eye data-icon="inline-start" /> المعروض للعميل
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "draft" ? "default" : "ghost"}
              disabled={loading}
              onClick={onOpenDraft}
            >
              <FileEdit data-icon="inline-start" />
              {hasDraft ? "المسودة" : "تعديل"}
            </Button>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={loading}
            onClick={onRefresh}
            aria-label="تحديث البيانات"
            title="تحديث البيانات"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PublishedView({
  config,
  validation,
  premiumSection,
  catalog,
  loading,
  onOpenDraft,
}: {
  config: MealBuilderConfig;
  validation: MealBuilderValidation | null;
  premiumSection: MealBuilderPremiumSection | null;
  catalog: Catalog;
  loading: boolean;
  onOpenDraft: () => void;
}) {
  const cards = buildCards(config.sections, catalog, validation, premiumSection);

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-base">ما يراه العميل حاليًا</CardTitle>
          <CardDescription>
            هذه النسخة للقراءة فقط. افتح المسودة لتعديلها.
          </CardDescription>
        </div>
        <Button type="button" onClick={onOpenDraft} disabled={loading}>
          <FileEdit data-icon="inline-start" /> تعديل القائمة
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4 lg:p-5">
        <ValidationNotice validation={validation} dirty={false} />
        <PremiumNotice premiumSection={premiumSection} />
        <CardsGrid cards={cards} readOnly />
      </CardContent>
    </Card>
  );
}

function SimpleWorkspace({
  draft,
  initialValidation,
  premiumSection,
  catalog,
  loading,
  dirty,
  onDirtyChange,
  onPublished,
}: {
  draft: MealBuilderConfig;
  initialValidation: MealBuilderValidation | null;
  premiumSection: MealBuilderPremiumSection | null;
  catalog: Catalog;
  loading: boolean;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onPublished: () => void;
}) {
  const saveDraft = useSaveMealBuilderDraftMutation();
  const validateDraft = useValidateMealBuilderDraftMutation();
  const publishDraft = usePublishMealBuilderDraftMutation();
  const resetDraft = useResetMealBuilderDraftMutation();

  const [sections, setSections] = useState(() => orderSections(draft.sections));
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [editor, setEditor] = useState<EditorState>(null);
  const [cardEditorKey, setCardEditorKey] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [validation, setValidation] =
    useState<MealBuilderValidation | null>(initialValidation);

  const cards = buildCards(sections, catalog, validation, premiumSection);
  const selectedCard = cardEditorKey
    ? cards.find((card) => card.key === cardEditorKey) ?? null
    : null;
  const pending =
    saveDraft.isPending ||
    validateDraft.isPending ||
    publishDraft.isPending ||
    resetDraft.isPending;
  const payload = { sections: toBackendSections(sections), notes };

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function markChanged() {
    setValidation(null);
    onDirtyChange(true);
  }

  function replaceSections(next: MealBuilderSection[]) {
    const editable = toEditableMealBuilderSections(orderSections(next)).map(
      (section, index) => ({ ...section, sortOrder: index + 1 })
    );
    setSections(editable);
    markChanged();
  }

  function syncSaved(saved: MealBuilderConfig) {
    setSections(orderSections(saved.sections));
    setNotes(saved.notes ?? notes);
    setValidation(null);
    onDirtyChange(false);
  }

  function saveCurrent(onSaved?: () => void) {
    saveDraft.mutate(payload, {
      onSuccess: (response) => {
        syncSaved(response.data);
        onSaved?.();
      },
    });
  }

  function validateCurrent({
    serverDraft = false,
    onValid,
  }: {
    serverDraft?: boolean;
    onValid?: () => void;
  } = {}) {
    validateDraft.mutate(serverDraft ? undefined : payload, {
      onSuccess: (response) => {
        setValidation(response.data);
        if (!response.data.ready || response.data.errors.length > 0) return;
        onValid?.();
      },
    });
  }

  function publishFlow() {
    const validateSaved = () =>
      validateCurrent({
        serverDraft: true,
        onValid: () => setPublishOpen(true),
      });

    if (dirty) {
      saveCurrent(validateSaved);
      return;
    }
    validateSaved();
  }

  function saveAdvancedSection(nextSection: MealBuilderSection) {
    setSections((current) => {
      if (editor?.index == null) {
        return [
          ...current,
          { ...nextSection, sortOrder: current.length + 1 },
        ];
      }
      return current.map((section, index) =>
        index === editor.index ? nextSection : section
      );
    });
    setEditor(null);
    markChanged();
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="sticky top-2 z-20 border-border/80 bg-background/95 shadow-sm backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between lg:p-4">
            <div>
              <p className="font-semibold">تعديل المسودة</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dirty
                  ? "لديك تغييرات تحتاج إلى الحفظ."
                  : "كل التغييرات محفوظة."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button
                type="button"
                onClick={() => saveCurrent()}
                disabled={pending || !dirty}
              >
                {saveDraft.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => validateCurrent()}
                disabled={pending}
              >
                {validateDraft.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 data-icon="inline-start" />
                )}
                فحص
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={publishFlow}
                disabled={pending}
              >
                {publishDraft.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send data-icon="inline-start" />
                )}
                نشر
              </Button>
            </div>
          </CardContent>
        </Card>

        <ValidationNotice validation={validation} dirty={dirty} />
        <PremiumNotice premiumSection={premiumSection} />

        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map((card) => (
            <MealBuilderSimpleCard
              key={card.key}
              card={card}
              readOnly={card.key === "premium" || loading}
              onEdit={() => setCardEditorKey(card.key)}
            />
          ))}
        </div>

        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            إعدادات متقدمة وملاحظات النشر
          </summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                استخدم هذه الأدوات فقط لإضافة قسم جديد غير موجود ضمن البطاقات الأساسية.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditor({ type: "option_group", index: null })}
                >
                  <Plus data-icon="inline-start" /> مجموعة خيارات
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setEditor({ type: "product_category", index: null })
                  }
                >
                  <Plus data-icon="inline-start" /> تصنيف منتجات
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditor({ type: "product_list", index: null })}
                >
                  <Plus data-icon="inline-start" /> قائمة منتجات
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setResetOpen(true)}
                disabled={pending}
              >
                <RotateCcw data-icon="inline-start" /> إلغاء تعديلات المسودة
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-builder-publish-notes">ملاحظات النشر</Label>
              <Textarea
                id="meal-builder-publish-notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  markChanged();
                }}
                className="min-h-24"
                placeholder="مثال: تحديث خيارات الساندويتش"
              />
            </div>
          </div>
        </details>
      </div>

      {selectedCard ? (
        <MealBuilderSimpleCardEditor
          key={selectedCard.key}
          open
          card={selectedCard}
          sections={sections}
          catalog={catalog}
          onClose={() => setCardEditorKey(null)}
          onSave={(nextSections) => {
            replaceSections(nextSections);
            setCardEditorKey(null);
          }}
        />
      ) : null}

      {editor ? (
        <MealBuilderSectionEditor
          key={`${editor.type}:${editor.index ?? "new"}`}
          open
          type={editor.type}
          initial={
            editor.index == null ? null : (sections[editor.index] ?? null)
          }
          products={catalog.products}
          categories={catalog.categories}
          groups={catalog.groups}
          options={catalog.options}
          onClose={() => setEditor(null)}
          onSave={saveAdvancedSection}
        />
      ) : null}

      <PublishDialog
        open={publishOpen}
        pending={publishDraft.isPending}
        warnings={validation?.warnings.length ?? 0}
        onClose={() => setPublishOpen(false)}
        onPublish={() =>
          publishDraft.mutate(notes, {
            onSuccess: () => {
              setPublishOpen(false);
              onDirtyChange(false);
              onPublished();
            },
          })
        }
      />

      <ResetDialog
        open={resetOpen}
        pending={resetDraft.isPending}
        onClose={() => setResetOpen(false)}
        onReset={() =>
          resetDraft.mutate(undefined, {
            onSuccess: (response) => {
              const resetView = normalizeDraft(response.data, null, null);
              if (resetView.config) {
                setSections(orderSections(resetView.config.sections));
                setNotes(resetView.config.notes ?? "");
                setValidation(resetView.validation);
              }
              onDirtyChange(false);
              setResetOpen(false);
            },
          })
        }
      />
    </>
  );
}

function CardsGrid({
  cards,
  readOnly = false,
}: {
  cards: ReturnType<typeof buildMealBuilderVisualCards>;
  readOnly?: boolean;
}) {
  if (!cards.length) {
    return (
      <MenuEmptyState
        title="لا توجد بطاقات"
        description="افتح المسودة لإضافة خيارات الوجبات."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cards.map((card) => (
        <MealBuilderSimpleCard key={card.key} card={card} readOnly={readOnly} />
      ))}
    </div>
  );
}

function ValidationNotice({
  validation,
  dirty,
}: {
  validation: MealBuilderValidation | null;
  dirty: boolean;
}) {
  if (dirty) {
    return (
      <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        احفظ أو افحص التغييرات للحصول على نتيجة محدثة.
      </div>
    );
  }

  if (!validation) return null;

  if (validation.errors.length) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <p className="font-medium">
          توجد {validation.errors.length} مشاكل تمنع النشر.
        </p>
        <p className="mt-1">{mealBuilderIssueText(validation.errors[0])}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      {validation.warnings.length
        ? `جاهزة للنشر مع ${validation.warnings.length} ملاحظات غير مانعة.`
        : "المسودة جاهزة للنشر."}
    </div>
  );
}

function PremiumNotice({
  premiumSection,
}: {
  premiumSection: MealBuilderPremiumSection | null;
}) {
  const count =
    (premiumSection?.diagnostics?.length ?? 0) +
    (premiumSection?.excluded?.length ?? 0) +
    (premiumSection?.broken?.length ?? 0);
  if (!count) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      يوجد {count} عناصر مميزة تحتاج إلى مراجعة من صفحة الوجبات المميزة.
    </div>
  );
}

function PublishDialog({
  open,
  pending,
  warnings,
  onClose,
  onPublish,
}: {
  open: boolean;
  pending: boolean;
  warnings: number;
  onClose: () => void;
  onPublish: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>نشر التغييرات للعميل؟</DialogTitle>
          <DialogDescription>
            سيتم استبدال القائمة الحالية بالمسودة بعد تأكيد النشر.
          </DialogDescription>
        </DialogHeader>
        {warnings ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            توجد {warnings} ملاحظات غير مانعة.
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" disabled={pending} onClick={onPublish}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            تأكيد النشر
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({
  open,
  pending,
  onClose,
  onReset,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="w-[calc(100%-1.5rem)] max-w-md" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>إلغاء تعديلات المسودة؟</DialogTitle>
          <DialogDescription>
            سيتم الرجوع إلى آخر نسخة منشورة ولن تتأثر القائمة الحالية للعميل.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onReset}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            تأكيد الإلغاء
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            رجوع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <Card className="border-destructive/30 shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">تعذر تحميل منشئ الوجبات</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mealBuilderErrorMessage(error, "تحقق من الاتصال ثم أعد المحاولة.")}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" /> إعادة المحاولة
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  mode,
  loading,
  onOpenDraft,
}: {
  mode: PageMode;
  loading: boolean;
  onOpenDraft: () => void;
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="space-y-4 pt-6">
        <MenuEmptyState
          title={loading ? "جاري تحميل القائمة" : "لا توجد قائمة جاهزة"}
          description={
            mode === "published"
              ? "افتح المسودة لإعداد خيارات الوجبات ونشرها للعميل."
              : "سيقوم الخادم بإنشاء مسودة العمل عند فتحها."
          }
        />
        {!loading ? (
          <div className="flex justify-center">
            <Button type="button" onClick={onOpenDraft}>
              <FileEdit data-icon="inline-start" /> فتح المسودة
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildCards(
  sections: MealBuilderSection[],
  catalog: Catalog,
  validation: MealBuilderValidation | null,
  premiumSection: MealBuilderPremiumSection | null
) {
  return buildMealBuilderVisualCards({
    sections: orderSections(sections),
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues: [
      ...(validation?.errors ?? []),
      ...(validation?.warnings ?? []),
    ],
    premiumSection,
  });
}

function normalizePublished(
  data: MealBuilderLifecycleResponseData | null,
  state: MealBuilderState | null
): NormalizedMealBuilderView {
  const config = data?.config ?? data?.published ?? state?.published ?? null;
  const contract = data?.contract ?? state?.contract ?? state?.preview ?? null;
  return {
    config,
    validation: data?.validation ?? state?.validation.published ?? null,
    premiumSection:
      data?.premiumSection ??
      contractPremiumSection(contract) ??
      state?.premiumSection ??
      findPremiumSection(config?.sections),
    versionId: nullableString(data?.versionId ?? config?.id),
    versionNumber: data?.versionNumber ?? config?.revisionHash ?? null,
    hasUnpublishedChanges: Boolean(data?.hasUnpublishedChanges),
    updatedAt: data?.updatedAt ?? config?.updatedAt ?? null,
  };
}

function normalizeDraft(
  lifecycleData: MealBuilderLifecycleResponseData | MealBuilderConfig | null,
  hydratedData: MealBuilderHydratedDraft | null,
  state: MealBuilderState | null
): NormalizedMealBuilderView {
  const lifecycle = isMealBuilderConfig(lifecycleData)
    ? ({ config: lifecycleData } satisfies MealBuilderLifecycleResponseData)
    : lifecycleData;
  const baseConfig =
    hydratedData?.draft ??
    lifecycle?.config ??
    lifecycle?.draft ??
    state?.draft ??
    null;
  const config =
    baseConfig && hydratedData?.sections
      ? { ...baseConfig, sections: hydratedData.sections }
      : baseConfig;
  const hydratedValidation = validationFromHydrated(hydratedData);

  return {
    config,
    validation:
      hydratedData?.validation ??
      lifecycle?.validation ??
      hydratedValidation ??
      state?.validation.draft ??
      null,
    premiumSection:
      hydratedData?.premiumSection ??
      lifecycle?.premiumSection ??
      state?.premiumSection ??
      findPremiumSection(config?.sections),
    versionId: nullableString(
      hydratedData?.versionId ??
        lifecycle?.versionId ??
        lifecycle?.draftVersionId ??
        config?.id
    ),
    versionNumber:
      hydratedData?.versionNumber ??
      lifecycle?.versionNumber ??
      config?.revisionHash ??
      null,
    hasUnpublishedChanges: Boolean(
      hydratedData?.hasUnpublishedChanges ?? lifecycle?.hasUnpublishedChanges
    ),
    updatedAt:
      hydratedData?.updatedAt ?? lifecycle?.updatedAt ?? config?.updatedAt ?? null,
  };
}

function validationFromHydrated(
  data: MealBuilderHydratedDraft | null
): MealBuilderValidation | null {
  if (!data) return null;
  const errors = data.errors ?? [];
  const warnings = data.warnings ?? [];
  return {
    status: errors.length ? "error" : warnings.length ? "warning" : "ok",
    ready: Boolean(data.ready) && errors.length === 0,
    errors,
    warnings,
    checks: [...errors, ...warnings],
  };
}

function contractPremiumSection(
  contract: MealBuilderContract | null | undefined
): MealBuilderPremiumSection | null {
  return contract?.premiumSection ?? null;
}

function findPremiumSection(
  sections?: MealBuilderSection[] | null
): MealBuilderPremiumSection | null {
  const premium = sections?.find(
    (section) =>
      section.key === "premium" || section.selectionType?.includes("premium")
  );
  if (!premium?.items?.length) return null;
  return {
    automatic: Boolean(
      premium.metadata?.automatic ??
        premium.metadata?.source === "premium_upgrade_configs"
    ),
    source: String(
      premium.metadata?.source ?? "premium_upgrade_configs"
    ),
    items: premium.items,
  };
}

function isMealBuilderConfig(
  value: MealBuilderLifecycleResponseData | MealBuilderConfig | null
): value is MealBuilderConfig {
  return Boolean(
    value && "sections" in value && Array.isArray(value.sections) && "id" in value
  );
}

function nullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function firstQueryError(
  queries: Array<{ isError: boolean; error: unknown }>
): unknown | null {
  return queries.find((query) => query.isError)?.error ?? null;
}
