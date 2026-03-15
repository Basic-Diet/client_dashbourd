import { fetchGetPackagesData } from "@/utils/fetchGetPackagesData";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const packagesQueryOptions = () =>
  queryOptions({
    queryKey: ["packages"],
    queryFn: fetchGetPackagesData,
    staleTime: 1000 * 60 * 5,
  });

export const usePackagesQuery = () => {
  return useQuery(packagesQueryOptions());
};

export default usePackagesQuery;
