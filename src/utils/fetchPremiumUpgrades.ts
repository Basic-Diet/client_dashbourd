import { toast } from "sonner";

import api from "@/lib/apis";
import { riyalToHalala } from "@/utils/price";
import type {
  PremiumUpgradeArchivePayload,
  PremiumUpgradeCandidateDto,
  PremiumUpgradeCandidateFilters,
  PremiumUpgradeConfigDto,
  PremiumUpgradeCreatePayload,
  PremiumUpgradeListFilters,
  PremiumUpgradeListResponse,
  PremiumUpgradeReadinessResponse,
  PremiumUpgradeSelectionType,
  PremiumUpgradeSingleResponse,
  PremiumUpgradeSourceType,
  PremiumUpgradeStatePayload,
  PremiumUpgradeUpdatePayload,
  PremiumUpgradeLocalizedName,
} from "@/types/premiumUpgradeTypes";

export const PREMIUM_UPGRADES_LIST_QUERY_KEY = "premium-upgrades.list";
export const PREMIUM_UPGRADES_READINESS_QUERY_KEY =
  "premium-upgrades.readiness";
export const PREMIUM_UPGRADES_CANDIDATES_QUERY_KEY =
  "premium-upgrades.candidates";

export const defaultPremiumUpgradeListFilters: PremiumUpgradeListFilters = {
  q: "",
  status: "all",
  isEnabled: "all",
  isVisible: "all",
  sourceType: "all",
  selectionType: "all",
  page: 1,
  limit: 20,
};

export const defaultPremiumUpgradeCandidateFilters: PremiumUpgradeCandidateFilters =
  {
    q: "",
    sourceType: "all",
    selectionType: "all",
    includeLinked: false,
    page: 1,
    limit: 100,
  };

const premiumErrorMessages: Record<string, string> = {
  PREMIUM_UPGRADE_INVALID_SOURCE_ID:
    "معرف المصدر غير صحيح. حدّث قائمة العناصر وحاول مرة أخرى.",
  PREMIUM_UPGRADE_SOURCE_NOT_FOUND: "عنصر المنيو المحدد لم يعد موجودا.",
  PREMIUM_UPGRADE_SOURCE_NOT_ELIGIBLE:
    "هذا العنصر غير مؤهل ليكون ترقية مميزة.",
  PREMIUM_UPGRADE_RELATION_INVALID: "ربط المصدر غير صحيح أو غير مكتمل.",
  PREMIUM_UPGRADE_DUPLICATE: "هذا المصدر مربوط مسبقا كترقية مميزة.",
  PREMIUM_UPGRADE_KEY_CONFLICT: "مفتاح الترقية المميزة مستخدم مسبقا.",
  PREMIUM_UPGRADE_INVALID_DELTA:
    "فرق سعر الترقية يجب أن يكون رقما صحيحا وغير سالب.",
  PREMIUM_UPGRADE_REVISION_CONFLICT:
    "تم تعديل هذا العنصر بواسطة مدير آخر. حدّث البيانات وحاول مرة أخرى.",
  PREMIUM_UPGRADE_ARCHIVED: "هذه الترقية مؤرشفة ولا تقبل هذا الإجراء.",
};

export async function fetchPremiumUpgradeReadiness(): Promise<PremiumUpgradeReadinessResponse> {
  const response = await api.get("/api/dashboard/premium-upgrades/readiness");
  return response.data;
}

export async function fetchPremiumUpgrades(
  filters: PremiumUpgradeListFilters
): Promise<PremiumUpgradeListResponse<PremiumUpgradeConfigDto>> {
  const response = await api.get("/api/dashboard/premium-upgrades", {
    params: buildListParams(filters),
  });
  return response.data;
}

export async function fetchPremiumUpgradeCandidates(
  filters: PremiumUpgradeCandidateFilters
): Promise<PremiumUpgradeListResponse<PremiumUpgradeCandidateDto>> {
  const response = await api.get("/api/dashboard/premium-upgrades/candidates", {
    params: buildCandidateParams(filters),
  });
  return response.data;
}

export async function createPremiumUpgrade(
  payload: PremiumUpgradeCreatePayload
): Promise<PremiumUpgradeSingleResponse<PremiumUpgradeConfigDto>> {
  const response = await api.post("/api/dashboard/premium-upgrades", payload);
  return response.data;
}

export async function updatePremiumUpgrade({
  id,
  payload,
}: {
  id: string;
  payload: PremiumUpgradeUpdatePayload;
}): Promise<PremiumUpgradeSingleResponse<PremiumUpgradeConfigDto>> {
  const response = await api.patch(
    `/api/dashboard/premium-upgrades/${id}`,
    payload
  );
  return response.data;
}

