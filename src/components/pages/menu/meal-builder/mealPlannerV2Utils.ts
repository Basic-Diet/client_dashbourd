import { parseApiError } from "@/lib/apiErrors";
import type {
  DirectProductCardPayloadV2,
  LocalizedTextValue,
  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCreatePayloadV2,
  MealPlannerOptionRole,
  MealPlannerSectionV2,
  MealPlannerValidationIssue,
  OptionFamilyCardPayloadV2,
} from "@/types/mealPlannerDashboardTypes";

export type MealPlannerCardFormValue = {
  cardType: "direct_product" | "option_family";
  key: string;
  titleAr: string;
  titleEn: string;
  visible: boolean;
  sortOrder?: number;
  selectedIds: string[];
  optionRole?: MealPlannerOptionRole;
  familyKey?: string;
  productContextId?: string;
  sourceGroupId?: string;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number | null;
  multiSelect?: boolean;
};

export function buildDirectProductPayload(
  value: MealPlannerCardFormValue
): DirectProductCardPayloadV2 {
  return {
    cardType: "direct_product",
    key: normalizeCardKey(value.key),
    titleOverride: requiredTitle(value.titleAr, value.titleEn),
    selectionType: "full_meal_product",
    selectedProductIds: uniqueIds(value.selectedIds),
    sortOrder: nonNegativeInteger(value.sortOrder),
    visible: value.visible,
  };
}

export function buildOptionFamilyPayload(
  value: MealPlannerCardFormValue
): OptionFamilyCardPayloadV2 {
  const optionRole = value.optionRole;
  if (optionRole !== "protein" && optionRole !== "carbs") {
    throw new Error("اختر نوع الخيارات: بروتين أو كارب");
  }
  const productContextId = String(value.productContextId || "").trim();
  const sourceGroupId = String(value.sourceGroupId || "").trim();
  if (!productContextId) throw new Error("اختر المنتج الأساسي");
  if (!sourceGroupId) throw new Error("اختر مجموعة الخيارات");

  const payload: OptionFamilyCardPayloadV2 = {
    cardType: "option_family",
    key: normalizeCardKey(value.key),
    titleOverride: requiredTitle(value.titleAr, value.titleEn),
    optionRole,
    productContextId,
    sourceGroupId,
    selectedOptionIds: uniqueIds(value.selectedIds),
    selectionType: "standard_meal",
    sortOrder: nonNegativeInteger(value.sortOrder),
    visible: value.visible,
    required: value.required === true,
    minSelections: nonNegativeInteger(value.minSelections) ?? 0,
    maxSelections:
      value.maxSelections === null
        ? null
        : nonNegativeInteger(value.maxSelections),
    multiSelect: value.multiSelect === true,
  };
  if (optionRole === "protein" && value.familyKey?.trim()) {
    payload.familyKey = value.familyKey.trim().toLowerCase();
  }
  return payload;
}

export function buildMealPlannerCreatePayload(
  value: MealPlannerCardFormValue
): MealPlannerCreatePayloadV2 {
  return value.cardType === "direct_product"
    ? buildDirectProductPayload(value)
    : buildOptionFamilyPayload(value);
}

export function normalizeCardType(
  section: MealPlannerSectionV2
): "direct_product" | "option_family" | "system_premium" | "legacy" {
  if (
    section.systemManaged === true ||
    section.cardType === "system_premium" ||
    section.key === "premium" ||
    section.metadata?.cardType === "system_premium"
  ) {
    return "system_premium";
  }
  const selectionType = String(section.selectionType || "");
  const sectionType = String(section.sectionType || "");
  const selectedProductCount = section.selectedProductIds?.length || 0;
  const selectedOptionCount = section.selectedOptionIds?.length || 0;

  // Canonical meal identity wins over contradictory historical card metadata.
  // Production contains legacy sections where a complete sandwich product still
  // carries option-family metadata. Those sections must remain direct meals.
  if (
    selectionType === "full_meal_product" ||
    selectionType === "sandwich" ||
    sectionType === "product_list" ||
    sectionType === "product_category" ||
    (selectedProductCount > 0 && selectedOptionCount === 0)
  ) {
    return "direct_product";
  }

  const explicit = String(section.cardType || section.metadata?.cardType || "");
  if (explicit === "direct_product" || explicit === "option_family") return explicit;
  if (
    sectionType === "option_group" ||
    sectionType === "option_family" ||
    selectedOptionCount > 0 ||
    section.productContextId ||
    section.sourceGroupId
  ) {
    return "option_family";
  }
  return "legacy";
}

