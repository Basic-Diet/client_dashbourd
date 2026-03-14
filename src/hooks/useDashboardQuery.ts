import { fetchGetDashboardData } from "@/utils/fetchGetDashboardData";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard"],
    queryFn: fetchGetDashboardData,
    staleTime: 1000 * 60 * 5,
  });

export const UseDashboardQuery = () => {
  return useQuery(dashboardQueryOptions());
};

export default UseDashboardQuery;
