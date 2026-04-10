import { fetchMeals } from "@/utils/fetchMeals";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const mealsQueryOptions = () =>
  queryOptions({
    queryKey: ["meals"],
    queryFn: fetchMeals,
    staleTime: 1000 * 60 * 5,
  });

export const useMealsQuery = () => {
  return useQuery(mealsQueryOptions());
};
