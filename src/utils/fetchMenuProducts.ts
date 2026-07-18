import api from "@/lib/apis";
import type {
  MenuProductsResponse,
  MenuProductDetailResponse,
  MenuProductComposerResponse,
  MenuProductMutationResponse,
  DashboardWeightPricingResponse,
  BulkUpdateProductsResponse,
  CreateMenuProductPayload,
  UpdateMenuProductPayload,
  UpdateWeightPricingPayload,
  BulkUpdateProductsPayload,
  ReorderItem,
  MenuProductListParams,
} from "@/types/menuTypes";
import {
  normalizeProductsResponse,
  normalizeProductDetailResponse,
  normalizeProductComposerResponse,
  normalizeBulkUpdateProductsResponse,
  normalizeMenuProductMutationResponse,
  normalizeDashboardWeightPricingResponse,
} from "@/utils/menuResponseNormalizers";
import { buildListQuery } from "@/utils/buildListQuery";
import {
  menuProductComposerUrl,
  menuProductVisibilityUrl,
} from "@/utils/menuApiContract";

// ── List Products ──
// GET /api/dashboard/menu/products

export const fetchMenuProducts = async (
  params: MenuProductListParams = {}
): Promise<MenuProductsResponse> => {
  const response = await api.get(
    `/api/dashboard/menu/products${buildListQuery(params)}`
  );
  return normalizeProductsResponse(response.data);
};

// ── Get Product by ID ──

export const fetchMenuProductById = async (
  id: string
): Promise<MenuProductDetailResponse> => {
  const response = await api.get(`/api/dashboard/menu/products/${id}`);
  return normalizeProductDetailResponse(response.data);
};

export const fetchMenuProductComposer = async (
  id: string
): Promise<MenuProductComposerResponse> => {
  const response = await api.get(menuProductComposerUrl(id));
  return normalizeProductComposerResponse(response.data);
};

// ── Create Product ──
// POST /api/dashboard/menu/products

export const fetchCreateMenuProduct = async (
  data: CreateMenuProductPayload
): Promise<MenuProductMutationResponse> => {
  const response = await api.post("/api/dashboard/menu/products", data);
  return normalizeMenuProductMutationResponse(response.data, "create product");
};

// ── Update Product ──
// PATCH /api/dashboard/menu/products/:id

export const fetchUpdateMenuProduct = async (
  id: string,
  data: UpdateMenuProductPayload
): Promise<MenuProductMutationResponse> => {
  const response = await api.patch(`/api/dashboard/menu/products/${id}`, data);
  return normalizeMenuProductMutationResponse(response.data, "update product");
};

export const fetchUpdateMenuProductWeightPricing = async (
  id: string,
  data: UpdateWeightPricingPayload
): Promise<DashboardWeightPricingResponse> => {
  const response = await api.patch(
    `/api/dashboard/menu/products/${id}/weight-pricing`,
    data
  );
  return normalizeDashboardWeightPricingResponse(response.data);
};

export const fetchBulkUpdateMenuProducts = async (
  data: BulkUpdateProductsPayload
): Promise<BulkUpdateProductsResponse> => {
  const response = await api.patch("/api/dashboard/menu/products/bulk", data);
  return normalizeBulkUpdateProductsResponse(response.data);
};

// ── Update Product Availability ──
// PATCH /api/dashboard/menu/products/:id/availability

export const fetchUpdateMenuProductAvailability = async (
  id: string,
  isAvailable: boolean
): Promise<void> => {
  await api.patch(`/api/dashboard/menu/products/${id}/availability`, {
    isAvailable,
  });
};

export const fetchToggleMenuProductVisibility = async (
  id: string,
  isVisible: boolean
): Promise<void> => {
  await api.patch(menuProductVisibilityUrl(id), { isVisible });
};

// ── Duplicate Product ──
// POST /api/dashboard/menu/products/:id/duplicate

export const fetchDuplicateMenuProduct = async (
  id: string
): Promise<MenuProductDetailResponse> => {
  const response = await api.post(`/api/dashboard/menu/products/${id}/duplicate`);
  return normalizeProductDetailResponse(response.data);
};

// ── Soft Delete Product ──
// DELETE /api/dashboard/menu/products/:id

export const fetchDeleteMenuProduct = async (id: string): Promise<void> => {
  await api.delete(`/api/dashboard/menu/products/${id}`);
};

// ── Reorder Products ──
// PATCH /api/dashboard/menu/products/reorder

export const fetchReorderMenuProducts = async (
  items: ReorderItem[]
): Promise<void> => {
  await api.patch("/api/dashboard/menu/products/reorder", { items });
};
