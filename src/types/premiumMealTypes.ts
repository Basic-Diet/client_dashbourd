export interface PremiumMeal {
  _id: string;
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  extraFeeHalala: number;
  calories: number;
  category: string;
  currency: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumMealsResponse {
  status: boolean;
  data: PremiumMeal[];
}

export interface PremiumMealDetailResponse {
  status: boolean;
  data: PremiumMeal;
}

export interface CreatePremiumMealPayload {
  name: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  imageUrl?: string;
  imageFile?: File;
  currency: string;
  extraFeeHalala: number;
  calories: number;
  category: string;
  isActive: boolean;
  sortOrder: number;
}
