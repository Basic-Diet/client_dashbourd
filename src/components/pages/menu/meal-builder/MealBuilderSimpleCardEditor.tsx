import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMealBuilderPickerQuery } from "@/hooks/menu";
import type {
  MenuCategory,
  MenuOption,
  MenuOptionGroup,
  MenuProduct,
} from "@/types/menuTypes";
import type {
  MealBuilderHydratedItem,
  MealBuilderSection,
} from "@/types/mealBuilderTypes";
import { VISUAL_SECTION_LABELS } from "./mealBuilderConstants";
import {
  canMoveMealBuilderItem,
  explicitProductIdsForSection,
  isAutomaticMealBuilderItem,
  isMealBuilderCandidateSelectable,
  mealBuilderErrorMessage,
  toEditableMealBuilderSection,
  toEditableMealBuilderSections,
  validateMealBuilderSectionDraft,
} from "./mealBuilderFrontendUtils";
import {
  emptySection,
  orderSections,
  sectionTreatsAsFullMeal,
  toggle,
} from "./mealBuilderUtils";
import type {
  MealBuilderVisualCard,
  MealBuilderVisualItem,
} from "./mealBuilderVisualModel";
import { buildMealBuilderVisualCards } from "./mealBuilderVisualModel";

type Catalog = {
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
};

const PICKER_PAGE_SIZE = 30;
const AUTOMATIC_PROTEIN_FAMILY_CARDS = new Set([
  "chicken",
  "beef",
  "fish",
  "eggs",
]);

