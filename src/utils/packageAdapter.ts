import type {
  GramsOption,
  MealOption,
  Package,
  PackagesResponse,
} from "@/types/packageTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const localized = (value: unknown) => {
  const record = asRecord(value);
  return {
    ar: asString(record.ar) ?? null,
    en: asString(record.en) ?? null,
  };
};

function normalizeMealOption(value: unknown): MealOption | null {
  const record = asRecord(value);
  const mealsPerDay = asNumber(record.mealsPerDay);
  const priceHalala = asNumber(record.priceHalala);
  if (mealsPerDay === undefined || priceHalala === undefined) return null;

  return {
    mealsPerDay,
    priceHalala,
    compareAtHalala: asNumber(record.compareAtHalala) ?? null,
    isActive: typeof record.isActive === "boolean" ? record.isActive : undefined,
    sortOrder: asNumber(record.sortOrder),
  };
}

function normalizeGramsOption(value: unknown): GramsOption | null {
  const record = asRecord(value);
  const rawGrams = record.grams ?? record.key ?? record.value;
  const grams = typeof rawGrams === "string" || typeof rawGrams === "number"
    ? rawGrams
    : undefined;
  if (grams === undefined) return null;

  const rawMeals = Array.isArray(record.mealsOptions)
    ? record.mealsOptions
    : Array.isArray(record.meals)
      ? record.meals
      : [];

  return {
    grams,
    mealsOptions: rawMeals.map(normalizeMealOption).filter(Boolean) as MealOption[],
    isActive: typeof record.isActive === "boolean" ? record.isActive : undefined,
    sortOrder: asNumber(record.sortOrder),
    proteinGrams: asNumber(record.proteinGrams),
    carbGrams: asNumber(record.carbGrams),
  };
}

export function packageId(pkg: Package): string {
  return String(pkg.id ?? pkg._id ?? "");
}

export function normalizePackage(value: unknown): Package {
  const record = asRecord(value);
  const id = asString(record.id) ?? asString(record._id);
  const rawGrams = Array.isArray(record.gramsOptions)
    ? record.gramsOptions
    : Array.isArray(record.grams)
      ? record.grams
      : [];
  const gramsOptions = rawGrams
    .map(normalizeGramsOption)
    .filter(Boolean) as GramsOption[];

  return {
    ...record,
    id,
    _id: id,
    key: asString(record.key),
    name: localized(record.name),
    description: localized(record.description),
    category: asString(record.category) ?? null,
    image: asString(record.image) ?? null,
    imageUrl: asString(record.imageUrl) ?? asString(record.image) ?? null,
    daysCount: asNumber(record.daysCount),
    currency: asString(record.currency) ?? "SAR",
    grams: gramsOptions,
    gramsOptions,
    skipPolicy: record.skipPolicy ? ({
      enabled: asBoolean(asRecord(record.skipPolicy).enabled),
      maxDays: asNumber(asRecord(record.skipPolicy).maxDays) ?? 0,
    }) : undefined,
    freezePolicy: record.freezePolicy ? ({
      enabled: asBoolean(asRecord(record.freezePolicy).enabled),
      maxDays: asNumber(asRecord(record.freezePolicy).maxDays) ?? 0,
      maxTimes: asNumber(asRecord(record.freezePolicy).maxTimes),
    }) : undefined,
    isActive: asBoolean(record.isActive),
    sortOrder: asNumber(record.sortOrder),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
  };
}

export function normalizePackagesResponse(value: unknown): PackagesResponse {
  const record = asRecord(value);
  if (!Array.isArray(record.data)) {
    throw new Error("استجابة الباقات من الخادم غير صالحة.");
  }

  return {
    status: typeof record.status === "boolean" ? record.status : true,
    data: record.data.map(normalizePackage),
    summary: asRecord(record.summary),
    meta: asRecord(record.meta),
  } as PackagesResponse;
}
