import api from "@/lib/apis";

export const fetchToggleMealStatus = async (mealId: string): Promise<void> => {
  await api.patch(`/api/admin/meals/${mealId}/toggle`);
};
