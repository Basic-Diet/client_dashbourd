import api from "@/lib/apis";

export const fetchSubscriptionsSummary = async () => {
  try {
    const response = await api.get("/api/dashboard/subscriptions/summary");
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriptions summary:", error);
    throw error;
  }
};

export const fetchSubscriptionsList = async ({
  status,
  page = 1,
  limit = 20,
  q = "",
}: {
  status?: string | null;
  page?: number;
  limit?: number;
  q?: string;
}) => {
  try {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (page) params.append("page", page.toString());
    if (limit) params.append("limit", limit.toString());
    if (q) params.append("q", q);

    const response = await api.get(
      `/api/dashboard/subscriptions?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriptions list:", error);
    throw error;
  }
};

export const fetchSubscriptionDetails = async (id: string) => {
  const response = await api.get(`/api/dashboard/subscriptions/${id}`);
  return response.data;
};

export const freezeSubscription = async ({
  id,
  data,
}: {
  id: string;
  data: { startDate: string; days: number };
}) => {
  console.log(data);

  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/freeze`,
    data
  );
  return response.data;
};

export const unfreezeSubscription = async (id: string) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/unfreeze`
  );
  return response.data;
};

export const extendSubscription = async ({
  id,
  data,
}: {
  id: string;
  data: { days: number };
}) => {
  const response = await api.post(
    `/api/dashboard/subscriptions/${id}/extend`,
    data
  );
  return response.data;
};

export const cancelSubscription = async (id: string) => {
  const response = await api.post(`/api/dashboard/subscriptions/${id}/cancel`);
  return response.data;
};

export const createSubscription = async (data: Record<string, unknown>) => {
  const response = await api.post("/api/dashboard/subscriptions", data);
  return response.data;
};
