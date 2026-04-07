import api from "@/lib/apis";
export const fetchUpdatePremiumMeal = async (
  id: string,
  data: FormData
) => {
  const response = await api.put(`/api/dashboard/premium-meals/${id}`, data);
  return response.data;
};
