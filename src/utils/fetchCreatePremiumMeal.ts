import api from "@/lib/apis";


export const fetchCreatePremiumMeal = async (data: FormData) => {
  const response = await api.post("/api/dashboard/premium-meals", data);
  return response.data;
};
