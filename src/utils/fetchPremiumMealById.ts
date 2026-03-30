import api from "@/lib/apis";
import type { PremiumMealDetailResponse } from "@/types/premiumMealTypes";

export const fetchPremiumMealById = async (
  id: string
): Promise<PremiumMealDetailResponse> => {
  const response = await api.get(`/api/dashboard/premium-meals/${id}`);
  return response.data;
};