export async function updatePremiumUpgradeState({
  id,
  payload,
}: {
  id: string;
  payload: PremiumUpgradeStatePayload;
}): Promise<PremiumUpgradeSingleResponse<PremiumUpgradeConfigDto>> {
  const response = await api.patch(
    `/api/dashboard/premium-upgrades/${id}/state`,
    payload
  );
  return response.data;
}

export async function archivePremiumUpgrade({
  id,
  payload,
}: {
  id: string;
  payload: PremiumUpgradeArchivePayload;
}): Promise<PremiumUpgradeSingleResponse<PremiumUpgradeConfigDto>> {
  const response = await api.post(
    `/api/dashboard/premium-upgrades/${id}/archive`,
    payload
  );
  return response.data;
}

export function buildCreatePremiumUpgradePayload(
  candidate: PremiumUpgradeCandidateDto,
  form: {
    displayGroupKey: string;
    upgradeDeltaSarInput: string;
    isEnabled: boolean;
    isVisible: boolean;
    sortOrder: string;
  }
): PremiumUpgradeCreatePayload {
  return {
    sourceType: candidate.sourceType,
    sourceId: candidate.sourceId,
    sourceProductId: candidate.sourceProductId,
    sourceGroupId: candidate.sourceGroupId,
    selectionType: candidate.selectionType,
    displayGroupKey: form.displayGroupKey,
    upgradeDeltaHalala: riyalToHalala(form.upgradeDeltaSarInput),
    isEnabled: Boolean(form.isEnabled),
    isVisible: Boolean(form.isVisible),
    sortOrder: Number(form.sortOrder),
  };
}

export function showPremiumUpgradeError(error: unknown) {
  const code = getPremiumUpgradeErrorCode(error);
  toast.error(
    (code && premiumErrorMessages[code]) ||
      getApiErrorMessage(error) ||
      "حدث خطأ غير متوقع. حدّث البيانات وحاول مرة أخرى."
  );
}

export function getPremiumUpgradeErrorCode(error: unknown): string | null {
  const response = (error as { response?: { data?: unknown } })?.response?.data;
  const data = response as {
    code?: string;
    error?: { code?: string };
    data?: { code?: string };
    errors?: Array<{ code?: string }>;
  };
  return (
    data?.code ||
    data?.error?.code ||
    data?.data?.code ||
    data?.errors?.[0]?.code ||
    null
  );
}

export function premiumNameAr(name: PremiumUpgradeLocalizedName) {
  return name.ar || name.en || "بدون اسم";
}

export function premiumSelectionTypeLabel(
  value: PremiumUpgradeSelectionType | string
) {
  return value === "premium_large_salad"
    ? "سلطة كبيرة مميزة"
    : "بروتين مميز";
}

export function premiumSourceTypeLabel(value: PremiumUpgradeSourceType | string) {
  return value === "menu_product" ? "منتج منيو" : "خيار منيو";
}

export function premiumDisplayGroupLabel(value: string | null | undefined) {
  if (value === "premium_salads") return "سلطات مميزة";
  return "بروتينات مميزة";
}

export function formatPremiumSar(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPremiumList(values?: string[]) {
  return values?.length ? values.join("، ") : "-";
}

export function getSourceContext(row: {
  sourceProductId?: string | null;
  sourceGroupId?: string | null;
  sourceGroupKey?: string | null;
  sourceProductKey?: string | null;
  sourceId?: string | null;
}) {
  return (
    row.sourceGroupKey ||
    row.sourceProductKey ||
    row.sourceGroupId ||
    row.sourceProductId ||
    row.sourceId ||
    "-"
  );
}

export function defaultDisplayGroupForSelection(
  selectionType: PremiumUpgradeSelectionType
) {
  return selectionType === "premium_large_salad"
    ? "premium_salads"
    : "premium_proteins";
}

function buildListParams(filters: PremiumUpgradeListFilters) {
  const params: Record<string, string | number | boolean> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.status !== "all") params.status = filters.status;
  if (filters.isEnabled !== "all")
    params.isEnabled = filters.isEnabled === "true";
  if (filters.isVisible !== "all")
    params.isVisible = filters.isVisible === "true";
  if (filters.sourceType !== "all") params.sourceType = filters.sourceType;
  if (filters.selectionType !== "all")
    params.selectionType = filters.selectionType;
  return params;
}

function buildCandidateParams(filters: PremiumUpgradeCandidateFilters) {
  const params: Record<string, string | number | boolean> = {
    page: filters.page,
    limit: filters.limit,
    includeLinked: filters.includeLinked,
  };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.sourceType !== "all") params.sourceType = filters.sourceType;
  if (filters.selectionType !== "all")
    params.selectionType = filters.selectionType;
  return params;
}

function getApiErrorMessage(error: unknown): string | null {
  return (
    (error as { normalizedMessage?: string })?.normalizedMessage ||
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ||
    null
  );
}
