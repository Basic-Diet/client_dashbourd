import api from "@/lib/apis";

export const fetchCreateAddon = async (payload: FormData): Promise<void> => {
  await api.post("/api/dashboard/addons", payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
