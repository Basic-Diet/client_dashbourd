import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchAddons } from "@/utils/fetchAddons";
import { fetchAddonById } from "@/utils/fetchAddonById";

export const addonsQueryOptions = () =>
  queryOptions({
    queryKey: ["addons"],
    queryFn: fetchAddons,
    staleTime: 1000 * 60 * 5,
  });

export const useAddonsQuery = () => {
  return useQuery(addonsQueryOptions());
};

export const addonByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["addons", "detail", id],
    queryFn: () => fetchAddonById(id),
    enabled: !!id,
  });

export const useAddonByIdQuery = (id: string) => {
  return useQuery(addonByIdQueryOptions(id));
};
