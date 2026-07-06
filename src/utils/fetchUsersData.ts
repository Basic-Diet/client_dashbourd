import api from "@/lib/apis";
import type { PaginatedUsersResponse } from "@/types/userTypes";
import type { CreateUserSchemaType } from "@/lib/validations/createUserSchema";

export const fetchUsersList = async ({
  page = 1,
  limit = 20,
  q,
}: {
  page?: number;
  limit?: number;
  q?: string;
} = {}): Promise<PaginatedUsersResponse> => {
  try {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    const query = q?.trim();
    if (query) params.append("q", query);

    const response = await api.get("/api/dashboard/users?" + params.toString());
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

export const fetchUserSubscriptions = async (userId: string) => {
  const response = await api.get(
    `/api/dashboard/users/${userId}/subscriptions`
  );
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
  data: {
    isActive: boolean;
  };
}) => {
  const response = await api.put(`/api/dashboard/users/${userId}`, data);
  return response.data;
};
