import type {
  Addon,
  AddonPlanWritePayload,
  BasePlanPickerItem,
  LocalizedName,
} from "@/types/addonTypes";
import { halalaToRiyalInput, riyalToHalala } from "@/utils/price";

export type PriceRowState = {
  basePlanId: string;
  priceSar: string;
  isActive: boolean;
};

export type PlanFormState = {
  nameAr: string;
  nameEn: string;
  category: string;
  maxPerDay: string;
  isActive: boolean;
  menuProductIds: string[];
  prices: PriceRowState[];
};

export type PlanFormValidationResult =
  | { ok: true; payload: AddonPlanWritePayload }
  | { ok: false; message: string };

export function planToForm(
  plan: Addon | null,
  basePlans: BasePlanPickerItem[]
): PlanFormState {
  const priceMap = new Map(
    (plan?.planPrices ?? []).map((price) => [price.basePlanId, price])
  );

  return {
    nameAr: plan?.name.ar ?? "",
    nameEn: plan?.name.en ?? "",
    category: plan?.category ?? "snack",
    maxPerDay: String(plan?.maxPerDay ?? 1),
    isActive: plan?.isActive ?? true,
    // normalizeAddon already falls back to resolvedMenuProductIds for plans that
    // were temporarily linked by category, so they can be migrated safely.
    menuProductIds: uniqueIds(plan?.menuProductIds ?? []),
    prices: basePlans.map((basePlan) => {
      const price = priceMap.get(basePlan.id);
      return {
        basePlanId: basePlan.id,
        priceSar: halalaToRiyalInput(price?.priceHalala ?? 0) || "0",
        isActive: price?.isActive ?? true,
      };
    }),
  };
}

export function ensurePriceRows(
  rows: PriceRowState[],
  basePlans: BasePlanPickerItem[]
) {
  const rowMap = new Map(rows.map((row) => [row.basePlanId, row]));

  return basePlans.map((basePlan) => ({
    basePlanId: basePlan.id,
    priceSar: rowMap.get(basePlan.id)?.priceSar ?? "0",
    isActive: rowMap.get(basePlan.id)?.isActive ?? true,
  }));
}

export function upsertPriceRow(
  rows: PriceRowState[],
  basePlanId: string,
  patch: Partial<Pick<PriceRowState, "priceSar" | "isActive">>
) {
  const exists = rows.some((row) => row.basePlanId === basePlanId);

  if (!exists) {
    return [
      ...rows,
      {
        basePlanId,
        priceSar: patch.priceSar ?? "0",
        isActive: patch.isActive ?? true,
      },
    ];
  }

  return rows.map((row) =>
    row.basePlanId === basePlanId ? { ...row, ...patch } : row
  );
}

export function validateAndBuildPayload(
  form: PlanFormState,
  basePlans: BasePlanPickerItem[]
): PlanFormValidationResult {
  const nameAr = form.nameAr.trim();
  const nameEn = form.nameEn.trim();
  const category = form.category.trim();
  const maxPerDay = Number(form.maxPerDay);
  const menuProductIds = uniqueIds(form.menuProductIds);
  const prices = ensurePriceRows(form.prices, basePlans);

  if (!nameAr) return { ok: false, message: "الاسم العربي مطلوب." };
  if (!nameEn) return { ok: false, message: "الاسم الإنجليزي مطلوب." };
  if (!category) return { ok: false, message: "التصنيف مطلوب." };
  if (!Number.isFinite(maxPerDay) || maxPerDay < 1) {
    return { ok: false, message: "الحد اليومي يجب أن يكون رقما لا يقل عن 1." };
  }
  if (menuProductIds.length === 0) {
    return { ok: false, message: "اختر منتجا واحدا على الأقل من المنيو." };
  }
  if (prices.length === 0) {
    return { ok: false, message: "يجب إضافة سعر واحد على الأقل." };
  }

  const priceRows = prices.map((price) => ({
    ...price,
    priceHalala: riyalToHalala(price.priceSar),
  }));

  if (
    priceRows.some(
      (price) =>
        !Number.isInteger(price.priceHalala) || price.priceHalala < 0
    )
  ) {
    return {
      ok: false,
      message: "كل الأسعار يجب أن تكون قيما صحيحة وغير سالبة بالريال.",
    };
  }

  return {
    ok: true,
    payload: {
      name: { ar: nameAr, en: nameEn },
      category,
      maxPerDay: Math.round(maxPerDay),
      isActive: form.isActive,
      menuProductIds,
      // Clear the temporary category-linking field so explicit product links are
      // the canonical source after create/update.
      menuCategoryKeys: [],
      planPrices: priceRows.map((price) => ({
        basePlanId: price.basePlanId,
        priceHalala: price.priceHalala,
        isActive: price.isActive,
      })),
    },
  };
}

export function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

export function localizedName(
  value?: LocalizedName | string | null
) {
  if (typeof value === "string") return value || "-";
  return value?.ar || value?.en || "-";
}

export function addonId(addon: Addon) {
  return addon.id || addon._id;
}
