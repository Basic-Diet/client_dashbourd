import api from "@/lib/apis";
import type { MealCategoryDetailResponse } from "@/types/categoryTypes";

export const fetchCategoryById = async (
  categoryId: string
): Promise<MealCategoryDetailResponse> => {
  const response = await api.get(`/api/admin/meal-categories/${categoryId}`);
  return response.data;
};
