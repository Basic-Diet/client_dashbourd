import type {
  GramsOption,
  MealOption,
  Package,
  PackagesMeta,
  PackagesResponse,
  PackageSummary,
} from "@/types/packageTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (value === "" || value === null || value === undefined) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const localized = (value: unknown) => {
  const record = asRecord(value);
  return {
    ar: asString(record.ar) ?? "",
    en: asString(record.en) ?? "",
  };
};

function normalizeMealOption(value: unknown, index: number): MealOption | null {
  const record = asRecord(value);
  const mealsPerDay = asNumber(record.mealsPerDay);
  const priceHalala = asNumber(record.priceHalala);
  if (mealsPerDay === undefined || priceHalala === undefined) return null;

  return {
    mealsPerDay,
    priceHalala,
    compareAtHalala: asNumber(record.compareAtHalala) ?? 0,
    isActive: asBoolean(record.isActive, true),
    sortOrder: asNumber(record.sortOrder) ?? index,
  };
}

function parseGrams(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { grams: raw, gramsLabel: String(raw) };
  }
  if (typeof raw === "string" && raw.trim()) {
    const firstNumber = raw.match(/\d+(?:\.\d+)?/)?.[0];
    return {
      grams: firstNumber ? Number(firstNumber) : 0,
      gramsLabel: raw.trim(),
    };
  }
  return null;
}

function normalizeGramsOption(value: unknown, index: number): GramsOption | null {
  const record = asRecord(value);
  const parsed = parseGrams(record.grams ?? record.key ?? record.value);
  if (!parsed) return null;

  const rawMeals = Array.isArray(record.mealsOptions)
    ? record.mealsOptions
    : Array.isArray(record.meals)
      ? record.meals
      : [];

  return {
    ...parsed,
    mealsOptions: rawMeals
      .map(normalizeMealOption)
      .filter(Boolean) as MealOption[],
    isActive: asBoolean(record.isActive, true),
    sortOrder: asNumber(record.sortOrder) ?? index,
    proteinGrams: asNumber(record.proteinGrams),
    carbGrams: asNumber(record.carbGrams),
  };
}

export function packageId(pkg: Package): string {
  return String(pkg.id ?? pkg._id ?? "");
}

export function normalizePackage(value: unknown): Package {
  const record = asRecord(value);
  const id = asString(record.id) ?? asString(record._id) ?? "";
  const rawGrams = Array.isArray(record.gramsOptions)
    ? record.gramsOptions
    : Array.isArray(record.grams)
      ? record.grams
      : [];
  const gramsOptions = rawGrams
    .map(normalizeGramsOption)
    .filter(Boolean) as GramsOption[];
  const skipPolicy = asRecord(record.skipPolicy);
  const freezePolicy = asRecord(record.freezePolicy);

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
    daysCount: asNumber(record.daysCount) ?? 0,
    currency: asString(record.currency) ?? "SAR",
    grams: gramsOptions,
    gramsOptions,
    skipPolicy: {
      enabled: asBoolean(skipPolicy.enabled),
      maxDays: asNumber(skipPolicy.maxDays) ?? 0,
    },
    freezePolicy: {
      enabled: asBoolean(freezePolicy.enabled),
      maxDays: asNumber(freezePolicy.maxDays) ?? 0,
      maxTimes: asNumber(freezePolicy.maxTimes) ?? 0,
    },
    isActive: asBoolean(record.isActive),
    sortOrder: asNumber(record.sortOrder) ?? 0,
    createdAt: asString(record.createdAt) ?? "",
    updatedAt: asString(record.updatedAt) ?? "",
    __v: asNumber(record.__v) ?? 0,
  };
}

function normalizeSummary(value: unknown, plans: Package[]): PackageSummary {
  const record = asRecord(value);
  const activePlans = plans.filter((plan) => plan.isActive).length;
  const totalPlans = plans.length;
  return {
    totalPlans: asNumber(record.totalPlans) ?? totalPlans,
    activePlans: asNumber(record.activePlans) ?? activePlans,
    inactivePlans: asNumber(record.inactivePlans) ?? totalPlans - activePlans,
    averageDaysCount:
      asNumber(record.averageDaysCount) ??
      (totalPlans
        ? plans.reduce((sum, plan) => sum + plan.daysCount, 0) / totalPlans
        : 0),
  };
}

function normalizeMeta(value: unknown, plans: Package[]): PackagesMeta {
  const record = asRecord(value);
  return {
    q: asString(record.q) ?? "",
    status: asString(record.status) ?? "all",
    totalCount: asNumber(record.totalCount) ?? plans.length,
    filteredCount: asNumber(record.filteredCount) ?? plans.length,
  };
}

export function normalizePackagesResponse(value: unknown): PackagesResponse {
  const record = asRecord(value);
  if (!Array.isArray(record.data)) {
    throw new Error("استجابة الباقات من الخادم غير صالحة.");
  }

  const data = record.data.map(normalizePackage);
  return {
    status: typeof record.status === "boolean" ? record.status : true,
    data,
    summary: normalizeSummary(record.summary, data),
    meta: normalizeMeta(record.meta, data),
  };
}
