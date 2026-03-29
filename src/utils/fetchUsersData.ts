import api from "@/lib/apis";
import type { PaginatedUsersResponse } from "@/types/userTypes";
import type { CreateUserSchemaType } from "@/lib/validations/createUserSchema";

export const fetchUsersList = async ({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedUsersResponse> => {
  try {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());

    const response = await api.get(
      `/api/dashboard/users?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching users list:", error);
    throw error;
  }
};

export const fetchUserDetails = async (userId: string) => {
  const response = await api.get(`/api/dashboard/users/${userId}`);
  return response.data;
};

export const createUser = async (data: CreateUserSchemaType) => {
  const response = await api.post("/api/dashboard/users", data);
  return response.data;
};

export const updateUser = async ({
  userId,
  data,
}: {
  userId: string;
  data: Record<string, unknown>;
}) => {
  const response = await api.put(`/api/dashboard/users/${userId}`, data);
  return response.data;
};
