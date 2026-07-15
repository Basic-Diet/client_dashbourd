import { toast } from "sonner";

import api from "@/lib/apis";
import { parseApiError } from "@/lib/apiErrors";
import { halalaToRiyal, riyalToHalala } from "@/utils/price";
import type {
  PremiumUpgradeArchivePayload,
  PremiumUpgradeConfigDto,
  PremiumUpgradeCreatePayload,
  PremiumUpgradeHealth,
  PremiumUpgradeKind,
  PremiumUpgradeListFilters,
  PremiumUpgradeListResponse,
  PremiumUpgradeReadinessResponse,
  PremiumUpgradeSingleResponse,
  PremiumUpgradeSourceDto,
  PremiumUpgradeSourceFilters,
  PremiumUpgradeStatus,
  PremiumUpgradeUpdatePayload,
} from "@/types/premiumUpgradeTypes";

export const PREMIUM_UPGRADES_LIST_QUERY_KEY = "premium-upgrades.list";
export const PREMIUM_UPGRADES_READINESS_QUERY_KEY =
  "premium-upgrades.readiness";
export const PREMIUM_UPGRADES_SOURCES_QUERY_KEY = "premium-upgrades.sources";
export const PREMIUM_UPGRADES_DETAIL_QUERY_KEY = "premium-upgrades.detail";

export const defaultPremiumUpgradeListFilters: PremiumUpgradeListFilters = {
  q: "",
  kind: "all",
  status: "all",
  health: "all",
  page: 1,
  limit: 20,
};

export const defaultPremiumUpgradeSourceFilters: PremiumUpgradeSourceFilters = {
  q: "",
  kind: "product",
  status: "active",
  page: 1,
  limit: 20,
};

