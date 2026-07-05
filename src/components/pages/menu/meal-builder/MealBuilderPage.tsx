import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
  MEAL_BUILDER_KEY,
  MEAL_BUILDER_HYDRATED_KEY,
  MEAL_BUILDER_READINESS_KEY,
  useCreateMealBuilderDraftMutation,
  useMealBuilderHydratedQuery,
  useMealBuilderQuery,
  useMealBuilderReadinessQuery,
  useMenuCategoriesQuery,
  useMenuOptionGroupsQuery,
  useMenuOptionsQuery,
  useMenuProductsQuery,
  usePublishMealBuilderDraftMutation,
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
  MealBuilderSection,
  MealBuilderSectionType,
  MealBuilderValidation,
} from "@/types/mealBuilderTypes";
import { MealBuilderCardEditor } from "./MealBuilderCardEditor";
import { MealBuilderStatusCards } from "./MealBuilderStatusCards";
import { MealBuilderSectionEditor } from "./MealBuilderSectionEditor";
import { MealBuilderVisualCard } from "./MealBuilderVisualCard";
import { mealBuilderIssueText } from "./mealBuilderIssueText";
import { orderSections, toBackendSections } from "./mealBuilderUtils";
import { buildMealBuilderVisualCards } from "./mealBuilderVisualModel";

type EditorState = {
  type: MealBuilderSectionType;
  index: number | null;
} | null;

