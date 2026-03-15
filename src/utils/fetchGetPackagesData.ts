import api from "@/lib/apis";

export const fetchGetPackagesData = async () => {
  try {
    const response = await api.get("/api/dashboard/plans");
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
