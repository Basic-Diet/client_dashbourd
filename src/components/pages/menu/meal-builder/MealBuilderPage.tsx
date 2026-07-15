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
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
import { MenuEmptyState } from "@/components/pages/menu/MenuTabScaffold";
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
import { MealBuilderCardEditor } from "./MealBuilderCardEditor";
import { MealBuilderSectionEditor } from "./MealBuilderSectionEditor";
import { MealBuilderVisualCard } from "./MealBuilderVisualCard";
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

export function MealBuilderPage({ embedded = false }: { embedded?: boolean }) {
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
    toast.success("تم تحديث بيانات منشئ الوجبات");
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
      !window.confirm(
        "توجد تغييرات غير محفوظة. هل تريد ترك المسودة وعرض النسخة المنشورة؟"
      )
    ) {
      return;
    }
    setDirty(false);
    setMode("published");
  }

  async function retryFailedQueries() {
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
    <div
      className="grid gap-5"
      data-embedded={embedded || undefined}
      dir="rtl"
    >
      <HeaderCard
        mode={mode}
        dirty={dirty}
        loading={loading}
        hasDraft={hasDraft}
        onRefresh={refresh}
        onOpenDraft={openDraft}
        onShowPublished={showPublished}
      />

      {loadError ? (
        <LoadErrorCard error={loadError} onRetry={retryFailedQueries} />
      ) : (
        <>
          <VersionMetadataCard view={activeView} mode={mode} />
          <CatalogHealthCard catalog={catalog} loading={loading} />

          {activeView.config ? (
            mode === "draft" ? (
              <MealBuilderWorkspace
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
              <PublishedPreview
                config={activeView.config}
                validation={activeView.validation}
                premiumSection={activeView.premiumSection}
                catalog={catalog}
                loading={loading}
                onOpenDraft={openDraft}
              />
            )
          ) : (
            <EmptyBuilderState
              mode={mode}
              loading={loading}
              onOpenDraft={openDraft}
            />
          )}
        </>
      )}
    </div>
  );
}