export function MealBuilderPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const builderQuery = useMealBuilderQuery();
  const hydratedQuery = useMealBuilderHydratedQuery();
  const readinessQuery = useMealBuilderReadinessQuery();
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
  const createDraft = useCreateMealBuilderDraftMutation();

  const state = builderQuery.data?.data;
  const hydrated = hydratedQuery.data?.data ?? null;
  const draft = hydrated?.draft ?? state?.draft ?? null;
  const published = state?.published ?? null;
  const readiness = readinessQuery.data?.data ?? hydrated?.validation ?? null;
  const catalog = {
    products: productsQuery.data?.data.items ?? [],
    categories: categoriesQuery.data?.data.items ?? [],
    groups: groupsQuery.data?.data.items ?? [],
    options: optionsQuery.data?.data.items ?? [],
  };
  const loading =
    builderQuery.isLoading ||
    hydratedQuery.isLoading ||
    readinessQuery.isLoading ||
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    groupsQuery.isLoading ||
    optionsQuery.isLoading;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_KEY] });
    queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_HYDRATED_KEY] });
    queryClient.invalidateQueries({ queryKey: [MEAL_BUILDER_READINESS_KEY] });
  }

  return (
    <div className="grid gap-5" data-embedded={embedded || undefined} dir="rtl">
      <HeaderCard
        onCreateDraft={() => createDraft.mutate()}
        onRefresh={refresh}
        pending={createDraft.isPending}
      />
      <MealBuilderStatusCards
        draft={draft}
        published={published}
        readiness={readiness}
      />

      {draft ? (
        <MealBuilderWorkspace
          key={`${draft.id}:${draft.updatedAt ?? ""}`}
          draft={draft}
          readiness={readiness}
          initialValidation={hydrated?.validation ?? state?.validation.draft ?? null}
          catalog={catalog}
          loading={loading}
        />
      ) : (
        <Card className="border-border/80 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <MenuEmptyState
              title="لا توجد مسودة"
              description="ابدأ من النسخة المنشورة الحالية ثم عدّل البطاقات المطلوبة فقط."
            />
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => createDraft.mutate()}
                disabled={createDraft.isPending}
              >
                <Plus data-icon="inline-start" />
                إنشاء مسودة
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HeaderCard({
  pending,
  onCreateDraft,
  onRefresh,
}: {
  pending: boolean;
  onCreateDraft: () => void;
  onRefresh: () => void;
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="size-5 text-primary" />
              منشئ الوجبات
            </CardTitle>
            <CardDescription>
              عدّل ترتيب وخيارات وجبات الاشتراك من شاشة واحدة بسيطة.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onRefresh}
            >
              <RefreshCw data-icon="inline-start" />
              تحديث
            </Button>
            <Button type="button" disabled={pending} onClick={onCreateDraft}>
              <Plus data-icon="inline-start" />
              إنشاء مسودة
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function MealBuilderWorkspace({
  draft,
  readiness,
  initialValidation,
  catalog,
  loading,
}: {
  draft: MealBuilderConfig;
  readiness: MealBuilderValidation | null;
  initialValidation: MealBuilderValidation | null;
  catalog: {
    products: MenuProduct[];
    categories: MenuCategory[];
    groups: MenuOptionGroup[];
    options: MenuOption[];
  };
  loading: boolean;
}) {
  const saveDraft = useSaveMealBuilderDraftMutation();
  const validateDraft = useValidateMealBuilderDraftMutation();
  const publishDraft = usePublishMealBuilderDraftMutation();
  const [sections, setSections] = useState(() => orderSections(draft.sections));
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);
  const [cardEditorKey, setCardEditorKey] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [validation, setValidation] = useState<MealBuilderValidation | null>(
    initialValidation
  );

  const currentValidation = validation ?? initialValidation;
  const visualCards = buildMealBuilderVisualCards({
    sections,
    products: catalog.products,
    categories: catalog.categories,
    options: catalog.options,
    issues: [
      ...(currentValidation?.errors ?? []),
      ...(currentValidation?.warnings ?? []),
    ],
  });
  const reviewValidation = currentValidation ?? readiness;
  const hasErrors =
    Boolean(currentValidation?.errors.length) ||
    Boolean(readiness?.errors.length);
  const pending =
    saveDraft.isPending || validateDraft.isPending || publishDraft.isPending;
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

  function replaceSections(next: MealBuilderSection[]) {
    setSections(
      orderSections(next).map((item, index) => ({
        ...item,
        sortOrder: index + 1,
      }))
    );
    setDirty(true);
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="sticky top-2 z-20 border-border/80 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardContent className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">بطاقات منشئ الوجبات</CardTitle>
                {dirty ? <Badge variant="secondary">تغييرات غير محفوظة</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                راجع العناصر الظاهرة للعميل وعدّل البطاقة عند الحاجة.
              </p>
            </div>
            <DraftActions
              dirty={dirty}
              hasErrors={hasErrors}
              pending={pending}
              onSave={() =>
                saveDraft.mutate(payload, { onSuccess: () => setDirty(false) })
              }
              onValidate={() =>
                validateDraft.mutate(payload, {
                  onSuccess: (result) => setValidation(result.data),
                })
              }
              onPublish={() => setPublishOpen(true)}
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
            setDirty(true);
          }}
        />

        <ValidationSummary validation={reviewValidation} dirty={dirty} />

        <Card className="border-border/80 shadow-none">
          <CardContent className="space-y-4 pt-5">
            {loading ? (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                جار تحميل بيانات منشئ الوجبات...
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-2">
              {visualCards.map((card) => (
                <MealBuilderVisualCard
                  key={card.key}
                  card={card}
                  onEdit={() => setCardEditorKey(card.key)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {editor ? (
        <MealBuilderSectionEditor
          key={`${editor.type}:${editor.index ?? "new"}:${sections[editor.index ?? -1]?.id ?? ""}`}
          open
          type={editor.type}
          initial={editor.index == null ? null : (sections[editor.index] ?? null)}
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

      {cardEditorKey ? (
        <MealBuilderCardEditor
          key={cardEditorKey}
          open
          card={
            visualCards.find((card) => card.key === cardEditorKey) ??
            visualCards[0]
          }
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
        warnings={currentValidation?.warnings.length ?? 0}
        onClose={() => setPublishOpen(false)}
        onPublish={() =>
          publishDraft.mutate(notes, {
            onSuccess: (result) => {
              setPublishOpen(false);
              setDirty(false);
              setValidation(result.data.validation);
            },
          })
        }
      />
    </>
  );
}

function DraftActions({
  dirty,
  hasErrors,
  pending,
  onSave,
  onValidate,
  onPublish,
}: {
  dirty: boolean;
  hasErrors: boolean;
  pending: boolean;
  onSave: () => void;
  onValidate: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Button type="button" onClick={onSave} disabled={pending || !dirty}>
        <Save data-icon="inline-start" />
        حفظ التغييرات
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onValidate}
        disabled={pending}
      >
        <CheckCircle2 data-icon="inline-start" />
        مراجعة
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onPublish}
        disabled={pending || dirty || hasErrors}
      >
        <Send data-icon="inline-start" />
        نشر
      </Button>
      {dirty ? (
        <p className="text-xs text-muted-foreground">احفظ التغييرات قبل النشر.</p>
      ) : null}
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
  const issueCount = errors.length + warnings.length;
  const previewMessages = [...errors, ...warnings]
    .map(mealBuilderIssueText)
    .slice(0, 2);

  if (!validation && !dirty) {
    return null;
  }

  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {errors.length ? (
            <Badge variant="destructive">
              <ShieldAlert data-icon="inline-start" />
              {errors.length} أخطاء
            </Badge>
          ) : null}
          {warnings.length ? (
            <Badge variant="secondary">
              <AlertTriangle data-icon="inline-start" />
              تنبيهات للمراجعة
            </Badge>
          ) : null}
          {!issueCount && validation ? (
            <Badge variant="default">
              <CheckCircle2 data-icon="inline-start" />
              جاهز
            </Badge>
          ) : null}
          {dirty ? <Badge variant="outline">يحتاج حفظ</Badge> : null}
        </div>
        <div className="min-w-0 flex-1 text-sm text-muted-foreground lg:text-end">
          {errors.length ? (
            <p className="truncate">{previewMessages.join(" • ")}</p>
          ) : warnings.length ? (
            <p className="truncate">
              لا توجد أخطاء مانعة. راجع التنبيهات الاختيارية قبل النشر.
            </p>
          ) : validation ? (
            <p>لا توجد مشاكل في آخر مراجعة.</p>
          ) : (
            <p>راجع البطاقات قبل النشر.</p>
          )}
        </div>
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
            استخدم هذه الأدوات فقط عند إضافة نوع جديد من الأقسام.
          </p>
          <div className="flex flex-wrap gap-2">
            <ToolbarButton
              icon={Plus}
              label="مجموعة خيارات"
              onClick={onAddOptionGroup}
              variant="secondary"
            />
            <ToolbarButton
              icon={Plus}
              label="تصنيف منتجات"
              onClick={onAddProductCategory}
              variant="secondary"
            />
            <ToolbarButton
              icon={Plus}
              label="قائمة منتجات"
              onClick={onAddProductList}
              variant="secondary"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>ملاحظات النشر</Label>
          <Textarea
            className="min-h-20"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="ملاحظة داخلية اختيارية"
          />
        </div>
      </div>
    </details>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant,
}: {
  icon: typeof Save;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "outline" | "secondary";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon data-icon="inline-start" />
      {label}
    </Button>
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
          <DialogTitle>نشر منشئ الوجبات</DialogTitle>
          <DialogDescription>
            النشر سيغيّر ترتيب وأقسام منشئ الوجبات في تطبيق العملاء.
          </DialogDescription>
        </DialogHeader>
        {warnings ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            توجد تحذيرات. راجعها قبل النشر.
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" disabled={pending} onClick={onPublish}>
            <Send data-icon="inline-start" />
            نشر
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
