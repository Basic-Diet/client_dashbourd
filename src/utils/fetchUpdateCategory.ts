import api from "@/lib/apis";

interface UpdateCategoryPayload {
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  isActive: boolean;
  sortOrder: number;
}

export const fetchUpdateCategory = async (
  categoryId: string,
  data: UpdateCategoryPayload
): Promise<void> => {
  await api.put(`/api/admin/meal-categories/${categoryId}`, data);
};
