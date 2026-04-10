import api from "@/lib/apis";

interface CreateCategoryPayload {
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  isActive: boolean;
  sortOrder: number;
}

export const fetchCreateCategory = async (
  data: CreateCategoryPayload
): Promise<void> => {
  await api.post("/api/admin/meal-categories", data);
};
