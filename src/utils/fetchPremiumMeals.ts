import api from "@/lib/apis";
import type { PremiumMealsResponse } from "@/types/premiumMealTypes";

export const fetchPremiumMeals = async (): Promise<PremiumMealsResponse> => {
  const response = await api.get("/api/dashboard/premium-meals");
  return response.data;
};
