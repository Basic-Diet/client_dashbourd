import api from "@/lib/apis";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";

export const fetchCreatePackage = async (data: CreatePackageSchemaType) => {
  const response = await api.post("/api/dashboard/plans", data);
  return response.data;
};