export function MealBuilderSimpleCardEditor({
  open,
  card,
  sections,
  catalog,
  onClose,
  onSave,
}: {
  open: boolean;
  card: MealBuilderVisualCard;
  sections: MealBuilderSection[];
  catalog: Catalog;
  onClose: () => void;
  onSave: (sections: MealBuilderSection[]) => void;
}) {
  const [draftSections, setDraftSections] = useState(() =>
    orderSections(sections)
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [includeNotLinked, setIncludeNotLinked] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [deferredQuery, includeUnavailable, includeNotLinked]);

  const liveCard = rebuildCard(card.key, draftSections, catalog, card);
  const primaryIndex = findPrimarySectionIndex(card.key, draftSections, catalog);
  const primarySection =
    primaryIndex == null ? null : (draftSections[primaryIndex] ?? null);
  const sectionError = primarySection
    ? validateMealBuilderSectionDraft(primarySection)
    : null;
  const canCreateMissingSection = canCreateSectionForCard(card.key, catalog);
  const automaticProteinFamily = AUTOMATIC_PROTEIN_FAMILY_CARDS.has(
    liveCard.key
  );

  const pickerQuery = useMealBuilderPickerQuery(liveCard.key, {
    q: deferredQuery || undefined,
    includeUnavailable,
    includeNotLinked,
    page,
    limit: PICKER_PAGE_SIZE,
  });
  const picker = pickerQuery.data?.data ?? null;
  const candidates = (picker?.candidates ?? []).filter(
    (item): item is MealBuilderHydratedItem & { id: string } =>
      typeof item.id === "string" && item.id.length > 0
  );
  const totalPages = Math.max(1, picker?.meta?.pages ?? 1);
  const selectedItemKeys = useMemo(
    () => new Set(liveCard.items.map((item) => `${item.kind}:${item.id}`)),
    [liveCard.items]
  );
  const validSelectedIds = selectedIds.filter((encoded) => {
    const candidate = candidates.find((item) => encodeItem(item) === encoded);
    return candidate ? isMealBuilderCandidateSelectable(candidate) : false;
  });

  function patchPrimary(change: Partial<MealBuilderSection>) {
    setDraftSections((current) => {
      const index = findPrimarySectionIndex(liveCard.key, current, catalog);
      if (index == null) return current;
      return current.map((section, sectionIndex) =>
        sectionIndex === index
          ? { ...toEditableMealBuilderSection(section), ...change }
          : section
      );
    });
  }

  function toggleCandidate(item: MealBuilderHydratedItem) {
    if (!isMealBuilderCandidateSelectable(item)) return;
    const encoded = encodeItem(item);
    if (selectedItemKeys.has(encoded)) return;
    setSelectedIds((current) => toggle(current, encoded));
  }

  function addSelectedItems() {
    if (!validSelectedIds.length) return;
    setDraftSections((current) =>
      addItemsToCard(current, liveCard.key, validSelectedIds, catalog)
    );
    setSelectedIds([]);
  }

  function saveEditor() {
    const latestIndex = findPrimarySectionIndex(
      liveCard.key,
      draftSections,
      catalog
    );
    const latestSection =
      latestIndex == null ? null : (draftSections[latestIndex] ?? null);
    const latestError = latestSection
      ? validateMealBuilderSectionDraft(latestSection)
      : null;
    if (latestError) return;
    onSave(toEditableMealBuilderSections(draftSections));
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="grid h-[min(92dvh,820px)] w-[calc(100%-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <DialogHeader className="border-b px-4 py-4 text-right sm:px-6">
          <div className="flex max-w-[92%] items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <DialogTitle>تعديل {liveCard.labelAr}</DialogTitle>
              <DialogDescription>
                اختر العناصر التي تظهر للعميل، ثم راجع إعدادات الاختيار عند الحاجة.
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {liveCard.items.length} عناصر
            </Badge>
          </div>
        </DialogHeader>

        <Tabs
          defaultValue="items"
          className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]"
          dir="rtl"
        >
          <div className="border-b px-4 py-3 sm:px-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="items">العناصر</TabsTrigger>
              <TabsTrigger value="settings">إعدادات البطاقة</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="items"
            className="m-0 min-h-0 overflow-y-auto px-4 py-4 sm:px-6"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">العناصر الحالية</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      غيّر الترتيب أو احذف العناصر غير التلقائية.
                    </p>
                  </div>
                  <Badge variant="outline">{liveCard.items.length}</Badge>
                </div>

                {automaticProteinFamily ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    عناصر هذه العائلة يضيفها الخادم تلقائيًا. يمكن ترتيبها فقط.
                  </p>
                ) : null}

                <div className="divide-y overflow-hidden rounded-lg border">
                  {liveCard.items.length ? (
                    liveCard.items.map((item, index) => {
                      const automatic =
                        automaticProteinFamily || isAutomaticMealBuilderItem(item);
                      return (
                        <SelectedItemRow
                          key={`${item.kind}:${item.id}`}
                          item={item}
                          automatic={automatic}
                          canMoveUp={canMoveMealBuilderItem(
                            liveCard.items,
                            index,
                            "up"
                          )}
                          canMoveDown={canMoveMealBuilderItem(
                            liveCard.items,
                            index,
                            "down"
                          )}
                          canRemove={!automatic}
                          onMove={(direction) =>
                            setDraftSections((current) =>
                              moveItem(
                                current,
                                liveCard.items,
                                item,
                                direction,
                                catalog
                              )
                            )
                          }
                          onRemove={() =>
                            setDraftSections((current) =>
                              removeItem(current, item, catalog)
                            )
                          }
                        />
                      );
                    })
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      لا توجد عناصر في البطاقة حتى الآن.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor="meal-builder-item-search">إضافة عناصر</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="meal-builder-item-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ابحث باسم العنصر"
                        className="pr-9 text-right"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={
                      !validSelectedIds.length ||
                      (!primarySection && !canCreateMissingSection)
                    }
                    onClick={addSelectedItems}
                  >
                    <Plus data-icon="inline-start" />
                    إضافة {validSelectedIds.length || ""}
                  </Button>
                </div>

                {!primarySection && !canCreateMissingSection ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    لا يمكن إضافة عناصر لهذه البطاقة قبل تجهيز مصدرها في الكتالوج.
                  </p>
                ) : null}

                <div className="overflow-hidden rounded-lg border">
                  {pickerQuery.isLoading ? (
                    <PickerMessage loading>جاري تحميل العناصر المتاحة...</PickerMessage>
                  ) : pickerQuery.isError ? (
                    <div className="space-y-3 p-4">
                      <p className="text-sm text-destructive">
                        {mealBuilderErrorMessage(
                          pickerQuery.error,
                          "تعذر تحميل العناصر المتاحة"
                        )}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => pickerQuery.refetch()}
                      >
                        <RefreshCw data-icon="inline-start" /> إعادة المحاولة
                      </Button>
                    </div>
                  ) : candidates.length ? (
                    <div className="divide-y">
                      {candidates.map((item) => {
                        const encoded = encodeItem(item);
                        const alreadyAdded = selectedItemKeys.has(encoded);
                        const selectable =
                          !alreadyAdded && isMealBuilderCandidateSelectable(item);
                        return (
                          <CandidateRow
                            key={`${item.type}:${item.id}`}
                            item={item}
                            checked={selectedIds.includes(encoded)}
                            alreadyAdded={alreadyAdded}
                            selectable={selectable}
                            onToggle={() => toggleCandidate(item)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <PickerMessage>لا توجد عناصر مطابقة.</PickerMessage>
                  )}
                </div>

                <PickerPagination
                  page={picker?.meta?.page ?? page}
                  totalPages={totalPages}
                  total={picker?.meta?.total ?? candidates.length}
                  disabled={pickerQuery.isFetching}
                  onPageChange={setPage}
                />

                <details className="rounded-lg border bg-muted/10 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                    خيارات التشخيص
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <SwitchLine
                      label="إظهار غير المتاح"
                      checked={includeUnavailable}
                      onChange={setIncludeUnavailable}
                    />
                    <SwitchLine
                      label="إظهار غير المرتبط"
                      checked={includeNotLinked}
                      onChange={setIncludeNotLinked}
                    />
                  </div>
                </details>
              </section>
            </div>
          </TabsContent>

          <TabsContent
            value="settings"
            className="m-0 min-h-0 overflow-y-auto px-4 py-4 sm:px-6"
          >
            <div className="mx-auto max-w-3xl space-y-4">
              <section className="space-y-4 rounded-lg border p-4">
                <div>
                  <h3 className="font-semibold">طريقة ظهور البطاقة</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    هذه الإعدادات تتحكم في العنوان وعدد الاختيارات المتاحة للعميل.
                  </p>
                </div>

                <TextField
                  label="عنوان البطاقة"
                  value={
                    primarySection?.titleOverride.ar ??
                    VISUAL_SECTION_LABELS[liveCard.key]?.ar ??
                    ""
                  }
                  disabled={!primarySection}
                  onChange={(value) =>
                    patchPrimary({
                      titleOverride: {
                        ar: value,
                        en: primarySection?.titleOverride.en ?? "",
                      },
                    })
                  }
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <SwitchLine
                    label="ظاهرة للعميل"
                    checked={primarySection?.visible ?? true}
                    disabled={!primarySection}
                    onChange={(visible) => patchPrimary({ visible })}
                  />
                  <SwitchLine
                    label="اختيار إجباري"
                    checked={primarySection?.required ?? false}
                    disabled={!primarySection}
                    onChange={(required) => patchPrimary({ required })}
                  />
                  <SwitchLine
                    label="يسمح بأكثر من اختيار"
                    checked={primarySection?.multiSelect ?? false}
                    disabled={!primarySection}
                    onChange={(multiSelect) => patchPrimary({ multiSelect })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="أقل عدد اختيارات"
                    value={primarySection?.minSelections ?? 0}
                    disabled={!primarySection}
                    onChange={(value) =>
                      patchPrimary({ minSelections: value === "" ? 0 : value })
                    }
                  />
                  <NumberField
                    label="أقصى عدد اختيارات"
                    value={primarySection?.maxSelections ?? ""}
                    disabled={!primarySection}
                    onChange={(value) =>
                      patchPrimary({ maxSelections: value === "" ? null : value })
                    }
                  />
                </div>

                <details className="rounded-lg border bg-muted/10 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    العنوان الإنجليزي
                  </summary>
                  <div className="mt-3">
                    <TextField
                      label="English title"
                      value={
                        primarySection?.titleOverride.en ??
                        VISUAL_SECTION_LABELS[liveCard.key]?.en ??
                        ""
                      }
                      disabled={!primarySection}
                      dir="ltr"
                      onChange={(value) =>
                        patchPrimary({
                          titleOverride: {
                            ar: primarySection?.titleOverride.ar ?? "",
                            en: value,
                          },
                        })
                      }
                    />
                  </div>
                </details>

                {sectionError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {sectionError}
                  </p>
                ) : null}
              </section>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-start sm:px-6">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={Boolean(sectionError)}
            onClick={saveEditor}
          >
            حفظ التغييرات
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidateRow({
  item,
  checked,
  alreadyAdded,
  selectable,
  onToggle,
}: {
  item: MealBuilderHydratedItem;
  checked: boolean;
  alreadyAdded: boolean;
  selectable: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-3 ${
        selectable ? "cursor-pointer hover:bg-muted/40" : "bg-muted/20 opacity-70"
      }`}
    >
      <Checkbox
        checked={alreadyAdded || checked}
        disabled={!selectable}
        onCheckedChange={onToggle}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {hydratedItemName(item)}
        </span>
        <span className="block text-xs text-muted-foreground">
          {alreadyAdded ? "موجود بالفعل" : pickerStateLabel(item.state)}
        </span>
      </span>
      <Badge variant="outline" className="shrink-0">
        {item.type?.includes("product") ? "منتج" : "خيار"}
      </Badge>
    </label>
  );
}

function SelectedItemRow({
  item,
  automatic,
  canMoveUp,
  canMoveDown,
  canRemove,
  onMove,
  onRemove,
}: {
  item: MealBuilderVisualItem;
  automatic: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">
          {automatic ? "يُدار تلقائيًا" : item.kind === "product" ? "منتج" : "خيار"}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveUp}
          onClick={() => onMove("up")}
          aria-label={`تحريك ${item.name} لأعلى`}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canMoveDown}
          onClick={() => onMove("down")}
          aria-label={`تحريك ${item.name} لأسفل`}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`حذف ${item.name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function PickerPagination({
  page,
  totalPages,
  total,
  disabled,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return <p className="text-xs text-muted-foreground">{total} نتيجة</p>;
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>
        {total} نتيجة · {page} من {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight className="size-4" /> السابق
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          التالي <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function PickerMessage({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </p>
  );
}

function rebuildCard(
  cardKey: string,
  sections: MealBuilderSection[],
  catalog: Catalog,
  fallback: MealBuilderVisualCard
) {
  return (
    buildMealBuilderVisualCards({
      sections,
      products: catalog.products,
      categories: catalog.categories,
      options: catalog.options,
      issues: [],
    }).find((item) => item.key === cardKey) ?? fallback
  );
}

function addItemsToCard(
  sections: MealBuilderSection[],
  cardKey: string,
  encodedIds: string[],
  catalog: Catalog
): MealBuilderSection[] {
  return encodedIds.reduce<MealBuilderSection[]>((current, encoded) => {
    const separator = encoded.indexOf(":");
    const kind = encoded.slice(0, separator);
    const id = encoded.slice(separator + 1);
    return kind === "option"
      ? addOptionToCard(current, cardKey, id, catalog)
      : addProductToCard(current, cardKey, id, catalog);
  }, sections);
}

function addOptionToCard(
  sections: MealBuilderSection[],
  cardKey: string,
  optionId: string,
  catalog: Catalog
): MealBuilderSection[] {
  const ensured = ensureOptionSectionIndex(sections, cardKey, catalog);
  if (!ensured) return sections;
  const section = ensured.sections[ensured.index];
  if (!section || section.selectedOptionIds.includes(optionId)) {
    return ensured.sections;
  }

  return ensured.sections.map((item, itemIndex) =>
    itemIndex === ensured.index
      ? {
          ...toEditableMealBuilderSection(item),
          selectedOptionIds: [...item.selectedOptionIds, optionId],
        }
      : item
  );
}

function addProductToCard(
  sections: MealBuilderSection[],
  cardKey: string,
  productId: string,
  catalog: Catalog
): MealBuilderSection[] {
  const ensured = ensureProductSectionIndex(sections, cardKey, catalog);
  const section = ensured.sections[ensured.index];
  if (!section || section.selectedProductIds.includes(productId)) {
    return ensured.sections;
  }

  return ensured.sections.map((item, itemIndex) =>
    itemIndex === ensured.index
      ? {
          ...toEditableMealBuilderSection(item),
          includeMode: "selected" as const,
          selectedProductIds: [...item.selectedProductIds, productId],
        }
      : item
  );
}

function removeItem(
  sections: MealBuilderSection[],
  item: MealBuilderVisualItem,
  catalog: Catalog
): MealBuilderSection[] {
  if (isAutomaticMealBuilderItem(item)) return sections;

  return sections.map((section, index) => {
    if (index !== item.sourceSectionIndex) return section;
    const editable = toEditableMealBuilderSection(section);

    if (item.kind === "option") {
      return {
        ...editable,
        selectedOptionIds: section.selectedOptionIds.filter(
          (id) => id !== item.id
        ),
      };
    }

    return {
      ...editable,
      includeMode: "selected" as const,
      selectedProductIds: explicitProductIdsForSection(
        section,
        catalog.products
      ).filter((id) => id !== item.id),
    };
  });
}

function moveItem(
  sections: MealBuilderSection[],
  cardItems: MealBuilderVisualItem[],
  item: MealBuilderVisualItem,
  direction: "up" | "down",
  catalog: Catalog
): MealBuilderSection[] {
  const cardIndex = cardItems.findIndex(
    (entry) => entry.id === item.id && entry.kind === item.kind
  );
  if (!canMoveMealBuilderItem(cardItems, cardIndex, direction)) return sections;

  const targetCardItem =
    cardItems[direction === "up" ? cardIndex - 1 : cardIndex + 1];
  if (!targetCardItem) return sections;

  return sections.map((section, sectionIndex) => {
    if (sectionIndex !== item.sourceSectionIndex) return section;
    const editable = toEditableMealBuilderSection(section);
    const ids =
      item.kind === "product"
        ? explicitProductIdsForSection(section, catalog.products)
        : section.selectedOptionIds;
    const nextIds = swapIds(ids, item.id, targetCardItem.id);

    return item.kind === "product"
      ? {
          ...editable,
          includeMode: "selected" as const,
          selectedProductIds: nextIds,
        }
      : { ...editable, selectedOptionIds: nextIds };
  });
}

function swapIds(ids: string[], currentId: string, targetId: string) {
  const next = [...ids];
  const currentIndex = next.indexOf(currentId);
  const targetIndex = next.indexOf(targetId);
  if (currentIndex < 0 || targetIndex < 0) return ids;
  [next[currentIndex], next[targetIndex]] = [
    next[targetIndex],
    next[currentIndex],
  ];
  return next;
}

function ensureOptionSectionIndex(
  sections: MealBuilderSection[],
  cardKey: string,
  catalog: Catalog
): { sections: MealBuilderSection[]; index: number } | null {
  const existingIndex = findPrimarySectionIndex(cardKey, sections, catalog);
  if (existingIndex != null) return { sections, index: existingIndex };

  const groupKey = cardKey === "carbs" ? "carbs" : "proteins";
  const group = catalog.groups.find((item) => item.key === groupKey);
  const product = catalog.products.find((item) => item.key === "basic_meal");
  if (!group || !product) return null;

  const label = VISUAL_SECTION_LABELS[cardKey];
  const nextSection: MealBuilderSection = {
    ...emptySection("option_group"),
    key: cardKey,
    sourceKind: "visual_family",
    productContextId: product.id,
    sourceGroupId: group.id,
    selectionType: "standard_meal",
    titleOverride: { ar: label?.ar ?? "", en: label?.en ?? "" },
    sortOrder: sections.length + 1,
    required: true,
    minSelections: 1,
    maxSelections: cardKey === "carbs" ? 2 : 1,
    multiSelect: cardKey === "carbs",
    metadata:
      cardKey === "carbs"
        ? {
            visualRole: "carbs",
            appliesTo: ["configurable_plate_meal"],
            excludesSelectionTypes: ["sandwich"],
          }
        : { visualRole: "protein_family", proteinFamilyKey: cardKey },
    rules:
      cardKey === "carbs"
        ? {
            ruleKey: "carb_split",
            maxTypes: 2,
            maxTotalGrams: 300,
            unit: "grams",
          }
        : {},
  };

  return { sections: [...sections, nextSection], index: sections.length };
}

function ensureProductSectionIndex(
  sections: MealBuilderSection[],
  cardKey: string,
  catalog: Catalog
) {
  const existingIndex = findPrimarySectionIndex(cardKey, sections, catalog);
  if (existingIndex != null) return { sections, index: existingIndex };

  const selectionType = cardKey === "sandwich" ? "sandwich" : cardKey;
  const label = VISUAL_SECTION_LABELS[cardKey];
  const category = catalog.categories.find(
    (item) =>
      item.key === cardKey ||
      (cardKey === "sandwich" && item.key === "cold_sandwiches")
  );
  const type = category ? "product_category" : "product_list";
  const nextSection: MealBuilderSection = {
    ...emptySection(type),
    key: cardKey,
    sourceKind: "product_list",
    sourceCategoryId:
      type === "product_category" ? (category?.id ?? null) : null,
    includeMode: "selected",
    selectionType,
    titleOverride: { ar: label?.ar ?? "", en: label?.en ?? "" },
    sortOrder: sections.length + 1,
    required: false,
    minSelections: 0,
    maxSelections: 1,
    multiSelect: false,
    metadata: { requiresBuilder: false, treatAsFullMeal: true },
    rules: { carbsRequired: false },
  };

  return { sections: [...sections, nextSection], index: sections.length };
}

function findPrimarySectionIndex(
  cardKey: string,
  sections: MealBuilderSection[],
  catalog: Catalog
): number | null {
  const byKeyIndex = sections.findIndex((section) => section.key === cardKey);
  if (byKeyIndex >= 0) return byKeyIndex;

  if (["chicken", "beef", "fish", "eggs", "carbs"].includes(cardKey)) {
    const groupKey = cardKey === "carbs" ? "carbs" : "proteins";
    const index = sections.findIndex(
      (section) =>
        section.sectionType === "option_group" &&
        section.selectionType === "standard_meal" &&
        catalog.groups.find((group) => group.id === section.sourceGroupId)?.key ===
          groupKey
    );
    return index >= 0 ? index : null;
  }

  const index = sections.findIndex(
    (section) =>
      section.sectionType !== "option_group" &&
      (section.selectionType === cardKey ||
        (cardKey === "sandwich" && section.selectionType === "sandwich") ||
        sectionTreatsAsFullMeal(section))
  );
  return index >= 0 ? index : null;
}

function canCreateSectionForCard(cardKey: string, catalog: Catalog) {
  if (["chicken", "beef", "fish", "eggs", "carbs"].includes(cardKey)) {
    const groupKey = cardKey === "carbs" ? "carbs" : "proteins";
    return Boolean(
      catalog.products.some((product) => product.key === "basic_meal") &&
        catalog.groups.some((group) => group.key === groupKey)
    );
  }
  return cardKey !== "premium";
}

function encodeItem(item: MealBuilderHydratedItem) {
  const kind = item.type?.includes("product") ? "product" : "option";
  return `${kind}:${item.id}`;
}

function hydratedItemName(item: MealBuilderHydratedItem) {
  return (
    item.label ||
    item.name?.ar ||
    item.name?.en ||
    item.key ||
    "عنصر غير معروف"
  );
}

function pickerStateLabel(state?: string) {
  if (state === "selected") return "مختار حاليًا";
  if (state === "eligible" || state === "addable") return "متاح للإضافة";
  if (state === "not_linked") return "غير مرتبط";
  if (state === "unavailable") return "غير متاح";
  return "غير مؤهل";
}

function TextField({
  label,
  value,
  disabled,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  dir?: "rtl" | "ltr";
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        disabled={disabled}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | "";
  disabled?: boolean;
  onChange: (value: number | "") => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step="1"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      />
    </div>
  );
}

function SwitchLine({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
