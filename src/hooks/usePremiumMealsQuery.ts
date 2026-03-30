import { fetchPremiumMeals } from "@/utils/fetchPremiumMeals";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const premiumMealsQueryOptions = () =>
  queryOptions({
    queryKey: ["premium-meals"],
    queryFn: fetchPremiumMeals,
    staleTime: 1000 * 60 * 5,
  });

export const usePremiumMealsQuery = () => {
  return useQuery(premiumMealsQueryOptions());
};