export function creatableCardTypes(
  contract?: MealPlannerCardContractV2 | null
): Array<"direct_product" | "option_family"> {
  const values = (contract?.dynamicCardTypes || [])
    .map((entry) => String(entry.cardType || ""))
    .filter(
      (value): value is "direct_product" | "option_family" =>
        value === "direct_product" || value === "option_family"
    );
  return values.length
    ? Array.from(new Set(values))
    : ["direct_product", "option_family"];
}

export function allowedOptionRoles(
  contract?: MealPlannerCardContractV2 | null
): MealPlannerOptionRole[] {
  const optionContract = contract?.dynamicCardTypes?.find(
    (entry) => entry.cardType === "option_family"
  );
  const values = (optionContract?.allowedOptionRoles || []).filter(
    (value): value is MealPlannerOptionRole =>
      value === "protein" || value === "carbs"
  );
  return values.length ? Array.from(new Set(values)) : ["protein", "carbs"];
}

export function canonicalSelectionType(section: MealPlannerSectionV2) {
  const cardType = normalizeCardType(section);
  if (cardType === "direct_product") return "full_meal_product";
  if (cardType === "option_family") return "standard_meal";
  return section.selectionType || "";
}

export function sectionOptionRole(
  section: MealPlannerSectionV2
): MealPlannerOptionRole | null {
  const value = String(section.optionRole || section.metadata?.optionRole || "");
  if (value === "protein" || value === "carbs") return value;
  const key = String(section.key || section.metadata?.sourceGroupKey || "").toLowerCase();
  if (["carb", "carbs"].includes(key)) return "carbs";
  if (["protein", "proteins"].includes(key)) return "protein";
  return null;
}

export function sectionTitle(section: MealPlannerSectionV2) {
  return (
    section.titleOverride?.ar ||
    section.titleOverride?.en ||
    section.key ||
    "كارت وجبات"
  );
}

export function sectionItems(section: MealPlannerSectionV2) {
  const cardType = normalizeCardType(section);
  if (cardType === "direct_product") {
    return section.selectedProducts || section.items || [];
  }
  if (cardType === "option_family") {
    return section.selectedOptions || section.items || [];
  }
  return section.items || [];
}

export function selectedIdsForSection(section: MealPlannerSectionV2) {
  const cardType = normalizeCardType(section);
  if (cardType === "direct_product") return uniqueIds(section.selectedProductIds || []);
  if (cardType === "option_family") return uniqueIds(section.selectedOptionIds || []);
  return [];
}

export function candidateId(candidate: MealPlannerCatalogCandidate) {
  return String(
    candidate.productId || candidate.optionId || candidate.id || candidate._id || ""
  );
}

export function candidateName(candidate: MealPlannerCatalogCandidate) {
  return (
    candidate.name?.ar ||
    candidate.labelAr ||
    candidate.label ||
    candidate.name?.en ||
    candidate.labelEn ||
    candidate.key ||
    "عنصر"
  );
}

export function candidateSelectable(candidate: MealPlannerCatalogCandidate) {
  if (candidate.selected === true) return true;
  if (candidate.isPremium === true) return false;
  if (candidate.assignable !== true) return false;
  if (candidate.relationStatus?.effective === false) return false;
  return true;
}

