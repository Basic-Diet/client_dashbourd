import api from "@/lib/apis";
import type { MealCategoriesResponse } from "@/types/categoryTypes";

export const fetchCategories = async (): Promise<MealCategoriesResponse> => {
  const response = await api.get("/api/admin/meal-categories");
  return response.data;
};
