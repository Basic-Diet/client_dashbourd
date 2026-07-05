import { ERROR_COPY } from "./mealBuilderConstants";

const ISSUE_COPY: Record<string, string> = {
  UNKNOWN_BACKEND_ERROR: "تحتاج مراجعة",
  SELECTED: "مختار",
  ELIGIBLE: "متاح",
  NOT_LINKED_TO_PRODUCT_GROUP: "غير مرتبط بمجموعة منتجات",
  PRODUCT_GROUP_RELATION_MISSING: "رابط مجموعة المنتجات غير موجود",
  PRODUCT_OPTION_RELATION_UNAVAILABLE: "رابط الخيار غير متاح",
  OPTION_UNPUBLISHED: "يوجد خيار غير منشور",
  OPTION_UNAVAILABLE: "يوجد خيار غير متاح",
  PRODUCT_UNPUBLISHED: "يوجد منتج غير منشور",
  PRODUCT_UNAVAILABLE: "يوجد منتج غير متاح",
  WRONG_VISUAL_FAMILY: "العنصر في مجموعة عرض غير مناسبة",
  PREMIUM_REQUIRED_KEY: "عنصر بريميوم مطلوب",
  PREMIUM_LARGE_SALAD_MISSING: "سلطة بريميوم كبيرة غير موجودة",
  CATALOG_ITEM_UNAVAILABLE: "يوجد عنصر غير متاح في كتالوج العميل",
};

export function mealBuilderIssueText(issue: unknown) {
  if (typeof issue === "string") {
    return issue.trim() || "تحتاج مراجعة";
  }

  if (!issue || typeof issue !== "object") {
    return "تحتاج مراجعة";
  }

  const data = issue as Record<string, unknown>;
  const message = textValue(data.message);
  if (message) return message;

  const title = textValue(data.title);
  if (title) return title;

  const code = textValue(data.code);
  if (code) {
    return ISSUE_COPY[code] ?? ERROR_COPY[code] ?? readableCode(code);
  }

  return "تحتاج مراجعة";
}

export function mealBuilderIssueCode(issue: unknown) {
  if (!issue || typeof issue !== "object") return "";
  return textValue((issue as Record<string, unknown>).code);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readableCode(code: string) {
  return code
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