export function candidateReason(candidate: MealPlannerCatalogCandidate) {
  if (candidate.isPremium) return "هذا الخيار يُدار من كارت Premium";
  if (candidate.state === "assigned_elsewhere" || candidate.assignedSectionKey) {
    return candidate.assignedSectionKey
      ? `مستخدم في كارت ${candidate.assignedSectionKey}`
      : "مستخدم في كارت آخر";
  }
  const reasons = candidate.reasonCodes || candidate.status?.reasonCodes || [];
  return reasons.length ? reasons.map(reasonCodeText).join(" • ") : "غير متاح للاختيار";
}

export function issueText(issue: MealPlannerValidationIssue) {
  const code = String(issue.code || "");
  return ERROR_MESSAGES[code] || issue.message || "توجد مشكلة تحتاج مراجعة";
}

export function mealPlannerErrorMessage(error: unknown, fallback: string) {
  const parsed = parseApiError(error);
  const mapped = ERROR_MESSAGES[String(parsed.code || "")];
  return mapped || parsed.message || fallback;
}

export const ERROR_MESSAGES: Record<string, string> = {
  MEAL_BUILDER_CARD_KEY_INVALID: "مفتاح الكارت غير صالح",
  MEAL_BUILDER_CARD_NUMBER_INVALID: "قيمة الترتيب أو العدد غير صالحة",
  MEAL_BUILDER_CARD_KEY_DUPLICATE: "يوجد كارت آخر بنفس المفتاح",
  MEAL_BUILDER_CARD_NOT_FOUND: "الكارت غير موجود",
  MEAL_BUILDER_CARD_TYPE_INVALID: "نوع الكارت غير مدعوم",
  MEAL_BUILDER_CARD_TYPE_UNSUPPORTED: "هذا الإجراء غير مدعوم لهذا النوع من الكروت",
  MEAL_BUILDER_CARD_TYPE_CHANGE_UNSUPPORTED: "لا يمكن تغيير نوع الكارت بعد إنشائه",
  MEAL_BUILDER_SYSTEM_CARD_READ_ONLY: "كارت الوجبات المميزة يُدار من النظام",
  MEAL_BUILDER_CARD_WOULD_BE_EMPTY: "لا يمكن ترك الكارت فارغًا؛ احذفه بدلًا من ذلك",
  MEAL_BUILDER_CARD_SELECTION_TYPE_REQUIRED: "نوع الوجبة مطلوب",
  MEAL_BUILDER_CARD_SELECTION_TYPE_INVALID: "نوع الوجبة غير صالح",
  MEAL_BUILDER_CARD_PRODUCTS_REQUIRED: "اختر منتجًا واحدًا على الأقل",
  MEAL_BUILDER_PRODUCT_IDS_INVALID: "قائمة المنتجات المرسلة غير صالحة",
  MEAL_BUILDER_PRODUCT_IDS_REQUIRED: "اختر منتجًا واحدًا على الأقل",
  MEAL_BUILDER_PRODUCT_NOT_FOUND: "أحد المنتجات غير موجود",
  MEAL_BUILDER_PRODUCT_UNAVAILABLE: "أحد المنتجات غير جاهز للاشتراكات",
  MEAL_BUILDER_PRODUCT_TYPE_INVALID: "نوع أحد المنتجات غير مدعوم في الكارت",
  MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED: "المنتج موجود في كارت آخر",
  MEAL_BUILDER_PRODUCT_NOT_IN_CARD: "المنتج غير موجود داخل هذا الكارت",
  MEAL_BUILDER_OPTION_ROLE_REQUIRED: "اختر نوع الخيارات: بروتين أو كارب",
  MEAL_BUILDER_OPTION_ROLE_INVALID: "نوع الخيارات غير مدعوم",
  MEAL_BUILDER_OPTION_ROLE_GROUP_MISMATCH: "المجموعة لا تناسب نوع الكارت",
  MEAL_BUILDER_CARD_OPTIONS_REQUIRED: "اختر خيارًا واحدًا على الأقل",
  MEAL_BUILDER_OPTION_NOT_FOUND: "أحد الخيارات غير موجود",
  MEAL_BUILDER_OPTION_GROUP_NOT_FOUND: "مجموعة الخيارات غير موجودة",
  MEAL_BUILDER_OPTION_GROUP_MISMATCH: "أحد الخيارات تابع لمجموعة أخرى",
  MEAL_BUILDER_PRODUCT_GROUP_RELATION_INVALID: "المجموعة غير مرتبطة بالمنتج الأساسي",
  MEAL_BUILDER_OPTION_RELATION_INVALID: "أحد الخيارات غير مرتبط بالمنتج والمجموعة",
  MEAL_BUILDER_OPTION_ALREADY_ASSIGNED: "الخيار موجود في كارت آخر لنفس المنتج والمجموعة",
  MEAL_BUILDER_OPTION_FAMILY_MISMATCH: "الخيار لا ينتمي إلى عائلة البروتين المختارة",
  MEAL_BUILDER_OPTION_CARD_UNAVAILABLE: "الكارت يحتوي عناصر غير جاهزة",
  MEAL_BUILDER_PREMIUM_OPTION_SYSTEM_MANAGED: "خيارات Premium تُدار من كارت Premium",
  MEAL_BUILDER_CARBS_CARD_REQUIRED: "كروت البروتين تحتاج كارت كارب لنفس المنتج الأساسي",
  MEAL_BUILDER_DRAFT_NOT_FOUND: "لا توجد تغييرات غير منشورة",
  MEAL_BUILDER_VALIDATION_ERROR: "بيانات الكارت غير صالحة وتحتاج مراجعة",
  MEAL_BUILDER_VALIDATION_FAILED: "لا يمكن النشر قبل إصلاح الأخطاء",
  MEAL_BUILDER_CONFLICT: "حدث تعارض، أعد تحميل الصفحة",
  MEAL_BUILDER_INTERNAL_ERROR: "حدث خطأ غير متوقع",
};

