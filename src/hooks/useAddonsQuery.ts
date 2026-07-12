import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAddonBasePlanPicker,
  fetchAddonCategoryPicker,
  fetchAddonPlans,
  fetchAddonProductPicker,
  fetchAddons,
} from "@/utils/fetchAddons";
import { fetchAddonById } from "@/utils/fetchAddonById";
import {
  createAddonPlanPrice,
  deleteAddonPlanPrice,
  fetchAddonPlanPrices,
  toggleAddonPlanPrice,
  updateAddonPlanPrice,
  type AddonPlanPricePayload,
} from "@/utils/fetchAddonPrices";

export const addonsQueryOptions = () =>
  queryOptions({
    queryKey: ["addons"],
    queryFn: fetchAddons,
    staleTime: 1000 * 60 * 5,
  });

export const useAddonsQuery = () => {
  return useQuery(addonsQueryOptions());
};

export const addonPlansQueryOptions = () =>
  queryOptions({
    queryKey: ["addons", "plans"],
    queryFn: fetchAddonPlans,
    staleTime: 1000 * 60 * 5,
  });

export const useAddonPlansQuery = () => useQuery(addonPlansQueryOptions());

export const addonPlanPricesQueryOptions = () =>
  queryOptions({
    queryKey: ["addons", "plan-prices"],
    queryFn: fetchAddonPlanPrices,
    staleTime: 1000 * 60 * 5,
  });

export const useAddonPlanPricesQuery = () =>
  useQuery(addonPlanPricesQueryOptions());

export const addonProductPickerQueryOptions = () =>
  queryOptions({
    queryKey: ["addons", "product-picker"],
    queryFn: fetchAddonProductPicker,
    staleTime: 1000 * 60 * 5,
  });

// Kept available for other screens, but the Add-on create/edit flow now links
// explicit products and only uses category as a local UI filter.
export const addonCategoryPickerQueryOptions = () =>
  queryOptions({
    queryKey: ["addons", "category-picker"],
    queryFn: fetchAddonCategoryPicker,
    staleTime: 1000 * 60 * 5,
  });

export const addonBasePlanPickerQueryOptions = () =>
  queryOptions({
    queryKey: ["addons", "base-plan-picker"],
    queryFn: fetchAddonBasePlanPicker,
    staleTime: 1000 * 60 * 5,
  });

export const addonByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["addons", "detail", id],
    queryFn: () => fetchAddonById(id),
    enabled: !!id,
  });

export const useAddonByIdQuery = (id: string) => {
  return useQuery(addonByIdQueryOptions(id));
};

export const useCreateAddonPlanPriceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddonPlanPricePayload) => createAddonPlanPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["addons", "plan-prices"],
      });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
};

export const useUpdateAddonPlanPriceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: AddonPlanPricePayload;
    }) => updateAddonPlanPrice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["addons", "plan-prices"],
      });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
};

export const useDeleteAddonPlanPriceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAddonPlanPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["addons", "plan-prices"],
      });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
};

export const useToggleAddonPlanPriceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => toggleAddonPlanPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["addons", "plan-prices"],
      });
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    },
  });
};
