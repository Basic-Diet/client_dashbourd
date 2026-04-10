import api from "@/lib/apis";

export const fetchCreateMeal = async (data: FormData): Promise<void> => {
  await api.post("/api/admin/meals", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