const REASON_MESSAGES: Record<string, string> = {
  ASSIGNED_TO_OTHER_CARD: "مستخدم في كارت آخر",
  PRODUCT_INACTIVE: "المنتج غير نشط",
  PRODUCT_HIDDEN: "المنتج مخفي",
  PRODUCT_UNAVAILABLE: "المنتج غير متاح",
  PRODUCT_UNPUBLISHED: "المنتج غير منشور",
  PRODUCT_NOT_SUBSCRIPTION_ENABLED: "غير متاح للاشتراكات",
  OPTION_INACTIVE: "الخيار غير نشط",
  OPTION_HIDDEN: "الخيار مخفي",
  OPTION_UNAVAILABLE: "الخيار غير متاح",
  OPTION_UNPUBLISHED: "الخيار غير منشور",
  OPTION_NOT_SUBSCRIPTION_ENABLED: "الخيار غير متاح للاشتراكات",
  CATALOG_ITEM_UNAVAILABLE: "عنصر الكتالوج غير متاح",
};

function reasonCodeText(code: string) {
  return REASON_MESSAGES[code] || code;
}

function requiredTitle(ar: string, en: string): LocalizedTextValue {
  const titleAr = ar.trim();
  const titleEn = en.trim();
  if (!titleAr) throw new Error("الاسم العربي مطلوب");
  if (!titleEn) throw new Error("الاسم الإنجليزي مطلوب");
  return { ar: titleAr, en: titleEn };
}

function normalizeCardKey(value: string) {
  const key = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(key)) {
    throw new Error("المفتاح يجب أن يكون 2-64 حرفًا إنجليزيًا صغيرًا أو رقمًا أو _ أو -");
  }
  return key;
}

function uniqueIds(values: string[]) {
  const result = [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
  if (!result.length) throw new Error("اختر عنصرًا واحدًا على الأقل");
  return result;
}

function nonNegativeInteger(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return undefined;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("الترتيب والقيم الرقمية يجب أن تكون أرقامًا صحيحة أكبر من أو تساوي صفر");
  }
  return value;
}
