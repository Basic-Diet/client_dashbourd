import api from "@/lib/apis";

export const fetchDeletePremiumMeal = async (id: string) => {
  const response = await api.delete(`/api/dashboard/premium-meals/${id}`);
  return response.data;
};
