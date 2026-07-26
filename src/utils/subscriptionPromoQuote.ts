type ApiRecord = Record<string, unknown>;

export type AppliedPromoQuote = {
  code: string;
  discountHalala: number;
  grossTotalHalala: number;
  totalHalala: number;
  currency: string;
};

function asRecord(value: unknown): ApiRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ApiRecord)
    : null;
}

function firstNumber(...values: unknown[]) {
  return values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  );
}

function firstString(...values: unknown[]) {
  const value = values.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
  return value?.trim();
}

export function readAppliedPromoQuote(
  response: unknown,
  requestedCode: string
): AppliedPromoQuote | null {
  const root = asRecord(response);
  const data = asRecord(root?.data) ?? root;
  if (!data) return null;

  const breakdown = asRecord(data.breakdown);
  const pricing = asRecord(data.pricing);
  const checkoutPricing = asRecord(asRecord(data.checkoutSummary)?.pricing);
  const appliedPromo = asRecord(data.appliedPromo);
  const promoCode = asRecord(data.promoCode);
  const promo =
    appliedPromo ??
    promoCode ??
    (typeof data.appliedPromo === "string"
      ? { code: data.appliedPromo }
      : null) ??
    (typeof data.promoCode === "string" ? { code: data.promoCode } : null);
  if (!promo) return null;

  const discountHalala = firstNumber(
    breakdown?.discountHalala,
    pricing?.discountHalala,
    checkoutPricing?.discountHalala,
    appliedPromo?.discountAmountHalala,
    promoCode?.discountAmountHalala
  );
  const totalHalala = firstNumber(
    breakdown?.totalHalala,
    pricing?.totalHalala,
    checkoutPricing?.totalHalala,
    data.totalHalala
  );
  if (discountHalala === undefined || totalHalala === undefined) return null;

  const grossTotalHalala =
    firstNumber(
      breakdown?.grossTotalHalala,
      pricing?.grossTotalHalala,
      checkoutPricing?.grossTotalHalala
    ) ?? totalHalala + discountHalala;

  return {
    code:
      firstString(
        promo.code,
        promo.promoCode,
        promo.name,
        typeof data.appliedPromo === "string" ? data.appliedPromo : undefined,
        typeof data.promoCode === "string" ? data.promoCode : undefined,
        requestedCode
      ) ?? requestedCode,
    discountHalala,
    grossTotalHalala,
    totalHalala,
    currency:
      firstString(
        breakdown?.currency,
        pricing?.currency,
        checkoutPricing?.currency,
        data.currency
      ) ?? "SAR",
  };
}

export function shouldClearAppliedPromo(changedField: string | undefined) {
  return Boolean(changedField && changedField !== "paymentMethod");
}
