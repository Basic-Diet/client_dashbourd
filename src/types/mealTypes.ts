export interface Meal {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  imageUrl: string;
  calories?: number;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  categoryId: string;
  type?: string;
  availableForOrder: boolean;
  availableForSubscription: boolean;
  price?: number;
  sortOrder: number;
  isActive: boolean;
  __v?: number;
  createdAt: string;
  updatedAt: string;
  id?: string;
}

export interface MealsResponse {
  status: boolean;
  data: Meal[];
}

export interface MealDetailResponse {
  status: boolean;
  data: Meal;
}
