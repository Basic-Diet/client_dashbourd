import api from "@/lib/apis";
import type { MealDetailResponse } from "@/types/mealTypes";

export const fetchMealById = async (
  mealId: string
): Promise<MealDetailResponse> => {
  const response = await api.get(`/api/admin/meals/${mealId}`);
  return response.data;
};
