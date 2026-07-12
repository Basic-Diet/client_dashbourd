import api from "@/lib/apis";
import type {
  LocalizedName,
  MenuProductPickerItem,
  MenuProductPickerResponse,
} from "@/types/addonTypes";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asLocalizedName = (value: unknown): LocalizedName => {
  const record = asRecord(value);
  if (Object.keys(record).length > 0) {
    return {
      ar: String(record.ar ?? record.arabic ?? record.name_ar ?? ""),
      en: String(record.en ?? record.english ?? record.name_en ?? ""),
    };
  }

  return {
    ar: typeof value === "string" ? value : "",
    en: typeof value === "string" ? value : "",
  };
};

const extractItems = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;

  const record = asRecord(payload);
  if (Array.isArray(record.data)) return record.data;

  const data = asRecord(record.data);
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(record.items)) return record.items;

  return [];
};

const normalizeProduct = (value: unknown): MenuProductPickerItem => {
  const product = asRecord(value);
  return {
    id: String(product.id ?? product._id ?? ""),
    key: product.key === undefined ? undefined : String(product.key),
    name: asLocalizedName(product.name),
    category:
      product.category === undefined ? undefined : String(product.category),
    image:
      product.image === undefined
        ? product.imageUrl === undefined
          ? undefined
          : String(product.imageUrl)
        : String(product.image),
    imageUrl:
      product.imageUrl === undefined
        ? product.image === undefined
          ? undefined
          : String(product.image)
        : String(product.imageUrl),
    isActive: product.isActive !== false,
  };
};

export const fetchAllAddonProductPicker =
  async (): Promise<MenuProductPickerResponse> => {
    const response = await api.get(
      "/api/dashboard/menu/products?view=picker&availableFor=subscription&isVisible=true&isAvailable=true"
    );

    return {
      status: asRecord(response.data).status !== false,
      data: extractItems(response.data)
        .map(normalizeProduct)
        .filter((product) => product.id),
    };
  };