function HeaderCard({
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
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" />
              منشئ وجبات الاشتراك
            </CardTitle>
            <CardDescription className="max-w-3xl leading-6">
              راجع النسخة المنشورة بأمان، ثم افتح مسودة مستقلة للتعديل والفحص
              قبل أن تصل التغييرات إلى تطبيق العميل.
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onRefresh}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw data-icon="inline-start" />
              )}
              تحديث البيانات
            </Button>
            <Button
              type="button"
              variant={mode === "published" ? "default" : "outline"}
              disabled={mode === "published" || loading}
              onClick={onShowPublished}
            >
              <Eye data-icon="inline-start" />
              النسخة المنشورة
            </Button>
            <Button
              type="button"
              variant={mode === "draft" ? "default" : "outline"}
              disabled={mode === "draft" || loading}
              onClick={onOpenDraft}
            >
              <FileEdit data-icon="inline-start" />
              {mode === "draft"
                ? "المسودة مفتوحة"
                : hasDraft
                  ? "متابعة المسودة"
                  : "فتح مسودة جديدة"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={mode === "draft" ? "secondary" : "default"}>
            {mode === "draft" ? "وضع التعديل" : "وضع القراءة"}
          </Badge>
          {dirty ? (
            <Badge variant="outline">توجد تغييرات غير محفوظة</Badge>
          ) : null}
          {hasDraft && mode === "published" ? (
            <Badge variant="secondary">توجد مسودة عمل</Badge>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}

function VersionMetadataCard({
  view,
  mode,
}: {
  view: NormalizedMealBuilderView;
  mode: PageMode;
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetaItem
          label="الحالة"
          value={mode === "draft" ? "مسودة قابلة للتعديل" : "منشور للعميل"}
        />
        <MetaItem label="رقم النسخة" value={view.versionNumber ?? "-"} />
        <MetaItem
          label="مبنية على النسخة"
          value={shortVersion(view.basedOnPublishedVersionId)}
        />
        <MetaItem label="آخر تحديث" value={formatSafeDate(view.updatedAt)} />
        <MetaItem label="تاريخ النشر" value={formatSafeDate(view.publishedAt)} />
        <MetaItem
          label="تغييرات غير منشورة"
          value={view.hasUnpublishedChanges ? "نعم" : "لا"}
        />
      </CardContent>
    </Card>
  );
}

function CatalogHealthCard({
  catalog,
  loading,
}: {
  catalog: Catalog;
  loading: boolean;
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium">مصادر الكتالوج المستخدمة في المحرر</p>
          <p className="mt-1 text-xs text-muted-foreground">
            الاختيارات النهائية تخضع لعلاقات المنتج والتوفر والتحقق من الباكند.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {loading ? (
            <Badge variant="outline">
              <Loader2 className="size-3 animate-spin" /> جاري التحميل
            </Badge>
          ) : (
            <>
              <Badge variant="outline">{catalog.products.length} منتج</Badge>
              <Badge variant="outline">{catalog.categories.length} تصنيف</Badge>
              <Badge variant="outline">{catalog.groups.length} مجموعة</Badge>
              <Badge variant="outline">{catalog.options.length} خيار</Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PublishedPreview({
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
  const visualCards = buildMealBuilderVisualCards({
    sections: orderSections(config.sections),
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues: [
      ...(validation?.errors ?? []),
      ...(validation?.warnings ?? []),
    ],
    premiumSection,
  });

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>النسخة المنشورة</CardTitle>
          <CardDescription>
            هذه البطاقات تمثل النسخة المستخدمة حاليا في تطبيق العميل وهي للقراءة
            فقط.
          </CardDescription>
        </div>
        <Button type="button" onClick={onOpenDraft} disabled={loading}>
          <FileEdit data-icon="inline-start" />
          فتح المسودة للتعديل
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <LoadingLine /> : null}
        <ValidationSummary validation={validation} dirty={false} />
        <PremiumWarning premiumSection={premiumSection} />
        <VisualCardsGrid cards={visualCards} readOnly />
      </CardContent>
    </Card>
  );
}

function MealBuilderWorkspace({
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

  const visualCards = buildMealBuilderVisualCards({
    sections,
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues: [
      ...(validation?.errors ?? []),
      ...(validation?.warnings ?? []),
    ],
    premiumSection,
  });
  const selectedCard = cardEditorKey
    ? visualCards.find((card) => card.key === cardEditorKey) ?? null
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

  function markDraftChanged() {
    setValidation(null);
    onDirtyChange(true);
  }

  function replaceSections(next: MealBuilderSection[]) {
    const editable = toEditableMealBuilderSections(orderSections(next)).map(
      (section, index) => ({ ...section, sortOrder: index + 1 })
    );
    setSections(editable);
    markDraftChanged();
  }

  function syncSavedDraft(saved: MealBuilderConfig) {
    setSections(orderSections(saved.sections));
    setNotes(saved.notes ?? notes);
    setValidation(null);
    onDirtyChange(false);
  }

  function saveCurrentDraft(onSaved?: () => void) {
    saveDraft.mutate(payload, {
      onSuccess: (response) => {
        syncSavedDraft(response.data);
        onSaved?.();
      },
    });
  }

  function validateCurrentDraft({
    validateServerDraft = false,
    onValid,
  }: {
    validateServerDraft?: boolean;
    onValid?: () => void;
  } = {}) {
    validateDraft.mutate(validateServerDraft ? undefined : payload, {
      onSuccess: (response) => {
        setValidation(response.data);
        if (!response.data.ready || response.data.errors.length > 0) return;
        onValid?.();
      },
    });
  }

  function publishFlow() {
    const validateSavedDraft = () =>
      validateCurrentDraft({
        validateServerDraft: true,
        onValid: () => setPublishOpen(true),
      });

    if (dirty) {
      saveCurrentDraft(validateSavedDraft);
      return;
    }
    validateSavedDraft();
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="sticky top-2 z-20 border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardContent className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">مسودة العمل</CardTitle>
                <Badge variant="secondary">قابلة للتعديل</Badge>
                {dirty ? (
                  <Badge variant="outline">تغييرات غير محفوظة</Badge>
                ) : (
                  <Badge variant="outline">محفوظة</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                عدّل البطاقات العادية، ثم احفظ وافحص قبل النشر. قسم مميز يُدار
                تلقائيا من إعدادات الترقيات المميزة.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap">
              <Button
                type="button"
                onClick={() => saveCurrentDraft()}
                disabled={pending || !dirty}
              >
                {saveDraft.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                حفظ المسودة
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => validateCurrentDraft()}
                disabled={pending}
              >
                {validateDraft.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 data-icon="inline-start" />
                )}
                فحص التغييرات
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
                نشر المسودة
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm(
                      "توجد تغييرات غير محفوظة. هل تريد متابعة إعادة المسودة؟"
                    )
                  ) {
                    return;
                  }
                  setResetOpen(true);
                }}
                disabled={pending}
              >
                <RotateCcw data-icon="inline-start" />
                الرجوع للنسخة المنشورة
              </Button>
            </div>
          </CardContent>
        </Card>

        <ValidationSummary validation={validation} dirty={dirty} />

        <Card className="border-border/80 shadow-none">
          <CardHeader>
            <CardTitle>بطاقات منشئ الوجبات</CardTitle>
            <CardDescription>
              افتح أي بطاقة لتعديل عناصرها. العناصر غير المؤهلة تظهر للتشخيص فقط
              ولا يمكن إضافتها للمسودة.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? <LoadingLine /> : null}
            <PremiumWarning premiumSection={premiumSection} />
            <VisualCardsGrid
              cards={visualCards}
              onEdit={(key) => setCardEditorKey(key)}
            />
          </CardContent>
        </Card>

        <AdvancedBuilderTools
          onAddOptionGroup={() =>
            setEditor({ type: "option_group", index: null })
          }
          onAddProductCategory={() =>
            setEditor({ type: "product_category", index: null })
          }
          onAddProductList={() =>
            setEditor({ type: "product_list", index: null })
          }
          notes={notes}
          onNotesChange={(nextNotes) => {
            setNotes(nextNotes);
            onDirtyChange(true);
          }}
        />
      </div>

      {editor ? (
        <MealBuilderSectionEditor
          key={`${editor.type}:${editor.index ?? "new"}:${sections[editor.index ?? -1]?.id ?? ""}`}
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
          onSave={(section) => {
            if (editor.index == null) {
              replaceSections([
                ...sections,
                { ...section, sortOrder: sections.length + 1 },
              ]);
            } else {
              replaceSections(
                sections.map((item, index) =>
                  index === editor.index ? section : item
                )
              );
            }
            setEditor(null);
          }}
        />
      ) : null}

      {selectedCard ? (
        <MealBuilderCardEditor
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

function VisualCardsGrid({
  cards,
  readOnly = false,
  onEdit,
}: {
  cards: ReturnType<typeof buildMealBuilderVisualCards>;
  readOnly?: boolean;
  onEdit?: (key: string) => void;
}) {
  if (!cards.length) {
    return (
      <MenuEmptyState
        title="لا توجد بطاقات"
        description="لا تحتوي هذه النسخة على أقسام قابلة للعرض حاليا."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cards.map((card) => (
        <MealBuilderVisualCard
          key={card.key}
          card={card}
          readOnly={readOnly || card.key === "premium"}
          onEdit={() => onEdit?.(card.key)}
        />
      ))}
    </div>
  );
}

function ValidationSummary({
  validation,
  dirty,
}: {
  validation: MealBuilderValidation | null;
  dirty: boolean;
}) {
  const errors = validation?.errors ?? [];
  const warnings = validation?.warnings ?? [];

  if (!validation && !dirty) return null;

  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <Badge variant="outline">التغييرات الحالية لم تُفحص بعد</Badge>
          ) : null}
          {!dirty && errors.length ? (
            <Badge variant="destructive">
              <ShieldAlert data-icon="inline-start" />
              {errors.length} أخطاء
            </Badge>
          ) : null}
          {!dirty && warnings.length ? (
            <Badge variant="secondary">
              <AlertTriangle data-icon="inline-start" />
              {warnings.length} تنبيهات
            </Badge>
          ) : null}
          {!dirty && validation && !errors.length ? (
            <Badge>
              <CheckCircle2 data-icon="inline-start" />
              جاهزة للنشر
            </Badge>
          ) : null}
        </div>
        <p className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground lg:text-end">
          {dirty
            ? "احفظ أو افحص التغييرات الحالية للحصول على نتيجة محدثة من الباكند."
            : [...errors, ...warnings]
                  .map(mealBuilderIssueText)
                  .slice(0, 2)
                  .join(" • ") || "لا توجد مشاكل في آخر فحص."}
        </p>
      </CardContent>
    </Card>
  );
}

function AdvancedBuilderTools({
  onAddOptionGroup,
  onAddProductCategory,
  onAddProductList,
  notes,
  onNotesChange,
}: {
  onAddOptionGroup: () => void;
  onAddProductCategory: () => void;
  onAddProductList: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <details className="rounded-lg border bg-background p-3 shadow-none">
      <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
        أدوات متقدمة وملاحظات النشر
      </summary>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            استخدم إضافة قسم فقط للحالات غير المغطاة بالبطاقات الأساسية. قسم مميز
            تلقائي ولا تتم إدارة عضويته من هنا.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onAddOptionGroup}>
              <Plus data-icon="inline-start" /> مجموعة خيارات
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onAddProductCategory}
            >
              <Plus data-icon="inline-start" /> تصنيف منتجات
            </Button>
            <Button type="button" variant="secondary" onClick={onAddProductList}>
              <Plus data-icon="inline-start" /> قائمة منتجات
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>ملاحظات النشر</Label>
          <Textarea
            className="min-h-20"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="اكتب ملخصا واضحا للتغييرات المنشورة"
          />
        </div>
      </div>
    </details>
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
      <DialogContent
        className="max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>نشر المسودة</DialogTitle>
          <DialogDescription>
            تم حفظ وفحص المسودة بنجاح. لن تتغير نسخة العميل إلا بعد نجاح النشر
            من الخادم.
          </DialogDescription>
        </DialogHeader>
        {warnings ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            توجد {warnings} تنبيهات غير مانعة. راجعها قبل تأكيد النشر.
          </div>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            المسودة جاهزة ولا توجد أخطاء مانعة.
          </div>
        )}
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
        <DialogHeader>
          <DialogTitle>إلغاء تعديلات المسودة</DialogTitle>
          <DialogDescription>
            سيتم حذف جميع تعديلات المسودة وإعادتها لتطابق آخر نسخة منشورة. لن
            تتأثر النسخة الموجودة في تطبيق العميل.
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
            تأكيد الإعادة
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PremiumWarning({
  premiumSection,
}: {
  premiumSection: MealBuilderPremiumSection | null;
}) {
  const issues = [
    ...(premiumSection?.diagnostics ?? []),
    ...(premiumSection?.excluded ?? []),
    ...(premiumSection?.broken ?? []),
  ];
  if (!issues.length) return null;

  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>
        بعض العناصر المميزة غير متاحة بسبب مشكلة في المصدر أو الربط. راجع صفحة
        الترقيات المميزة قبل النشر.
      </span>
    </div>
  );
}

function EmptyBuilderState({
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
          title={
            loading
              ? "جاري تحميل منشئ الوجبات"
              : mode === "published"
                ? "لا توجد نسخة منشورة"
                : "لا توجد مسودة متاحة"
          }
          description="افتح المسودة ليقوم الخادم بتحميل مسودة العمل الحالية أو إنشاء القالب الافتراضي عند الحاجة."
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

function LoadErrorCard({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">تعذر تحميل منشئ الوجبات</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {mealBuilderErrorMessage(
                error,
                "تحقق من اتصال الباكند وصلاحيات الحساب ثم أعد المحاولة."
              )}
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

function LoadingLine() {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      جاري تحميل بيانات منشئ الوجبات...
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

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
  basedOnPublishedVersionId: string | null;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
};

function normalizePublished(
  data: MealBuilderLifecycleResponseData | null,
  state: MealBuilderState | null
): NormalizedMealBuilderView {
  const config = data?.config ?? data?.published ?? state?.published ?? null;
  const contract = data?.contract ?? state?.contract ?? state?.preview ?? null;
  const metadata = state?.metadata;

  return {
    config,
    validation: data?.validation ?? state?.validation.published ?? null,
    premiumSection:
      data?.premiumSection ??
      contractPremiumSection(contract) ??
      state?.premiumSection ??
      findPremiumSection(config?.sections),
    versionId: nullableString(data?.versionId ?? config?.id),
    versionNumber:
      data?.versionNumber ?? metadata?.versionNumber ?? config?.revisionHash ?? null,
    basedOnPublishedVersionId:
      data?.basedOnPublishedVersionId ??
      metadata?.basedOnPublishedVersionId ??
      null,
    hasUnpublishedChanges: Boolean(
      data?.hasUnpublishedChanges ?? metadata?.hasUnpublishedChanges
    ),
    publishedAt:
      data?.publishedAt ?? metadata?.publishedAt ?? config?.publishedAt ?? null,
    updatedAt: data?.updatedAt ?? metadata?.updatedAt ?? config?.updatedAt ?? null,
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
  const metadata = state?.metadata;
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
        metadata?.draftVersionId ??
        config?.id
    ),
    versionNumber:
      hydratedData?.versionNumber ??
      lifecycle?.versionNumber ??
      metadata?.versionNumber ??
      config?.revisionHash ??
      null,
    basedOnPublishedVersionId:
      hydratedData?.basedOnPublishedVersionId ??
      lifecycle?.basedOnPublishedVersionId ??
      metadata?.basedOnPublishedVersionId ??
      null,
    hasUnpublishedChanges: Boolean(
      hydratedData?.hasUnpublishedChanges ??
        lifecycle?.hasUnpublishedChanges ??
        metadata?.hasUnpublishedChanges
    ),
    publishedAt:
      lifecycle?.publishedAt ?? metadata?.publishedAt ?? config?.publishedAt ?? null,
    updatedAt:
      hydratedData?.updatedAt ??
      lifecycle?.updatedAt ??
      metadata?.updatedAt ??
      config?.updatedAt ??
      null,
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

function shortVersion(value?: string | null) {
  if (!value) return "-";
  return value.length > 12 ? `${value.slice(0, 12)}…` : value;
}

function formatSafeDate(value?: string | null) {
  if (!value) return "لا يوجد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function firstQueryError(
  queries: Array<{ isError: boolean; error: unknown }>
): unknown | null {
  return queries.find((query) => query.isError)?.error ?? null;
}
