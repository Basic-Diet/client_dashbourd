import api from "@/lib/apis";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type {
  BuilderPremiumMealCatalogItem,
  BuilderPremiumMealsResponse,
  DashboardQuoteLineItem,
  DashboardSelectionSection,
  DashboardSubscriptionCashCreatePayload,
  DashboardSubscriptionCreateResponse,
  DashboardSubscriptionQuoteResponse,
  DashboardSubscriptionSelectionPayload,
  SubscriptionAddonPlanCatalogItem,
} from "@/types/subscriptionCreationTypes";

type ApiRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): ApiRecord => (isRecord(value) ? value : {});

const readString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : "";

const readNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBoolean = (value: unknown, fallback = true) =>
  typeof value === "boolean" ? value : fallback;

const extractRows = (payload: unknown, preferredKey: string) => {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (Array.isArray(root.data)) return root.data;
  const data = asRecord(root.data);
  if (Array.isArray(data[preferredKey])) return data[preferredKey] as unknown[];
  if (Array.isArray(data.items)) return data.items as unknown[];
  if (Array.isArray(data.rows)) return data.rows as unknown[];
  if (Array.isArray(data.plans)) return data.plans as unknown[];
  return [];
};

export function formatHalalaAsSar(amountHalala: number, currency = "SAR") {
  const amount = Number(amountHalala || 0) / 100;
  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${formatted} ${currency}`;
}

export function buildDashboardSubscriptionSelectionPayload(
  data: CreateSubscriptionSchemaType
): DashboardSubscriptionSelectionPayload {
  const isDelivery = data.delivery.type === "delivery";
  const deliveryWindow = data.delivery.slot?.window?.trim();
  const premiumItems = data.premiumItems
    .filter((item) => item.premiumKey && Number.isInteger(item.qty) && item.qty > 0)
    .map((item) => ({ premiumKey: item.premiumKey, qty: item.qty }));
  const addons = data.addons
    .filter((addon) => addon.addonId && Number.isInteger(addon.qty) && addon.qty > 0)
    .map((addon) => ({ addonId: addon.addonId, qty: addon.qty }));

  return {
    userId: data.userId,
    planId: data.planId,
    grams: data.grams,
    mealsPerDay: data.mealsPerDay,
    startDate: data.startDate,
    delivery: isDelivery
      ? {
          type: "delivery",
          zoneId: data.delivery.zoneId,
          ...(deliveryWindow ? { window: deliveryWindow } : {}),
          address: {
            label: data.delivery.address.label,
            line1: data.delivery.address.line1,
            ...(data.delivery.address.line2?.trim()
              ? { line2: data.delivery.address.line2.trim() }
              : {}),
            city: data.delivery.address.city,
            district: data.delivery.address.district,
            ...(data.delivery.address.phone?.trim()
              ? { phone: data.delivery.address.phone.trim() }
              : {}),
            ...(data.delivery.address.notes?.trim()
              ? { notes: data.delivery.address.notes.trim() }
              : {}),
          },
        }
      : {
          type: "pickup",
          pickupLocationId: data.delivery.pickupLocationId || "",
        },
    ...(premiumItems.length ? { premiumItems } : {}),
    ...(addons.length ? { addons } : {}),
    ...(data.promoCode?.trim() ? { promoCode: data.promoCode.trim() } : {}),
  };
}

export function isCollectedAmountMismatchError(error: unknown) {
  const root = asRecord(error);
  const response = asRecord(root.response);
  const data = asRecord(response.data);
  const nestedError = asRecord(data.error);
  const code = (
    readString(nestedError.code) ||
    readString(data.code) ||
    readString(data.errorCode) ||
    readString(data.reason)
  ).toUpperCase();
  const message = [
    nestedError.message,
    nestedError.messageAr,
    data.message,
    data.messageAr,
    data.error,
  ]
    .map(readString)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    code === "COLLECTED_AMOUNT_MISMATCH" ||
    code === "QUOTE_TOTAL_MISMATCH" ||
    code === "PAYMENT_AMOUNT_MISMATCH" ||
    message.includes("collected amount does not match quote total") ||
    (message.includes("المبلغ") &&
      message.includes("لا يطابق") &&
      message.includes("عرض السعر")) ||
    (message.includes("Ø§Ù„Ù…Ø¨Ù„Øº") &&
      message.includes("Ù„Ø§ ÙŠØ·Ø§Ø¨Ù‚") &&
      message.includes("Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¹Ø±"))
  );
}

export function getQuotePricingTotalHalala(
  quote: DashboardSubscriptionQuoteResponse
) {
  const mismatchResult = {
    ok: false as const,
    totalHalala: null,
    message: "إجمالي عرض السعر غير متطابق. راجع السعر مرة أخرى.",
  };
  const pricingTotal = quote.data.pricing?.totalHalala;
  const aliasTotal = quote.data.totalHalala;

  if (
    pricingTotal !== undefined &&
    aliasTotal !== undefined &&
    Number(pricingTotal) !== Number(aliasTotal)
  ) {
    return mismatchResult;
  }

  const totalHalala =
    pricingTotal !== undefined ? Number(pricingTotal) : Number(aliasTotal);

  if (!Number.isFinite(totalHalala)) {
    return {
      ok: false as const,
      totalHalala: null,
      message: "تعذر قراءة إجمالي عرض السعر من الخادم.",
    };
  }

  const totalLineItem = resolveQuoteLineItems(quote).find(isTotalQuoteLineItem);
  const lineTotal = totalLineItem
    ? getQuoteLineItemAmount(totalLineItem)
    : undefined;
  if (
    lineTotal !== undefined &&
    Number.isFinite(lineTotal) &&
    Number(lineTotal) !== totalHalala
  ) {
    return mismatchResult;
  }

  return { ok: true as const, totalHalala };
}

export function buildCashCreatePayload({
  quotedSelection,
  quote,
  paidAt = new Date().toISOString(),
}: {
  quotedSelection: DashboardSubscriptionSelectionPayload;
  quote: DashboardSubscriptionQuoteResponse;
  paidAt?: string;
}): DashboardSubscriptionCashCreatePayload {
  const total = getQuotePricingTotalHalala(quote);
  if (!total.ok) {
    throw new Error(total.message);
  }

  return {
    ...quotedSelection,
    payment: {
      method: "cash",
      status: "paid",
      collectedAmountHalala: total.totalHalala,
      paidAt,
    },
    source: "dashboard_cashier",
  };
}

export function resolveQuoteLineItems(
  quote: DashboardSubscriptionQuoteResponse
): DashboardQuoteLineItem[] {
  const direct = quote.data.lineItems;
  if (Array.isArray(direct) && direct.length > 0) return direct;
  const pricingItems = quote.data.pricing?.lineItems;
  if (Array.isArray(pricingItems) && pricingItems.length > 0) return pricingItems;

  const summary = asRecord(quote.data.pricingSummary);
  const breakdown = asRecord(quote.data.breakdown);
  const currency =
    readString(quote.data.pricing?.currency) ||
    readString(quote.data.currency) ||
    readString(summary.currency) ||
    readString(breakdown.currency) ||
    "SAR";

  const rows: DashboardQuoteLineItem[] = [];
  const push = (key: string, label: string, amount: unknown) => {
    if (amount === undefined || amount === null || amount === "") return;
    rows.push({ key, label, amountHalala: readNumber(amount), currency });
  };

  push(
    "subscription",
    "سعر الاشتراك",
    quote.data.pricing?.subscriptionPriceHalala ??
      quote.data.pricing?.basePlanPriceHalala ??
      summary.basePlanGrossHalala ??
      breakdown.basePlanGrossHalala ??
      quote.data.subscriptionPriceHalala
  );
  push(
    "premium",
    "الوجبات المميزة",
    quote.data.pricing?.premiumTotalHalala ?? summary.premiumTotalHalala ?? breakdown.premiumTotalHalala
  );
  push(
    "addons",
    "الإضافات",
    quote.data.pricing?.addonsTotalHalala ?? summary.addonsTotalHalala ?? breakdown.addonsTotalHalala
  );
  push(
    "delivery",
    "رسوم التوصيل",
    quote.data.pricing?.deliveryFeeHalala ?? summary.deliveryFeeHalala ?? breakdown.deliveryFeeHalala
  );
  push(
    "discount",
    "الخصم",
    quote.data.pricing?.discountHalala ?? summary.discountHalala ?? breakdown.discountHalala
  );
  push(
    "vat",
    `ضريبة القيمة المضافة${
      quote.data.pricing?.vatPercentage ?? summary.vatPercentage ?? breakdown.vatPercentage
        ? ` (${quote.data.pricing?.vatPercentage ?? summary.vatPercentage ?? breakdown.vatPercentage}%)`
        : ""
    }`,
    quote.data.pricing?.vatHalala ?? summary.vatHalala ?? breakdown.vatHalala
  );

  return rows;
}

export function getQuoteLineItemIdentity(item: DashboardQuoteLineItem) {
  return (
    readString(item.kind) ||
    readString(item.type) ||
    readString(item.key) ||
    readString(item.code) ||
    readString(item.label)
  ).toLowerCase();
}

export function getQuoteLineItemAmount(item: DashboardQuoteLineItem) {
  const amount =
    item.amountHalala ??
    item.valueHalala ??
    item.totalHalala ??
    item.priceHalala;
  return amount === undefined || amount === null
    ? undefined
    : Number(amount);
}

export function isVatQuoteLineItem(item: DashboardQuoteLineItem) {
  const identity = getQuoteLineItemIdentity(item);
  return identity === "vat" || identity.includes("vat") || identity.includes("Ø¶Ø±ÙŠØ¨Ø©");
}

export function isTotalQuoteLineItem(item: DashboardQuoteLineItem) {
  const identity = getQuoteLineItemIdentity(item);
  return (
    identity === "total" ||
    identity === "grand_total" ||
    identity === "final_total" ||
    identity.includes("total") ||
    identity.includes("Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ")
  );
}

export function getLocalizedLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  return (
    readString(record.ar) ||
    readString(record.en) ||
    readString(record.label) ||
    readString(record.name) ||
    readString(record.title)
  );
}

export function resolveQuoteSections(
  quote: DashboardSubscriptionQuoteResponse
): DashboardSelectionSection[] {
  if (Array.isArray(quote.data.selectionSections) && quote.data.selectionSections.length) {
    return quote.data.selectionSections;
  }
  if (
    Array.isArray(quote.data.checkoutSummary?.selectionSections) &&
    quote.data.checkoutSummary.selectionSections.length
  ) {
    return quote.data.checkoutSummary.selectionSections;
  }

  const groups = quote.data.selectionGroups;
  if (groups) {
    return [
      groups.subscriptionMeals,
      groups.premiumMeals,
      groups.addonSubscriptions,
    ].filter((section): section is DashboardSelectionSection => Boolean(section));
  }

  const selected = asRecord(quote.data.selectedOptions);
  const sections: DashboardSelectionSection[] = [
    {
      key: "subscription_meals",
      title: "وجبات الاشتراك",
      items: [
        { label: "الجرامات", value: readNumber(selected.grams) },
        { label: "عدد الوجبات يومياً", value: readNumber(selected.mealsPerDay) },
      ],
    },
  ];

  if (quote.data.premiumItems.length) {
    sections.push({
      key: "premium_meals",
      title: "الوجبات المميزة",
      items: quote.data.premiumItems.map((item) => {
        const row = asRecord(item);
        return {
          label: readString(row.name) || readString(row.premiumKey),
          qty: readNumber(row.qty),
          totalHalala: readNumber(row.totalHalala),
          currency: readString(row.currency) || "SAR",
        };
      }),
    });
  }

  if (quote.data.addonPlans.length) {
    sections.push({
      key: "addon_subscriptions",
      title: "إضافات الاشتراك",
      items: quote.data.addonPlans.map((item) => {
        const row = asRecord(item);
        return {
          label: readString(row.name) || readString(row.addonId),
          qty: readNumber(row.quantityPerDay ?? row.qty),
          totalHalala: readNumber(row.totalHalala ?? row.priceHalala),
          currency: readString(row.currency) || "SAR",
        };
      }),
    });
  }

  return sections;
}

export async function quoteDashboardSubscription(
  payload: DashboardSubscriptionSelectionPayload
): Promise<DashboardSubscriptionQuoteResponse> {
  const response = await api.post("/api/dashboard/subscriptions/quote", payload, {
    suppressGlobalForbiddenToast: true,
  });
  return response.data;
}

export async function createDashboardSubscription(
  payload: DashboardSubscriptionCashCreatePayload
): Promise<DashboardSubscriptionCreateResponse> {
  const response = await api.post("/api/dashboard/subscriptions", payload, {
    suppressGlobalForbiddenToast: true,
  });
  return response.data;
}

export async function fetchDashboardBuilderPremiumMeals(): Promise<BuilderPremiumMealsResponse> {
  const response = await api.get("/api/dashboard/builder-premium-meals");
  const rows = extractRows(response.data, "items");
  const seen = new Set<string>();
  const data = rows
    .map((row): BuilderPremiumMealCatalogItem | null => {
      const item = asRecord(row);
      const id = readString(item.id) || readString(item._id);
      const premiumKey = readString(item.premiumKey) || readString(item.key);
      if (!id || !premiumKey || seen.has(premiumKey)) return null;
      seen.add(premiumKey);
      return {
        id,
        premiumKey,
        name: (item.name as BuilderPremiumMealCatalogItem["name"]) || premiumKey,
        imageUrl: readString(item.imageUrl),
        extraFeeHalala: readNumber(item.extraFeeHalala),
        isActive: readBoolean(item.isActive),
      };
    })
    .filter((item): item is BuilderPremiumMealCatalogItem => item !== null);

  return { status: asRecord(response.data).status !== false, data };
}

export async function fetchDashboardAddonPlans(): Promise<{
  status: boolean;
  data: SubscriptionAddonPlanCatalogItem[];
}> {
  const response = await api.get("/api/dashboard/addon-plans");
  const data = extractRows(response.data, "plans").map((row) => {
    const item = asRecord(row);
    return item as SubscriptionAddonPlanCatalogItem;
  });
  return { status: asRecord(response.data).status !== false, data };
}
