import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsersList, fetchUserDetails, updateUser } from "@/utils/fetchUsersData";

export const usersQueryOptions = (page: number, limit: number) =>
  queryOptions({
    queryKey: ["users", page, limit],
    queryFn: () => fetchUsersList({ page, limit }),
  });

export const useUsersListQuery = (page: number, limit: number) => {
  return useQuery({
    ...usersQueryOptions(page, limit),
  });
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

export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
