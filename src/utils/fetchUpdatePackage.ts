import api from "@/lib/apis";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";

export const fetchUpdatePackage = async (
  id: string,
  data: CreatePackageSchemaType
) => {
  const response = await api.put(`/api/admin/plans/${id}`, data);
  return response.data;
};