const premiumErrorMessages: Record<string, string> = {
  PREMIUM_SOURCE_NOT_FOUND: "المصدر المحدد لم يعد موجودًا",
  PREMIUM_SOURCE_NOT_SELECTABLE: "المصدر المحدد غير متاح للاشتراكات",
  PREMIUM_SOURCE_RELATION_AMBIGUOUS:
    "هذا الخيار مرتبط بأكثر من وجبة. اختر العلاقة المحددة من قائمة المصادر.",
  PREMIUM_SOURCE_RELATION_INVALID:
    "علاقة الخيار بالمنتج أو المجموعة غير صالحة",
  PREMIUM_SOURCE_CONFLICT: "هذا المصدر مربوط بترقية مميزة أخرى",
  PREMIUM_KEY_CONFLICT: "يوجد إعداد نشط آخر بنفس مفتاح الترقية",
  PREMIUM_RELINK_KEY_MISMATCH:
    "المصدر المختار غير متوافق مع هوية الترقية الحالية",
  PREMIUM_UPGRADE_REVISION_CONFLICT:
    "تم تعديل العنصر بواسطة مستخدم آخر. حدّث البيانات وحاول مرة أخرى",
  PREMIUM_UPGRADE_INVALID_HEALTH: "فلتر حالة الصحة غير صحيح",
  PREMIUM_UPGRADE_INVALID_SOURCE_ID:
    "معرف المصدر غير صحيح. حدّث قائمة المصادر وحاول مرة أخرى.",
  PREMIUM_UPGRADE_SOURCE_NOT_FOUND: "المصدر المحدد لم يعد موجودًا.",
  PREMIUM_UPGRADE_SOURCE_NOT_ELIGIBLE:
    "هذا المصدر غير مؤهل ليكون ترقية مميزة.",
  PREMIUM_UPGRADE_RELATION_INVALID:
    "ربط المصدر غير صحيح أو غير مكتمل.",
  PREMIUM_UPGRADE_DUPLICATE:
    "هذا المصدر مربوط مسبقًا كترقية مميزة.",
  PREMIUM_UPGRADE_KEY_CONFLICT:
    "مفتاح الترقية المميزة مستخدم مسبقًا.",
  PREMIUM_UPGRADE_INVALID_DELTA:
    "سعر الترقية يجب أن يكون رقمًا صحيحًا وغير سالب.",
  PREMIUM_UPGRADE_ARCHIVED:
    "هذه الترقية مؤرشفة ولا تقبل هذا الإجراء.",
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

export async function fetchPremiumUpgradeSources(
  filters: PremiumUpgradeSourceFilters
): Promise<PremiumUpgradeListResponse<PremiumUpgradeSourceDto>> {
  const response = await api.get("/api/dashboard/premium-upgrades/sources", {
    params: buildSourceParams(filters),
  });
  return response.data;
}

export async function fetchPremiumUpgradeDetail(
  id: string
): Promise<PremiumUpgradeSingleResponse<PremiumUpgradeConfigDto>> {
  const response = await api.get(`/api/dashboard/premium-upgrades/${id}`);
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

export function buildCreatePremiumUpgradePayload(form: {
  kind: PremiumUpgradeKind;
  selectedSource: PremiumUpgradeSourceDto;
  upgradePriceSarInput: string;
  currency: "SAR";
  isActive: boolean;
  isVisible: boolean;
  sortOrder: string;
}): PremiumUpgradeCreatePayload {
  const payload: PremiumUpgradeCreatePayload = {
    kind: form.kind,
    sourceId: form.selectedSource.sourceId,
    upgradeDeltaHalala: riyalToHalala(form.upgradePriceSarInput),
    currency: form.currency,
    isActive: Boolean(form.isActive),
    isVisible: Boolean(form.isVisible),
    sortOrder: Number(form.sortOrder),
  };
  if (form.kind === "option" && form.selectedSource.relationId) {
    payload.relationId = form.selectedSource.relationId;
  }
  return payload;
}

export function buildRelinkPremiumUpgradePayload({
  row,
  selectedSource,
}: {
  row: PremiumUpgradeConfigDto;
  selectedSource: PremiumUpgradeSourceDto;
}): PremiumUpgradeUpdatePayload {
  const payload: PremiumUpgradeUpdatePayload = {
    kind: selectedSource.kind === "product" ? "product" : "option",
    sourceId: selectedSource.sourceId,
  };
  if (row.revision !== undefined) payload.expectedRevision = row.revision;
  if (selectedSource.kind === "option" && selectedSource.relationId) {
    payload.relationId = selectedSource.relationId;
  }
  return payload;
}

export function showPremiumUpgradeError(error: unknown) {
  const code = getPremiumUpgradeErrorCode(error);
  const parsed = parseApiError(error);
  toast.error(
    premiumErrorMessageForCode(code) ||
      parsed.message ||
      "حدث خطأ غير متوقع. حدّث البيانات وحاول مرة أخرى."
  );
}

export function premiumErrorMessageForCode(code?: string | null) {
  switch (code) {
    case "PREMIUM_SOURCE_RELATION_AMBIGUOUS":
      return "هذا الخيار مرتبط بأكثر من وجبة. اختر العلاقة المحددة من قائمة المصادر.";
    case "PREMIUM_SOURCE_RELATION_INVALID":
      return "ربط المصدر غير صحيح. حدّث قائمة المصادر واختر العنصر مرة أخرى.";
    default:
      return code ? premiumErrorMessages[code] : undefined;
  }
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

export function premiumDisplayName(
  value?: string | { ar?: string | null; en?: string | null } | null
) {
  if (typeof value === "string") return value || "بدون اسم";
  return value?.ar || value?.en || "بدون اسم";
}

export function premiumRowName(row: PremiumUpgradeConfigDto) {
  return premiumDisplayName(row.name ?? row.sourceName ?? null);
}

export function premiumRowKey(row: PremiumUpgradeConfigDto) {
  return row.key || row.premiumKey || row.sourceKey || "-";
}

export function premiumRowKind(row: PremiumUpgradeConfigDto): PremiumUpgradeKind {
  if (row.kind === "product") return "product";
  if (row.kind === "option") return "option";
  if (row.sourceType === "menu_product") return "product";
  return "option";
}

export function premiumKindLabel(value: PremiumUpgradeKind | string) {
  return value === "product" ? "منتج كامل" : "خيار داخل وجبة";
}

export function premiumStatusLabel(value?: PremiumUpgradeStatus | string | null) {
  switch (value) {
    case "hidden":
      return "مخفي";
    case "disabled":
      return "متوقف";
    case "archived":
      return "مؤرشف";
    default:
      return "نشط";
  }
}

export function premiumHealthLabel(value?: PremiumUpgradeHealth | string | null) {
  return value === "broken" ? "يحتاج إصلاح" : "جاهز";
}

export function premiumIssueMessage(issueCode?: string | null) {
  switch (issueCode) {
    case "PREMIUM_SOURCE_NOT_FOUND":
    case "SOURCE_NOT_FOUND":
      return "المصدر المرتبط غير موجود";
    case "PREMIUM_SOURCE_RELATION_INVALID":
    case "SOURCE_RELATION_INVALID":
      return "ربط المصدر غير صحيح";
    case "PREMIUM_SOURCE_NOT_SELECTABLE":
    case "SOURCE_NOT_SELECTABLE":
      return "المصدر غير متاح للاشتراكات";
    case "PREMIUM_RELINK_KEY_MISMATCH":
      return "المصدر المختار غير متوافق مع هوية الترقية الحالية";
    default:
      return "يحتاج إلى إعادة ربط بمصدر صالح";
  }
}

export function premiumRowHealth(row: PremiumUpgradeConfigDto): PremiumUpgradeHealth {
  if (row.health === "ready" || row.health === "broken") return row.health;
  if (row.validation && row.validation.valid === false) return "broken";
  return "ready";
}

export function premiumRowStatus(row: PremiumUpgradeConfigDto): string {
  if (row.status) return row.status;
  if (row.isEnabled === false) return "disabled";
  if (row.isVisible === false) return "hidden";
  return "active";
}

export function premiumDetailStatus(
  compactRow: PremiumUpgradeConfigDto | null | undefined,
  detailRow: PremiumUpgradeConfigDto
): PremiumUpgradeStatus {
  if (compactRow?.status === "archived") return "archived";

  const display = readRecord(detailRow.display);
  const enabled = display.enabled ?? detailRow.isEnabled;
  const visible = display.visible ?? detailRow.isVisible;

  if (enabled === false) return "disabled";
  if (enabled === true && visible === false) return "hidden";
  if (enabled === true) return "active";

  if (
    compactRow?.status === "active" ||
    compactRow?.status === "hidden" ||
    compactRow?.status === "disabled"
  ) {
    return compactRow.status;
  }

  return "active";
}

export function premiumEditStateFromRow(row: PremiumUpgradeConfigDto) {
  const display = readRecord(row.display);
  if (display.enabled !== undefined || display.visible !== undefined) {
    return {
      isActive:
        display.enabled !== undefined
          ? Boolean(display.enabled)
          : row.isEnabled !== false,
      isVisible:
        display.visible !== undefined
          ? Boolean(display.visible)
          : row.isVisible !== false,
    };
  }
  const status = premiumRowStatus(row);
  if (status === "active") return { isActive: true, isVisible: true };
  if (status === "hidden") return { isActive: true, isVisible: false };
  if (status === "disabled") {
    return {
      isActive: false,
      isVisible: row.isVisible !== undefined ? row.isVisible !== false : false,
    };
  }
  return {
    isActive: row.isEnabled !== false,
    isVisible: row.isVisible !== false,
  };
}

export function premiumDetailRevision(row: PremiumUpgradeConfigDto) {
  return Number.isInteger(row.revision) ? row.revision : undefined;
}

export function premiumDetailSortOrder(row: PremiumUpgradeConfigDto) {
  const display = readRecord(row.display);
  const sortOrder = Number(display.sortOrder ?? row.sortOrder ?? 0);
  return Number.isFinite(sortOrder) ? sortOrder : 0;
}

export function premiumDetailCurrency(row: PremiumUpgradeConfigDto) {
  const pricing = readRecord(row.pricing);
  return String(pricing.currency || row.currency || "SAR").toUpperCase() as "SAR";
}

export function premiumDetailUpgradeDeltaSar(row: PremiumUpgradeConfigDto) {
  const pricing = readRecord(row.pricing);
  if (pricing.upgradeDeltaSar !== undefined && pricing.upgradeDeltaSar !== null) {
    const amount = Number(pricing.upgradeDeltaSar);
    if (Number.isFinite(amount)) return amount;
  }
  return premiumPriceSar(row);
}

export function premiumDetailUpgradeDeltaHalala(row: PremiumUpgradeConfigDto) {
  const pricing = readRecord(row.pricing);
  if (pricing.upgradeDeltaHalala !== undefined && pricing.upgradeDeltaHalala !== null) {
    const amount = Number(pricing.upgradeDeltaHalala);
    if (Number.isFinite(amount)) return amount;
  }
  return premiumPriceHalala(row);
}

export function premiumDetailHealthStatus(row: PremiumUpgradeConfigDto): PremiumUpgradeHealth {
  const health = readRecord(row.health);
  if (health.status === "ready" || health.status === "broken") return health.status;
  return premiumRowHealth(row);
}

export function premiumDetailHealthCode(row: PremiumUpgradeConfigDto) {
  const health = readRecord(row.health);
  return typeof health.code === "string" && health.code ? health.code : row.issueCode || null;
}

export function normalizePremiumUpgradeRow(
  row: PremiumUpgradeConfigDto
): PremiumUpgradeConfigDto {
  const priceHalala = premiumPriceHalala(row);
  return {
    ...row,
    key: row.key || row.premiumKey || row.sourceKey || "",
    name: row.name ?? row.sourceName ?? "",
    kind: row.kind === "product" || row.kind === "option" ? row.kind : premiumRowKind(row),
    sourceId: row.sourceId || null,
    priceHalala,
    priceSar:
      row.priceSar !== null && row.priceSar !== undefined
        ? Number(row.priceSar)
        : halalaToRiyal(priceHalala),
    currency: row.currency || "SAR",
    status: premiumRowStatus(row),
    health: premiumRowHealth(row),
    issueCode: row.issueCode || null,
    sortOrder: Number(row.sortOrder || 0),
  };
}

export function premiumPriceHalala(row: PremiumUpgradeConfigDto) {
  return Number(
    row.priceHalala ?? row.upgradeDeltaHalala ?? halalaFromSar(row.priceSar)
  );
}

export function premiumPriceSar(row: PremiumUpgradeConfigDto) {
  if (row.priceSar !== null && row.priceSar !== undefined) {
    return Number(row.priceSar);
  }
  if (row.upgradeDeltaSar !== null && row.upgradeDeltaSar !== undefined) {
    return Number(row.upgradeDeltaSar);
  }
  return halalaToRiyal(row.priceHalala ?? row.upgradeDeltaHalala ?? 0);
}

export function formatPremiumSar(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPremiumList(values?: string[]) {
  return values?.length ? values.join("، ") : "-";
}

export function formatJsonValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value || "-";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

export function getSourceRelationId(source: PremiumUpgradeSourceDto) {
  return source.relationId || source.id || source.sourceId;
}

export function sourceHasRequiredRelation(source: PremiumUpgradeSourceDto) {
  if (source.kind !== "option") return true;
  return Boolean(source.relationId);
}

export function isSourceCompatibleWithConfig(
  source: PremiumUpgradeSourceDto,
  row: PremiumUpgradeConfigDto
) {
  const configKey = row.key || row.premiumKey;
  if (!configKey) return true;
  const keys = new Set([
    ...(source.compatibilityKeys ?? []),
    ...(source.premiumCompatibilityKeys ?? []),
  ]);
  return keys.size === 0 ? true : keys.has(configKey);
}

export function sourceConflictMessage(
  source: PremiumUpgradeSourceDto,
  currentConfigId?: string
) {
  if (source.linked && source.linkedConfigId !== currentConfigId) {
    return "مربوط بترقية أخرى";
  }
  if (source.selectable === false) {
    if (source.conflictReason === "SOURCE_ALREADY_LINKED") {
      return "مربوط بترقية أخرى";
    }
    if (source.conflictReason === "INCOMPATIBLE_PREMIUM_KEY") {
      return "المصدر غير متوافق مع هذه الترقية";
    }
    return "المصدر غير متاح للاشتراكات";
  }
  return null;
}

export function isSourceSelectable(
  source: PremiumUpgradeSourceDto,
  currentConfigId?: string
) {
  return !sourceConflictMessage(source, currentConfigId);
}

export function sourceRelationContext(source: PremiumUpgradeSourceDto) {
  const product =
    source.sourceProductKey ||
    formatSourceContextValue(source.product) ||
    null;
  const group =
    source.sourceGroupKey ||
    formatSourceContextValue(source.group) ||
    null;
  if (source.kind === "product") return source.key || source.sourceProductKey || "";
  return [
    product ? `المنتج: ${product}` : null,
    group ? `المجموعة: ${group}` : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

export function sourceGroupName(source: PremiumUpgradeSourceDto) {
  return formatSourceContextValue(source.group);
}

export function buildListParams(filters: PremiumUpgradeListFilters) {
  const params: Record<string, string | number> = {
    page: filters.page,
    limit: filters.limit,
  };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.kind !== "all") params.kind = filters.kind;
  if (filters.status !== "all") params.status = filters.status;
  if (filters.health !== "all") params.health = filters.health;
  return params;
}

export function buildSourceParams(filters: PremiumUpgradeSourceFilters) {
  const params: Record<string, string | number> = {
    page: filters.page,
    limit: filters.limit,
    status: filters.status,
  };
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.kind !== "all") params.kind = filters.kind;
  if (filters.excludeConfigId) params.excludeConfigId = filters.excludeConfigId;
  return params;
}

function formatSourceContextValue(value: PremiumUpgradeSourceDto["group"]) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if ("name" in value || "key" in value) {
    return premiumDisplayName(value.name) || value.key || "";
  }
  if ("ar" in value || "en" in value) return premiumDisplayName(value);
  return "";
}

function halalaFromSar(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
