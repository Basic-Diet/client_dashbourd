import api from "@/lib/apis";

export const fetchDeleteAddon = async (id: string): Promise<void> => {
  await api.delete(`/api/dashboard/addons/${id}`);
};
