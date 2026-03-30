import api from "@/lib/apis";

export const fetchUpdateAddon = async (
  id: string,
  payload: FormData
): Promise<void> => {
  await api.put(`/api/dashboard/addons/${id}`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
