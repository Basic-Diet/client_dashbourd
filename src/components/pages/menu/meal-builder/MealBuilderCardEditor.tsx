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

const PICKER_PAGE_SIZE = 50;
const AUTOMATIC_PROTEIN_FAMILY_CARDS = new Set([
  "chicken",
  "beef",
  "fish",
  "eggs",
]);

export function MealBuilderCardEditor({
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
    setQuery("");
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
        className="grid max-h-[92dvh] w-[calc(100%-1rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <div className="flex w-[95%] flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <DialogTitle>تعديل بطاقة {liveCard.labelAr}</DialogTitle>
              <DialogDescription>
                عدّل قواعد البطاقة، راجع العناصر الحالية، ثم أضف العناصر المؤهلة
                فقط من نتائج الباكند.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{liveCard.items.length} عناصر</Badge>
              {automaticProteinFamily ? (
                <Badge variant="outline">عضوية تلقائية من الباكند</Badge>
              ) : null}
              {pickerQuery.isFetching ? (
                <Badge variant="outline">
                  <Loader2 className="size-3 animate-spin" /> تحديث النتائج
                </Badge>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-6 lg:grid lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4 lg:overflow-hidden">
          <section className="space-y-3 rounded-lg border bg-muted/10 p-3">
            {!primarySection && !canCreateMissingSection ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                لا يمكن إنشاء مصدر هذه البطاقة لأن منتج السياق أو مجموعة الخيارات
                المطلوبة غير موجودة في الكتالوج.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <SwitchLine
                label="ظاهر للعميل"
                checked={primarySection?.visible ?? true}
                disabled={!primarySection}
                onChange={(visible) => patchPrimary({ visible })}
              />
              <SwitchLine
                label="إجباري"
                checked={primarySection?.required ?? false}
                disabled={!primarySection}
                onChange={(required) => patchPrimary({ required })}
              />
              <SwitchLine
                label="اختيار متعدد"
                checked={primarySection?.multiSelect ?? false}
                disabled={!primarySection}
                onChange={(multiSelect) => patchPrimary({ multiSelect })}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <TextField
                label="عنوان القسم بالعربي"
                value={
                  primarySection?.titleOverride.ar ??
                  VISUAL_SECTION_LABELS[liveCard.key]?.ar ??
                  ""
                }
                onChange={(value) =>
                  patchPrimary({
                    titleOverride: {
                      ar: value,
                      en: primarySection?.titleOverride.en ?? "",
                    },
                  })
                }
                disabled={!primarySection}
              />
              <TextField
                label="عنوان القسم بالإنجليزي"
                value={
                  primarySection?.titleOverride.en ??
                  VISUAL_SECTION_LABELS[liveCard.key]?.en ??
                  ""
                }
                onChange={(value) =>
                  patchPrimary({
                    titleOverride: {
                      ar: primarySection?.titleOverride.ar ?? "",
                      en: value,
                    },
                  })
                }
                disabled={!primarySection}
                dir="ltr"
              />
              <NumberField
                label="الحد الأدنى"
                value={primarySection?.minSelections ?? 0}
                disabled={!primarySection}
                onChange={(value) =>
                  patchPrimary({ minSelections: value === "" ? 0 : value })
                }
              />
              <NumberField
                label="الحد الأقصى"
                value={primarySection?.maxSelections ?? ""}
                disabled={!primarySection}
                onChange={(value) =>
                  patchPrimary({ maxSelections: value === "" ? null : value })
                }
              />
            </div>

            {sectionError ? (
              <p className="text-sm text-destructive">{sectionError}</p>
            ) : null}
          </section>

          <div className="mt-4 grid min-h-0 gap-4 lg:mt-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="grid min-h-0 gap-2 rounded-lg border p-3 lg:grid-rows-[auto_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>العناصر الموجودة في البطاقة</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {automaticProteinFamily
                      ? "الخادم يضمن وجود كل عناصر عائلة البروتين الجاهزة؛ يمكن ترتيبها لكن لا يمكن حذفها من هنا."
                      : "الأسهم تعمل داخل نفس مصدر القسم فقط."}
                  </p>
                </div>
                <Badge variant="outline">{liveCard.items.length}</Badge>
              </div>

              <div className="divide-y rounded-lg border lg:min-h-0 lg:overflow-auto">
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
                    لا توجد عناصر مختارة داخل هذه البطاقة.
                  </p>
                )}
              </div>
            </section>

            <section className="grid min-h-0 gap-3 rounded-lg border p-3 lg:grid-rows-[auto_auto_minmax(0,1fr)_auto]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label>إضافة عناصر مؤهلة</Label>
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو المفتاح"
                    className="text-right"
                  />
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
                  إضافة ({validSelectedIds.length})
                </Button>
              </div>

              <details className="rounded-md border bg-muted/10 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium">
                  نتائج تشخيصية متقدمة
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                <p className="mt-2 text-xs text-muted-foreground">
                  العناصر التشخيصية تظهر لفهم المشكلة فقط، ولا يمكن إضافتها ما لم
                  يؤكد الباكند أنها مؤهلة.
                </p>
              </details>

              <div className="rounded-lg border lg:min-h-0 lg:overflow-auto">
                {pickerQuery.isLoading ? (
                  <PickerMessage icon="loading">
                    جاري تحميل العناصر المناسبة لهذه البطاقة...
                  </PickerMessage>
                ) : pickerQuery.isError ? (
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-destructive">
                      {mealBuilderErrorMessage(
                        pickerQuery.error,
                        "تعذر تحميل عناصر هذه البطاقة"
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
                      const checked = selectedIds.includes(encoded);

                      return (
                        <CandidateRow
                          key={`${item.type}:${item.id}`}
                          item={item}
                          checked={checked}
                          alreadyAdded={alreadyAdded}
                          selectable={selectable}
                          onToggle={() => toggleCandidate(item)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <PickerMessage>
                    لا توجد نتائج مطابقة للبحث والفلاتر الحالية.
                  </PickerMessage>
                )}
              </div>

              <PickerPagination
                page={picker?.meta?.page ?? page}
                totalPages={totalPages}
                total={picker?.meta?.total ?? candidates.length}
                disabled={pickerQuery.isFetching}
                onPageChange={setPage}
              />
            </section>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-start sm:px-6">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={Boolean(sectionError)}
            onClick={saveEditor}
          >
            حفظ تغييرات البطاقة
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
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        selectable ? "hover:bg-muted/50" : "bg-muted/20 opacity-75"
      }`}
    >
      <Checkbox
        checked={alreadyAdded || checked}
        disabled={!selectable}
        onCheckedChange={onToggle}
        aria-label={`اختيار ${hydratedItemName(item)}`}
      />
      <button
        type="button"
        className="min-w-0 flex-1 text-right disabled:cursor-not-allowed"
        disabled={!selectable}
        onClick={onToggle}
      >
        <span className="block font-medium">{hydratedItemName(item)}</span>
        <span className="block text-xs text-muted-foreground">
          {alreadyAdded
            ? "موجود بالفعل داخل البطاقة"
            : pickerStateLabel(item.state)}
        </span>
        <span className="mt-2 flex flex-wrap gap-1">
          <ItemStateBadges item={item} />
        </span>
      </button>
      <Badge variant="outline">
        {item.type?.includes("product") ? "منتج" : "خيار"}
      </Badge>
    </div>
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
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {automatic ? <Badge variant="secondary">تلقائي</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {item.kind === "product" ? "منتج" : "خيار"}
          </Badge>
          <VisualItemStateBadges item={item} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canMoveUp}
          onClick={() => onMove("up")}
          aria-label={`تحريك ${item.name} لأعلى`}
          title="تحريك لأعلى داخل نفس القسم"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canMoveDown}
          onClick={() => onMove("down")}
          aria-label={`تحريك ${item.name} لأسفل`}
          title="تحريك لأسفل داخل نفس القسم"
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!canRemove}
          onClick={onRemove}
          aria-label={`حذف ${item.name}`}
          title={automatic ? "هذا العنصر يُدار تلقائيا" : "حذف من البطاقة"}
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
  return (
    <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        {total} نتيجة · صفحة {page} من {totalPages}
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
  icon,
}: {
  children: React.ReactNode;
  icon?: "loading";
}) {
  return (
    <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      {icon === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
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
  if (state === "selected") return "مختار حاليا";
  if (state === "eligible" || state === "addable") return "مؤهل للإضافة";
  if (state === "not_linked") return "غير مرتبط بالمنتج والمجموعة";
  if (state === "unavailable") return "غير متاح حاليا";
  return "غير مؤهل ويحتاج مراجعة";
}

function ItemStateBadges({ item }: { item: MealBuilderHydratedItem }) {
  return (
    <>
      {item.selected ? <Badge variant="default">مختار</Badge> : null}
      {item.eligible ? <Badge variant="secondary">مؤهل</Badge> : null}
      <Badge variant={item.linked ? "outline" : "destructive"}>
        {item.linked ? "مرتبط" : "إضافة مباشرة للقسم"}
      </Badge>
      <Badge variant={item.available ? "outline" : "destructive"}>
        {item.available ? "متاح" : "غير متاح"}
      </Badge>
      <Badge variant={item.published ? "outline" : "secondary"}>
        {item.published ? "منشور" : "غير منشور"}
      </Badge>
      {item.subscriptionEnabled === false ? (
        <Badge variant="destructive">ليس للاشتراك</Badge>
      ) : null}
      {item.catalogItemAvailable === false ? (
        <Badge variant="destructive">كتالوج العميل غير متاح</Badge>
      ) : null}
    </>
  );
}

function VisualItemStateBadges({ item }: { item: MealBuilderVisualItem }) {
  return (
    <>
      {item.selected ? <Badge variant="default">مختار</Badge> : null}
      {item.eligible ? <Badge variant="secondary">مؤهل</Badge> : null}
      <Badge variant={item.linked ? "outline" : "secondary"}>
        {item.linked ? "مرتبط" : "داخل القسم"}
      </Badge>
      <Badge variant={item.available ? "outline" : "destructive"}>
        {item.available ? "متاح" : "غير متاح"}
      </Badge>
    </>
  );
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
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
