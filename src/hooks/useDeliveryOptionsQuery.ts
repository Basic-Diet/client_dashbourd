import { fetchDeliveryOptions } from "@/utils/fetchDeliveryOptions";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const deliveryOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ["delivery-options"],
    queryFn: fetchDeliveryOptions,
    staleTime: 1000 * 60 * 10,
  });

export const useDeliveryOptionsQuery = () => {
  return useQuery(deliveryOptionsQueryOptions());
};
