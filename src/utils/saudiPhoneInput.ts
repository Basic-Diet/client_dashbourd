const SAUDI_COUNTRY_CODE = "+966";
const MIN_SUBSCRIBER_DIGITS = 9;
const MAX_E164_DIGITS = 15;

export function sanitizeSaudiPhoneInput(value: string): string {
  const raw = String(value ?? "");
  const startsWithPlus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, MAX_E164_DIGITS);

  if (!digits) return startsWithPlus ? "+" : "";
  return `${startsWithPlus ? "+" : ""}${digits}`;
}

export const normalizeSaudiPhoneInput = sanitizeSaudiPhoneInput;

export function normalizeSaudiPhoneForSubmit(value: string): string {
  const compact = String(value ?? "").replace(/[\s()-]/g, "");
  if (/^00966\d+$/.test(compact)) return `+${compact.slice(2)}`;
  if (/^966\d+$/.test(compact)) return `+${compact}`;
  if (/^0\d{9,12}$/.test(compact)) return `${SAUDI_COUNTRY_CODE}${compact.slice(1)}`;
  return compact;
}

export function isCompleteSaudiPhone(value: string): boolean {
  const normalized = normalizeSaudiPhoneForSubmit(value);
  return /^\+966\d{9,12}$/.test(normalized);
}

export const isCompleteSaudiMobile = isCompleteSaudiPhone;

export { SAUDI_COUNTRY_CODE, MIN_SUBSCRIBER_DIGITS };