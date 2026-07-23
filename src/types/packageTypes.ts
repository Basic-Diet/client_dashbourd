export interface MealOption {
  mealsPerDay: number;
  priceHalala: number;
  compareAtHalala?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export interface GramsOption {
  grams: number | string;
  mealsOptions: MealOption[];
  isActive?: boolean;
  sortOrder?: number;
  proteinGrams?: number;
  carbGrams?: number;
}

export interface FreezePolicy {
  enabled: boolean;
  maxDays: number;
  maxTimes?: number;
}

export interface Package {
  id?: string;
  _id?: string;
  key?: string;
  name: {
    ar?: string | null;
    en?: string | null;
  };
  description?: {
    ar?: string | null;
    en?: string | null;
  };
  category?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  daysCount?: number;
  currency?: string;
  grams?: GramsOption[];
  gramsOptions: GramsOption[];
  skipPolicy?: {
    enabled: boolean;
    maxDays: number;
  };
  freezePolicy?: FreezePolicy;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  [key: string]: unknown;
}

export interface PackageSummary {
  totalPlans?: number;
  activePlans?: number;
  inactivePlans?: number;
  averageDaysCount?: number;
}

export interface PackagesMeta {
  q?: string;
  status?: string;
  totalCount?: number;
  filteredCount?: number;
}

export interface PackagesResponse {
  status: boolean;
  data: Package[];
  summary?: PackageSummary;
  meta?: PackagesMeta;
}
