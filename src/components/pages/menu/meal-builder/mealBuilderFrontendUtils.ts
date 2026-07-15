import type {
  MealBuilderHydratedItem,
  MealBuilderSection,
} from "@/types/mealBuilderTypes";
import type { MenuProduct } from "@/types/menuTypes";
import type { MealBuilderVisualItem } from "./mealBuilderVisualModel";

export function mealBuilderErrorMessage(
  error: unknown,
  fallback = "حدث خطأ أثناء تنفيذ العملية"
): string {
  const response = (error as {
    response?: {
      data?: {
        message?: unknown;
        error?: { message?: unknown };
        details?: { message?: unknown };
      };
    };
    message?: unknown;
  })?.response?.data;

  const candidates = [
    response?.error?.message,
    response?.message,
    response?.details?.message,
    (error as { message?: unknown })?.message,
  ];

  const resolved = candidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0
  );

  return resolved?.trim() || fallback;
}

export function isMealBuilderCandidateSelectable(
  item: MealBuilderHydratedItem
): boolean {
  return Boolean(
    item.id &&
      item.eligible === true &&
      item.available !== false &&
      item.active !== false &&
      item.visible !== false &&
      item.published !== false &&
      item.subscriptionEnabled !== false &&
      item.catalogItemAvailable !== false
  );
}

export function toEditableMealBuilderSection(
  section: MealBuilderSection
): MealBuilderSection {
  const {
    selectedOptions: _selectedOptions,
    selectedProducts: _selectedProducts,
    items: _items,
    hydration: _hydration,
    ...editable
  } = section;

  return {
    ...editable,
    selectedOptionIds: [...(section.selectedOptionIds ?? [])],
    selectedProductIds: [...(section.selectedProductIds ?? [])],
    titleOverride: { ...section.titleOverride },
    availableFor: [...(section.availableFor ?? ["subscription"])],
    metadata: section.metadata ? { ...section.metadata } : undefined,
    rules: section.rules ? { ...section.rules } : undefined,
  };
}

export function toEditableMealBuilderSections(
  sections: MealBuilderSection[]
): MealBuilderSection[] {
  return sections.map(toEditableMealBuilderSection);
}

export function explicitProductIdsForSection(
  section: MealBuilderSection,
  products: MenuProduct[]
): string[] {
  const hydratedIds = [
    ...(section.selectedProducts ?? []),
    ...(section.items ?? []).filter((item) => item.type?.includes("product")),
  ]
    .map((item) => item.productId || item.id)
    .filter(
      (id): id is string => typeof id === "string" && id.length > 0
    );

  if (hydratedIds.length) return uniqueIds(hydratedIds);
  if (section.selectedProductIds.length) {
    return uniqueIds(section.selectedProductIds);
  }

  if (section.includeMode === "all" && section.sourceCategoryId) {
    return uniqueIds(
      products
        .filter((product) => product.categoryId === section.sourceCategoryId)
        .map((product) => product.id)
    );
  }

  return [];
}

export function validateMealBuilderSectionDraft(
  section: MealBuilderSection
): string | null {
  if (!section.selectionType.trim()) return "اختر نوع الاختيار.";

  const numericValues = [
    ["الترتيب", section.sortOrder],
    ["الحد الأدنى", section.minSelections],
  ] as const;

  for (const [label, value] of numericValues) {
    if (!Number.isInteger(value) || value < 0) {
      return `${label} يجب أن يكون رقما صحيحا غير سالب.`;
    }
  }

  if (
    section.maxSelections !== null &&
    (!Number.isInteger(section.maxSelections) || section.maxSelections < 0)
  ) {
    return "الحد الأقصى يجب أن يكون رقما صحيحا غير سالب أو فارغا.";
  }

  if (
    section.maxSelections !== null &&
    section.maxSelections < section.minSelections
  ) {
    return "الحد الأقصى لا يمكن أن يكون أقل من الحد الأدنى.";
  }

  if (section.sectionType === "option_group") {
    if (!section.productContextId) return "اختر منتج السياق.";
    if (!section.sourceGroupId) return "اختر مجموعة خيارات مرتبطة بالمنتج.";
  }

  if (section.sectionType === "product_category") {
    if (!section.sourceCategoryId) return "اختر تصنيف المنتجات.";
    if (
      section.includeMode === "selected" &&
      section.selectedProductIds.length === 0
    ) {
      return "اختر منتجا واحدا على الأقل أو استخدم كل المنتجات المؤهلة.";
    }
  }

  if (section.sectionType === "product_list") {
    if (section.includeMode !== "selected") {
      return "قائمة المنتجات تستخدم الاختيار اليدوي فقط.";
    }
    if (section.selectedProductIds.length === 0) {
      return "اختر منتجا واحدا على الأقل.";
    }
  }

  return null;
}

export function canMoveMealBuilderItem(
  items: MealBuilderVisualItem[],
  index: number,
  direction: "up" | "down"
): boolean {
  const current = items[index];
  const target = items[direction === "up" ? index - 1 : index + 1];
  return Boolean(
    current &&
      target &&
      current.kind === target.kind &&
      current.sourceSectionIndex >= 0 &&
      current.sourceSectionIndex === target.sourceSectionIndex
  );
}

export function isAutomaticMealBuilderItem(
  item: MealBuilderVisualItem
): boolean {
  return item.automatic === true || item.sourceSectionIndex < 0;
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}
