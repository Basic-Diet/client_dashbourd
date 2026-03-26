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

    const response = await api.get(`/api/dashboard/subscriptions?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching subscriptions list:", error);
    throw error;
  }
};
