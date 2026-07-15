import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

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
import { useMenuProductComposerQuery } from "@/hooks/menu";
import type {
  MenuCategory,
  MenuOption,
  MenuOptionGroup,
  MenuProduct,
} from "@/types/menuTypes";
import type {
  MealBuilderSection,
  MealBuilderSectionType,
} from "@/types/mealBuilderTypes";
import { SECTION_LABELS, SELECTION_TYPES } from "./mealBuilderConstants";
import {
  mealBuilderErrorMessage,
  toEditableMealBuilderSection,
  validateMealBuilderSectionDraft,
} from "./mealBuilderFrontendUtils";
import { PremiumBadge } from "./MealBuilderBadges";
import {
  availableLabel,
  emptySection,
  matches,
  nameOf,
  sectionTreatsAsFullMeal,
  selectionLabel,
  toOption,
  toggle,
} from "./mealBuilderUtils";

export function MealBuilderSectionEditor({
  open,
  type,
  initial,
  products,
  categories,
  groups,
  options,
  onClose,
  onSave,
}: {
  open: boolean;
  type: MealBuilderSectionType;
  initial: MealBuilderSection | null;
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
  onClose: () => void;
  onSave: (section: MealBuilderSection) => void;
}) {
  const [section, setSection] = useState<MealBuilderSection>(() =>
    toEditableMealBuilderSection(initial ?? emptySection(type))
  );
  const [query, setQuery] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const composerQuery = useMenuProductComposerQuery(
    type === "option_group" ? (section.productContextId ?? "") : ""
  );
  const linkedGroups = composerQuery.data?.data.linkedOptionGroups ?? [];
  const linkedGroupIds = new Set(
    linkedGroups.map((item) => item.groupId).filter(Boolean)
  );
  const composerGroup = linkedGroups.find(
    (item) => item.groupId === section.sourceGroupId
  );
  const relationOptionIds = new Set(
    composerGroup?.options?.map((item) => item.optionId).filter(Boolean) ?? []
  );

  const readyProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.id === section.productContextId || isCatalogItemReady(product)
      ),
    [products, section.productContextId]
  );
  const readyCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.id === section.sourceCategoryId || isCatalogItemReady(category)
      ),
    [categories, section.sourceCategoryId]
  );
  const linkedGroupChoices = useMemo(() => {
    const byId = new Map<string, MenuOptionGroup>();
    groups.forEach((group) => {
      if (linkedGroupIds.has(group.id) || group.id === section.sourceGroupId) {
        byId.set(group.id, group);
      }
    });
    linkedGroups.forEach((relation) => {
      if (relation.group?.id) byId.set(relation.group.id, relation.group);
    });
    return Array.from(byId.values());
  }, [groups, linkedGroupIds, linkedGroups, section.sourceGroupId]);
  const optionChoices = useMemo(() => {
    const byId = new Map(options.map((option) => [option.id, option]));
    composerGroup?.options?.forEach((relation) => {
      if (relation.option?.id) byId.set(relation.option.id, relation.option);
    });
    return Array.from(relationOptionIds)
      .map((id) => byId.get(id))
      .filter((option): option is MenuOption => Boolean(option))
      .filter((option) => matches(option, query));
  }, [composerGroup?.options, options, query, relationOptionIds]);
  const productChoices = products
    .filter((product) => {
      if (type === "product_category") {
        return Boolean(
          section.sourceCategoryId &&
            product.categoryId === section.sourceCategoryId
        );
      }
      return type === "product_list";
    })
    .filter((product) => matches(product, query));

  const selectionOptions = [
    ...SELECTION_TYPES,
    { value: "full_meal_product", label: "وجبة كاملة مستقلة" },
  ];
  if (
    section.selectionType &&
    !selectionOptions.some((item) => item.value === section.selectionType)
  ) {
    selectionOptions.push({
      value: section.selectionType,
      label: selectionLabel(section.selectionType),
    });
  }

  const draftValidationError = validateMealBuilderSectionDraft(section);
  const relationError =
    type === "option_group" &&
    section.productContextId &&
    section.sourceGroupId &&
    !composerQuery.isLoading &&
    !composerGroup
      ? "مجموعة الخيارات المحددة غير مرتبطة بمنتج السياق."
      : null;
  const composerBlocked =
    type === "option_group" &&
    Boolean(section.productContextId) &&
    (composerQuery.isLoading || composerQuery.isError);

  function patch(change: Partial<MealBuilderSection>) {
    setSection((current) => ({ ...current, ...change }));
    setSubmitError(null);
  }

  function saveSection() {
    const normalized: MealBuilderSection = {
      ...toEditableMealBuilderSection(section),
      includeMode: type === "product_list" ? "selected" : section.includeMode,
      availableFor: ["subscription"],
    };
    const error =
      validateMealBuilderSectionDraft(normalized) ||
      relationError ||
      (composerQuery.isError
        ? "تعذر التحقق من علاقات منتج السياق."
        : null);

    if (error) {
      setSubmitError(error);
      return;
    }
    onSave(normalized);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="grid max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
        dir="rtl"
      >
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <div className="flex w-[95%] flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>
                {initial ? "تعديل" : "إضافة"} {SECTION_LABELS[type]}
              </DialogTitle>
              <DialogDescription className="mt-1">
                هذه أداة متقدمة. كل مصدر يتم التحقق منه مقابل علاقات الكتالوج قبل
                الحفظ، والباكند يظل صاحب القرار النهائي عند الفحص والنشر.
              </DialogDescription>
            </div>
            <Badge variant="outline">للاشتراكات فقط</Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="العنوان بالعربي"
              value={section.titleOverride.ar}
              onChange={(value) =>
                patch({
                  titleOverride: { ...section.titleOverride, ar: value },
                })
              }
            />
            <Field
              label="العنوان بالإنجليزي"
              value={section.titleOverride.en}
              dir="ltr"
              onChange={(value) =>
                patch({
                  titleOverride: { ...section.titleOverride, en: value },
                })
              }
            />

            {type === "option_group" ? (
              <>
                <SelectField
                  label="منتج السياق"
                  value={section.productContextId ?? ""}
                  onChange={(value) =>
                    patch({
                      productContextId: value,
                      sourceGroupId: null,
                      selectedOptionIds: [],
                    })
                  }
                  options={readyProducts.map(toOption)}
                />
                <SelectField
                  label="مجموعة مرتبطة بالمنتج"
                  value={section.sourceGroupId ?? ""}
                  disabled={!section.productContextId || composerBlocked}
                  onChange={(value) =>
                    patch({ sourceGroupId: value, selectedOptionIds: [] })
                  }
                  options={linkedGroupChoices.map(toOption)}
                />
              </>
            ) : null}

            {type === "product_category" ? (
              <SelectField
                label="التصنيف"
                value={section.sourceCategoryId ?? ""}
                onChange={(value) =>
                  patch({ sourceCategoryId: value, selectedProductIds: [] })
                }
                options={readyCategories.map(toOption)}
              />
            ) : null}

            {type === "product_category" ? (
              <SelectField
                label="طريقة الإدراج"
                value={section.includeMode}
                onChange={(value) =>
                  patch({ includeMode: value as "all" | "selected" })
                }
                options={[
                  { value: "selected", label: "اختيار منتجات محددة" },
                  { value: "all", label: "كل المنتجات المؤهلة في التصنيف" },
                ]}
              />
            ) : null}

            {type === "product_list" ? (
              <ReadOnlyField label="طريقة الإدراج" value="اختيار يدوي" />
            ) : null}

            <SelectField
              label="نوع الاختيار"
              value={section.selectionType}
              onChange={(value) => patch({ selectionType: value })}
              options={selectionOptions}
            />
            <NumberField
              label="الترتيب"
              value={section.sortOrder}
              onChange={(value) =>
                patch({ sortOrder: value === "" ? 0 : value })
              }
            />
            <NumberField
              label="الحد الأدنى"
              value={section.minSelections}
              onChange={(value) =>
                patch({ minSelections: value === "" ? 0 : value })
              }
            />
            <NumberField
              label="الحد الأقصى"
              value={section.maxSelections ?? ""}
              onChange={(value) =>
                patch({ maxSelections: value === "" ? null : value })
              }
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SwitchLine
              label="إجباري"
              checked={section.required}
              onChange={(required) => patch({ required })}
            />
            <SwitchLine
              label="اختيار متعدد"
              checked={section.multiSelect}
              onChange={(multiSelect) => patch({ multiSelect })}
            />
            <SwitchLine
              label="ظاهر للعميل"
              checked={section.visible}
              onChange={(visible) => patch({ visible })}
            />
            {type !== "option_group" ? (
              <SwitchLine
                label="وجبة كاملة"
                checked={sectionTreatsAsFullMeal(section)}
                onChange={(treatAsFullMeal) =>
                  patch({
                    selectionType: treatAsFullMeal
                      ? section.selectionType || "full_meal_product"
                      : section.selectionType,
                    metadata: {
                      ...(section.metadata ?? {}),
                      requiresBuilder: treatAsFullMeal ? false : undefined,
                      treatAsFullMeal: treatAsFullMeal || undefined,
                    },
                    rules: {
                      ...(section.rules ?? {}),
                      carbsRequired: treatAsFullMeal ? false : undefined,
                    },
                  })
                }
              />
            ) : null}
          </div>

          {type === "option_group" && section.productContextId ? (
            <ComposerState
              loading={composerQuery.isLoading}
              error={composerQuery.isError ? composerQuery.error : null}
              groupCount={linkedGroups.length}
              onRetry={() => composerQuery.refetch()}
            />
          ) : null}

          <div className="space-y-1.5">
            <Label>البحث داخل العناصر</Label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو المفتاح"
              className="text-right"
            />
          </div>

          {type === "option_group" ? (
            section.sourceGroupId ? (
              <Picker
                title="خيارات المجموعة المرتبطة"
                items={optionChoices}
                selectedIds={section.selectedOptionIds}
                onToggle={(id) =>
                  patch({
                    selectedOptionIds: toggle(section.selectedOptionIds, id),
                  })
                }
                isSelectable={isCatalogItemReady}
                empty={
                  composerQuery.isLoading
                    ? "جاري تحميل علاقات المنتج..."
                    : "لا توجد خيارات مرتبطة بهذا المنتج والمجموعة."
                }
              />
            ) : (
              <InstructionBox>
                اختر منتج السياق ثم اختر مجموعة مرتبطة به لعرض الخيارات.
              </InstructionBox>
            )
          ) : null}

          {type !== "option_group" && section.includeMode === "selected" ? (
            type === "product_category" && !section.sourceCategoryId ? (
              <InstructionBox>
                اختر التصنيف أولا لعرض المنتجات الموجودة داخله.
              </InstructionBox>
            ) : (
              <Picker
                title="المنتجات"
                items={productChoices}
                selectedIds={section.selectedProductIds}
                onToggle={(id) =>
                  patch({
                    selectedProductIds: toggle(section.selectedProductIds, id),
                  })
                }
                isSelectable={isCatalogItemReady}
                empty="لا توجد منتجات مناسبة للبحث والمصدر المحددين."
              />
            )
          ) : null}

          {section.selectionType === "premium_large_salad" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
              السلطة الكبيرة المميزة ترقية مدفوعة. السعر والبروتينات المسموحة
              ومنع البروتين الإضافي كلها تُحسم من إعدادات Premium Upgrades
              والباكند، وليست من هذا القسم.
            </div>
          ) : null}

          {relationError || draftValidationError || submitError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {submitError || relationError || draftValidationError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-start sm:px-6">
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={composerBlocked || Boolean(relationError)}
            onClick={saveSection}
          >
            حفظ القسم
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

function ComposerState({
  loading,
  error,
  groupCount,
  onRetry,
}: {
  loading: boolean;
  error: unknown | null;
  groupCount: number;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        جاري التحقق من مجموعات الخيارات المرتبطة بالمنتج...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">
          {mealBuilderErrorMessage(error, "تعذر تحميل علاقات المنتج")}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
      تم العثور على {groupCount} مجموعات مرتبطة بمنتج السياق.
    </div>
  );
}

function Picker<T extends MenuProduct | MenuOption>({
  title,
  items,
  selectedIds,
  onToggle,
  isSelectable,
  empty,
}: {
  title: string;
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isSelectable: (item: T) => boolean;
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{title}</Label>
        <Badge variant="outline">{selectedIds.length} مختارة</Badge>
      </div>
      <div className="max-h-[min(18rem,38dvh)] overflow-auto rounded-lg border">
        {items.length ? (
          <div className="divide-y">
            {items.map((item) => {
              const selected = selectedIds.includes(item.id);
              const selectable = selected || isSelectable(item);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    selectable ? "hover:bg-muted/50" : "bg-muted/20 opacity-70"
                  }`}
                >
                  <Checkbox
                    checked={selected}
                    disabled={!selectable}
                    onCheckedChange={() => selectable && onToggle(item.id)}
                    aria-label={`اختيار ${nameOf(item)}`}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-right disabled:cursor-not-allowed"
                    disabled={!selectable}
                    onClick={() => onToggle(item.id)}
                  >
                    <span className="block font-medium">{nameOf(item)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {availableLabel(item)}
                    </span>
                  </button>
                  <PremiumBadge
                    item={item}
                    selectionType={(item as MenuOption).selectionType ?? ""}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}

function InstructionBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  dir,
  onChange,
}: {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">اختر...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "";
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
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function isCatalogItemReady(
  item: Partial<MenuProduct | MenuOption | MenuCategory | MenuOptionGroup>
) {
  if (
    item.isActive === false ||
    item.isVisible === false ||
    item.isAvailable === false
  ) {
    return false;
  }

  if (
    "availableForSubscription" in item &&
    item.availableForSubscription === false
  ) {
    return false;
  }

  if (
    "availableFor" in item &&
    Array.isArray(item.availableFor) &&
    item.availableFor.length > 0 &&
    !item.availableFor.includes("subscription")
  ) {
    return false;
  }

  return true;
}
