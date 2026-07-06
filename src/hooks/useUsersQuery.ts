import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserDetails,
  fetchUserSubscriptions,
  fetchUsersList,
  updateUser,
} from "@/utils/fetchUsersData";

export const usersQueryOptions = (page: number, limit: number, search = "") =>
  queryOptions({
    queryKey: ["users", page, limit, search],
    queryFn: () => fetchUsersList({ page, limit, q: search }),
  });

export const allUsersQueryOptions = () =>
  queryOptions({
    queryKey: ["users", "all"],
    queryFn: () => fetchUsersList({ page: 1, limit: 200 }),
    staleTime: 1000 * 60 * 5,
  });

export const useUsersListQuery = (page: number, limit: number, search = "") => {
  return useQuery({
    ...usersQueryOptions(page, limit, search),
  });
};

export const useAllUsersQuery = () => {
  return useQuery(allUsersQueryOptions());
};

export const userDetailsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user-details", userId],
    queryFn: () => fetchUserDetails(userId),
    staleTime: 1000 * 60 * 5,
  });

export const useUserDetailsQuery = (userId: string) => {
  return useQuery(userDetailsQueryOptions(userId));
};

export const userSubscriptionsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["user-subscriptions", userId],
    queryFn: () => fetchUserSubscriptions(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });

export const useUserSubscriptionsQuery = (userId: string) =>
  useQuery(userSubscriptionsQueryOptions(userId));

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
