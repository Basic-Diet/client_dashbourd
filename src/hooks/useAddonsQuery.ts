import { fetchAddons } from "@/utils/fetchAddons";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const addonsQueryOptions = () =>
  queryOptions({
    queryKey: ["addons"],
    queryFn: fetchAddons,
    staleTime: 1000 * 60 * 5,
  });

export const useAddonsQuery = () => {
  return useQuery(addonsQueryOptions());
};
