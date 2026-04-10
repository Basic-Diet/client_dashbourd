export interface MealCategory {
  _id: string;
  key: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  isActive: boolean;
  sortOrder: number;
  __v?: number;
  createdAt: string;
  updatedAt: string;
  id?: string;
  localized?: {
    id: string;
    key: string;
    name: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
    isFallback: boolean;
  };
}

export interface MealCategoriesResponse {
  status: boolean;
  data: MealCategory[];
}

export interface MealCategoryDetailResponse {
  status: boolean;
  data: MealCategory;
}
