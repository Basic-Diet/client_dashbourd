export type PriceInput = string | number | null | undefined;

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));
}

/**
 * Normalizes a user-entered Riyal value before validation/conversion.
 * Supports Arabic digits and both `.` and Arabic decimal separators.
 */
export function normalizeRiyalInput(value: PriceInput): string {
  if (value === null || value === undefined) return "";

  return normalizeDigits(String(value))
    .trim()
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");
}

/**
 * Converts a Riyal input to an integer Halala value for API payloads.
 * Returns NaN for an empty or invalid input so form validation can reject it.
 */
export function riyalToHalala(value: PriceInput): number {
  const normalized = normalizeRiyalInput(value);
  if (!normalized) return Number.NaN;

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return Number.NaN;

  return Math.round((amount + Number.EPSILON) * 100);
}

/** Converts an optional Riyal input to Halala without inventing a zero value. */
export function optionalRiyalToHalala(
  value: PriceInput
): number | undefined {
  const normalized = normalizeRiyalInput(value);
  return normalized ? riyalToHalala(normalized) : undefined;
}

/** Converts an integer Halala value returned by the API to Riyals. */
export function halalaToRiyal(value: PriceInput): number {
  if (value === null || value === undefined || value === "") return 0;

  const amount = Number(value);
  return Number.isFinite(amount) ? amount / 100 : 0;
}

/** Converts Halala to a clean string suitable for a Riyal input field. */
export function halalaToRiyalInput(value: PriceInput): string {
  if (value === null || value === undefined || value === "") return "";

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";

  return String(amount / 100);
}

/** Shared validation helper for non-negative Riyal form values. */
export function isValidRiyalInput(value: PriceInput): boolean {
  const halala = riyalToHalala(value);
  return Number.isInteger(halala) && halala >= 0;
}
