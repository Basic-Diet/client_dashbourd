import api from "@/lib/apis";
import { normalizePackagesResponse } from "@/utils/packageAdapter";

export const fetchGetPackagesData = async () => {
  const response = await api.get("/api/dashboard/plans");
  return normalizePackagesResponse(response.data);
};
