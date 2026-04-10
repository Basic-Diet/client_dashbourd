import { fetchCategories } from "@/utils/fetchCategories";
import { queryOptions, useQuery } from "@tanstack/react-query";

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ["meal-categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5,
  });

export const useCategoriesQuery = () => {
  return useQuery(categoriesQueryOptions());
};
