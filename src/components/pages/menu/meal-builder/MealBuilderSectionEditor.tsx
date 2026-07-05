import { useState } from "react";

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
  const [section, setSection] = useState<MealBuilderSection>(
    initial ?? emptySection(type)
  );
  const [query, setQuery] = useState("");
  const composerQuery = useMenuProductComposerQuery(
    section.productContextId ?? ""
  );

  const composerGroup = composerQuery.data?.data.linkedOptionGroups.find(
    (item) => item.groupId === section.sourceGroupId
  );
  const relationOptionIds =
    composerGroup?.options?.map((item) => item.optionId) ?? [];
  const optionChoices = options
    .filter((option) =>
      relationOptionIds.length
        ? relationOptionIds.includes(option.id)
        : option.groupId === section.sourceGroupId
    )
    .filter((option) => matches(option, query));
  const productChoices = products
    .filter((product) =>
      type === "product_category" && section.sourceCategoryId
        ? product.categoryId === section.sourceCategoryId
        : true
    )
    .filter((product) => matches(product, query));
  const selectionOptions = [
    ...SELECTION_TYPES,
    { value: "full_meal_product", label: "Full meal product" },
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

  function patch(change: Partial<MealBuilderSection>) {
    setSection((current) => ({ ...current, ...change }));
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="grid max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-h-[78dvh]"
        dir="rtl"
      >
        <DialogHeader className="border-b px-5 py-4 sm:px-6">
          <DialogTitle>
            {initial ? "تعديل" : "إضافة"} {SECTION_LABELS[type]}
          </DialogTitle>
          <DialogDescription>
            اختر من بيانات الكتالوج الموجودة واضبط ما يظهر للعميل.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
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
                  options={products.map(toOption)}
                />
                <SelectField
                  label="مجموعة الخيارات"
                  value={section.sourceGroupId ?? ""}
                  onChange={(value) =>
                    patch({ sourceGroupId: value, selectedOptionIds: [] })
                  }
                  options={groups.map(toOption)}
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
                options={categories.map(toOption)}
              />
            ) : null}

            {type !== "option_group" ? (
              <SelectField
                label="طريقة الإدراج"
                value={section.includeMode}
                onChange={(value) =>
                  patch({ includeMode: value as "all" | "selected" })
                }
                options={[
                  { value: "selected", label: "اختيار يدوي" },
                  { value: "all", label: "كل المؤهلين" },
                ]}
              />
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

          <div className="grid gap-3 sm:grid-cols-3">
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
              label="ظاهر"
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

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو المفتاح"
          />

          {type === "option_group" ? (
            <Picker
              title="خيارات المجموعة"
              items={optionChoices}
              selectedIds={section.selectedOptionIds}
              onToggle={(id) =>
                patch({
                  selectedOptionIds: toggle(section.selectedOptionIds, id),
                })
              }
              empty="لا توجد خيارات مرتبطة بهذا المنتج والمجموعة."
            />
          ) : null}

          {type !== "option_group" && section.includeMode === "selected" ? (
            <Picker
              title="المنتجات"
              items={productChoices}
              selectedIds={section.selectedProductIds}
              onToggle={(id) =>
                patch({
                  selectedProductIds: toggle(section.selectedProductIds, id),
                })
              }
              empty="لا توجد منتجات مناسبة."
            />
          ) : null}

          {section.selectionType === "premium_large_salad" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              سلطة كبيرة بريميوم · ترقية مدفوعة · التسعير وقواعد البروتين
              المسموح ومنع البروتين الإضافي كلها من الباكند.
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 border-t bg-background px-5 py-3 sm:flex-row sm:justify-start sm:px-6">
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => onSave(section)}
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

function Picker<T extends MenuProduct | MenuOption>({
  title,
  items,
  selectedIds,
  onToggle,
  empty,
}: {
  title: string;
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  empty: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className="max-h-[min(16rem,34dvh)] overflow-auto rounded-lg border">
        {items.length ? (
          <div className="divide-y">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-right hover:bg-muted/50"
                onClick={() => onToggle(item.id)}
              >
                <Checkbox checked={selectedIds.includes(item.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{nameOf(item)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {availableLabel(item)}
                  </span>
                </span>
                <PremiumBadge
                  item={item}
                  selectionType={(item as MenuOption).selectionType ?? ""}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="p-4 text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
