import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

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
import type {
  MenuCategory,
  MenuOption,
  MenuOptionGroup,
  MenuProduct,
} from "@/types/menuTypes";
import type { MealBuilderSection } from "@/types/mealBuilderTypes";
import { VISUAL_SECTION_LABELS } from "./mealBuilderConstants";
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
import { useMealBuilderPickerQuery } from "@/hooks/menu";
import type { MealBuilderHydratedItem } from "@/types/mealBuilderTypes";

type Catalog = {
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
};

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [includeNotLinked, setIncludeNotLinked] = useState(true);
  const liveCard = rebuildCard(card.key, draftSections, catalog, card);
  const primaryIndex = findPrimarySectionIndex(
    liveCard.key,
    draftSections,
    catalog
  );
  const primarySection =
    primaryIndex == null ? null : draftSections[primaryIndex];
  const pickerQuery = useMealBuilderPickerQuery(liveCard.key, {
    q: query,
    includeUnavailable,
    includeNotLinked,
    page: 1,
    limit: 80,
  });
  const picker = pickerQuery.data?.data ?? null;
  const candidates = (picker?.candidates ?? []).filter((item) => item.id);

  function patchPrimary(change: Partial<MealBuilderSection>) {
    setDraftSections((current) => {
      const index = findPrimarySectionIndex(liveCard.key, current, catalog);
      if (index == null) return current;
      return current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...change } : section
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="grid max-h-[88dvh] w-[calc(100%-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <DialogHeader className="border-b px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between w-[95%]">
            <div className="space-y-1">
              <DialogTitle>تعديل بطاقة {liveCard.labelAr}</DialogTitle>
              <DialogDescription>
                اختر العناصر التي تظهر للعميل ورتبها داخل هذه البطاقة.
              </DialogDescription>
            </div>
            <Badge variant="secondary">{liveCard.items.length} عناصر</Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-5 py-4 sm:px-6 lg:grid lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-4 lg:overflow-hidden">
          <section className="space-y-3 rounded-lg border bg-muted/10 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SwitchLine
                label="ظاهر"
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
          </section>

          <div className="mt-4 grid min-h-0 gap-4 lg:mt-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="grid min-h-0 gap-2 rounded-lg border p-3 lg:grid-rows-[auto_minmax(0,1fr)]">
              <div className="flex items-center justify-between gap-3">
                <Label>العناصر المختارة</Label>
                <span className="text-xs text-muted-foreground">
                  استخدم الأسهم لتغيير الترتيب
                </span>
              </div>
              <div className="divide-y rounded-lg border lg:min-h-0 lg:overflow-auto">
                {liveCard.items.length ? (
                  liveCard.items.map((item, index) => (
                    <SelectedItemRow
                      key={`${item.kind}:${item.id}`}
                      item={item}
                      first={index === 0}
                      last={index === liveCard.items.length - 1}
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
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">
                    لا توجد عناصر مختارة داخل هذه البطاقة.
                  </p>
                )}
              </div>
            </section>

          <section className="grid min-h-0 gap-3 rounded-lg border p-3 lg:grid-rows-[auto_auto_minmax(0,1fr)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label>إضافة عناصر من الكتالوج</Label>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث بالاسم أو المفتاح"
                />
              </div>
              <Button
                type="button"
                disabled={!selectedIds.length}
                onClick={() => {
                  setDraftSections((current) =>
                    addItemsToCard(current, liveCard.key, selectedIds, catalog)
                  );
                  setSelectedIds([]);
                  setQuery("");
                }}
              >
                <Plus data-icon="inline-start" />
                إضافة
              </Button>
            </div>

            <details className="rounded-md border bg-muted/10 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                خيارات بحث متقدمة
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
            </details>

            <div className="rounded-lg border lg:min-h-0 lg:overflow-auto">
              {pickerQuery.isLoading ? (
                <p className="p-4 text-sm text-muted-foreground">
                  جاري تحميل العناصر المناسبة لهذه البطاقة...
                </p>
              ) : candidates.length ? (
                <div className="divide-y">
                  {candidates.map((item) => (
                    <button
                      key={`${item.type}:${item.id}`}
                      type="button"
                      disabled={!item.id}
                      className="flex w-full items-start gap-3 px-4 py-3 text-right hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() =>
                        setSelectedIds((current) =>
                          toggle(current, encodeItem(item))
                        )
                      }
                    >
                      <Checkbox
                        checked={selectedIds.includes(encodeItem(item))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {hydratedItemName(item)}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {pickerStateLabel(item.state)}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1">
                          <ItemStateBadges item={item} />
                        </span>
                      </span>
                      <Badge variant="outline">
                        {item.type?.includes("product") ? "منتج" : "خيار"}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  لا توجد عناصر مؤهلة لهذه البطاقة.
                </p>
              )}
            </div>
          </section>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t bg-background px-5 py-3 sm:flex-row sm:justify-start sm:px-6">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onSave(draftSections)}
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

function SelectedItemRow({
  item,
  first,
  last,
  onMove,
  onRemove,
}: {
  item: MealBuilderVisualItem;
  first: boolean;
  last: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
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
          disabled={first}
          onClick={() => onMove("up")}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={last}
          onClick={() => onMove("down")}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function rebuildCard(
  cardKey: string,
  sections: MealBuilderSection[],
  catalog: Catalog,
  fallback?: MealBuilderVisualCard
) {
  return (
    buildMealBuilderVisualCards({
      sections,
      products: catalog.products,
      categories: catalog.categories,
      options: catalog.options,
      issues: [],
    }).find((item) => item.key === cardKey) ?? fallback!
  );
}

function addItemsToCard(
  sections: MealBuilderSection[],
  cardKey: string,
  encodedIds: string[],
  catalog: Catalog
): MealBuilderSection[] {
  return encodedIds.reduce<MealBuilderSection[]>((current, encoded) => {
    const [kind, id] = encoded.split(":");
    if (kind === "option")
      return addOptionToCard(current, cardKey, id, catalog);
    return addProductToCard(current, cardKey, id, catalog);
  }, sections);
}

function addOptionToCard(
  sections: MealBuilderSection[],
  cardKey: string,
  optionId: string,
  catalog: Catalog
): MealBuilderSection[] {
  const index = ensureOptionSectionIndex(sections, cardKey, catalog);
  const next = index.sections;
  const section = next[index.index];
  if (section.selectedOptionIds.includes(optionId)) return next;
  return next.map((item, itemIndex) =>
    itemIndex === index.index
      ? { ...item, selectedOptionIds: [...item.selectedOptionIds, optionId] }
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
  if (section.selectedProductIds.includes(productId)) return ensured.sections;
  return ensured.sections.map((item, itemIndex) =>
    itemIndex === ensured.index
      ? {
          ...item,
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
  return sections.map((section, index) => {
    if (index !== item.sourceSectionIndex) return section;
    if (item.kind === "option") {
      return {
        ...section,
        selectedOptionIds: section.selectedOptionIds.filter(
          (id) => id !== item.id
        ),
      };
    }
    const selectedIds =
      section.includeMode === "all" && section.sourceCategoryId
        ? catalog.products
            .filter(
              (product) => product.categoryId === section.sourceCategoryId
            )
            .map((product) => product.id)
        : section.selectedProductIds;
    return {
      ...section,
      includeMode: "selected" as const,
      selectedProductIds: selectedIds.filter((id) => id !== item.id),
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
  const targetCardItem =
    cardItems[direction === "up" ? cardIndex - 1 : cardIndex + 1];
  if (
    !targetCardItem ||
    targetCardItem.sourceSectionIndex !== item.sourceSectionIndex
  )
    return sections;

  return sections.map((section, sectionIndex) => {
    if (sectionIndex !== item.sourceSectionIndex) return section;
    const ids =
      item.kind === "product" &&
      section.includeMode === "all" &&
      section.sourceCategoryId
        ? catalog.products
            .filter(
              (product) => product.categoryId === section.sourceCategoryId
            )
            .map((product) => product.id)
        : item.kind === "product"
          ? section.selectedProductIds
          : section.selectedOptionIds;
    const nextIds = swapIds(ids, item.id, targetCardItem.id);
    return item.kind === "product"
      ? {
          ...section,
          includeMode: "selected" as const,
          selectedProductIds: nextIds,
        }
      : { ...section, selectedOptionIds: nextIds };
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
) {
  const byKeyIndex = sections.findIndex(
    (section) =>
      section.key === cardKey && section.sectionType === "option_group"
  );
  if (byKeyIndex >= 0) return { sections, index: byKeyIndex };

  const groupKey = cardKey === "carbs" ? "carbs" : "proteins";
  const selectionType =
    cardKey === "premium" ? "premium_meal" : "standard_meal";
  const existingIndex = sections.findIndex(
    (section) =>
      section.sectionType === "option_group" &&
      section.selectionType === selectionType &&
      catalog.groups.find((group) => group.id === section.sourceGroupId)
        ?.key === groupKey
  );
  if (existingIndex >= 0) return { sections, index: existingIndex };

  const group = catalog.groups.find((item) => item.key === groupKey);
  const product =
    catalog.products.find((item) => item.key === "basic_meal") ??
    catalog.products[0];
  const label = VISUAL_SECTION_LABELS[cardKey];
  const nextSection: MealBuilderSection = {
    ...emptySection("option_group"),
    key: cardKey,
    sourceKind: cardKey === "premium" ? "premium_visual" : "visual_family",
    productContextId: product?.id ?? null,
    sourceGroupId: group?.id ?? null,
    selectionType,
    titleOverride: { ar: label?.ar ?? "", en: label?.en ?? "" },
    sortOrder: sections.length + 1,
    required: cardKey !== "premium",
    minSelections: cardKey === "premium" ? 0 : 1,
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
  const byKeyIndex = sections.findIndex(
    (section) =>
      section.key === cardKey &&
      (section.sectionType === "product_category" ||
        section.sectionType === "product_list" ||
        section.sectionType === "option_group")
  );
  if (byKeyIndex >= 0) return { sections, index: byKeyIndex };

  const selectionType =
    cardKey === "premium"
      ? "premium_large_salad"
      : cardKey === "sandwich"
        ? "sandwich"
        : cardKey;
  const existingIndex = sections.findIndex(
    (section) =>
      (section.sectionType === "product_category" ||
        section.sectionType === "product_list") &&
      section.selectionType === selectionType
  );
  if (existingIndex >= 0) return { sections, index: existingIndex };

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
    sourceKind: cardKey === "premium" ? "premium_visual" : "product_list",
    sourceCategoryId: type === "product_category" ? (category?.id ?? null) : null,
    includeMode: "selected",
    selectionType,
    titleOverride: { ar: label?.ar ?? "", en: label?.en ?? "" },
    sortOrder: sections.length + 1,
    required: false,
    minSelections: 0,
    maxSelections: 1,
    multiSelect: false,
    metadata:
      cardKey === "premium"
        ? { visualRole: "premium" }
        : { requiresBuilder: false, treatAsFullMeal: true },
    rules: cardKey === "premium" ? {} : { carbsRequired: false },
  };
  return { sections: [...sections, nextSection], index: sections.length };
}

function findPrimarySectionIndex(
  cardKey: string,
  sections: MealBuilderSection[],
  catalog: Catalog
) {
  if (["chicken", "beef", "fish", "eggs", "carbs"].includes(cardKey)) {
    return ensureOptionSectionIndex(sections, cardKey, catalog).index;
  }
  if (
    ["premium", "sandwich"].includes(cardKey) ||
    sections.some(
      (section) =>
        section.key === cardKey &&
        section.sectionType !== "option_group" &&
        sectionTreatsAsFullMeal(section)
    )
  ) {
    return ensureProductSectionIndex(sections, cardKey, catalog).index;
  }
  return null;
}

function encodeItem(item: MealBuilderHydratedItem) {
  const kind = item.type?.includes("product") ? "product" : "option";
  return `${kind}:${item.id}`;
}

function hydratedItemName(item: MealBuilderHydratedItem) {
  return (
    item.label || item.name?.ar || item.name?.en || item.key || "عنصر غير معروف"
  );
}

function pickerStateLabel(state?: string) {
  if (state === "selected") return "مختار";
  if (state === "eligible") return "مؤهل";
  if (state === "not_linked") return "غير مرتبط";
  if (state === "unavailable") return "غير متاح";
  return "يحتاج مراجعة";
}

function ItemStateBadges({ item }: { item: MealBuilderHydratedItem }) {
  return (
    <>
      {item.selected ? <Badge variant="default">مختار</Badge> : null}
      {item.eligible ? <Badge variant="secondary">مؤهل</Badge> : null}
      <Badge variant={item.linked ? "outline" : "destructive"}>
        {item.linked ? "مرتبط" : "غير مرتبط"}
      </Badge>
      <Badge variant={item.available ? "outline" : "destructive"}>
        {item.available ? "متاح" : "غير متاح"}
      </Badge>
      <Badge variant={item.published ? "outline" : "secondary"}>
        {item.published ? "منشور" : "غير منشور"}
      </Badge>
      {item.required ? <Badge variant="secondary">مطلوب</Badge> : null}
    </>
  );
}

function VisualItemStateBadges({ item }: { item: MealBuilderVisualItem }) {
  return (
    <>
      {item.selected ? <Badge variant="default">مختار</Badge> : null}
      {item.eligible ? <Badge variant="secondary">مؤهل</Badge> : null}
      <Badge variant={item.linked ? "outline" : "destructive"}>
        {item.linked ? "مرتبط" : "غير مرتبط"}
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
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        disabled={disabled}
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
