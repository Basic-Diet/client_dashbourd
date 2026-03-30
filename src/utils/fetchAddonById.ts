import api from "@/lib/apis";
import type { AddonDetailResponse } from "@/types/addonTypes";

export const fetchAddonById = async (id: string): Promise<AddonDetailResponse> => {
  const response = await api.get(`/api/dashboard/addons/${id}`);
  return response.data;
};
