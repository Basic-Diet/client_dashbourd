import api from "@/lib/apis";

export interface UploadImageResponse {
  status?: boolean;
  data?: unknown;
  imageUrl?: string;
  url?: string;
  secureUrl?: string;
  secure_url?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nonEmptyString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export const createImageUploadFormData = (file: File): FormData => {
  if (!(file instanceof File)) {
    throw new Error("Invalid file object");
  }

  const formData = new FormData();
  formData.append("image", file, file.name);
  return formData;
};

export const fetchUploadImage = async (
  file: File
): Promise<UploadImageResponse> => {
  const formData = createImageUploadFormData(file);
  const response = await api.post("/api/dashboard/uploads/image", formData);
  return response.data;
};

export const resolveUploadedImageUrl = (upload: unknown): string => {
  const root = asRecord(upload);
  const data = asRecord(root?.data);
  const image = asRecord(data?.image ?? root?.image);

  const url = [
    data?.imageUrl,
    data?.secureUrl,
    data?.secure_url,
    data?.url,
    image?.imageUrl,
    image?.secureUrl,
    image?.secure_url,
    image?.url,
    root?.imageUrl,
    root?.secureUrl,
    root?.secure_url,
    root?.url,
  ]
    .map(nonEmptyString)
    .find(Boolean);

  if (!url) {
    throw new Error("Image upload response did not include an image URL");
  }

  return url;
};
