import api from "@/lib/apis";
import type { Package } from "@/types/packageTypes";

export const fetchGetPlanById = async (
  id: string
): Promise<{ status: boolean; data: Package }> => {
  const response = await api.get(`/api/admin/plans/${id}`);
  return response.data;
};
