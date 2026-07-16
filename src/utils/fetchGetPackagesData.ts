import api from "@/lib/apis";
import { filterCanonicalSubscriptionPlans } from "@/constants/menuCatalog";

export { filterCanonicalSubscriptionPlans };

export const fetchGetPackagesData = async () => {
  const response = await api.get("/api/dashboard/plans");
  if (response && response.data && Array.isArray(response.data.data)) {
    response.data.data = filterCanonicalSubscriptionPlans(response.data.data);
  }
  return response.data;
};
