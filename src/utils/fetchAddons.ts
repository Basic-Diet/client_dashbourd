import api from "@/lib/apis";
import type { AddonsResponse } from "@/types/addonTypes";

export const fetchAddons = async (): Promise<AddonsResponse> => {
  const response = await api.get("/api/dashboard/addons");
  return response.data;
};
