export interface MealOption {
  mealsPerDay: number;
  priceHalala: number;
  compareAtHalala: number;
  isActive: boolean;
  sortOrder: number;
}

export interface GramsOption {
  grams: number;
  mealsOptions: MealOption[];
  isActive: boolean;
  sortOrder: number;
}

export interface FreezePolicy {
  enabled: boolean;
  maxDays: number;
  maxTimes: number;
}

export interface Package {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  daysCount: number;
  currency: string;
  gramsOptions: GramsOption[];
  skipPolicy: {
    enabled: boolean;
    maxDays: number;
  };
  freezePolicy: FreezePolicy;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface PackageSummary {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  averageDaysCount: number;
}

export interface PackagesMeta {
  q: string;
  status: string;
  totalCount: number;
  filteredCount: number;
}

export interface PackagesResponse {
  status: boolean;
  data: Package[];
  summary: PackageSummary;
  meta: PackagesMeta;
}
