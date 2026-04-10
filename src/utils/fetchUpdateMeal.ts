import api from "@/lib/apis";

export const fetchUpdateMeal = async (
  mealId: string,
  data: FormData
): Promise<void> => {
  await api.put(`/api/admin/meals/${mealId}`, data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
