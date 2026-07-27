const SAUDI_COUNTRY_CODE = "+966";
const SAUDI_SUBSCRIBER_DIGITS = 9;

export function normalizeSaudiPhoneInput(value: string): string {
  const raw = String(value ?? "");
  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("00966")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("966")) {
    digits = digits.slice(3);
  } else if (digits.length <= 3 && "966".startsWith(digits)) {
    digits = "";
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("966")) {
    digits = digits.slice(3);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return `${SAUDI_COUNTRY_CODE}${digits.slice(0, SAUDI_SUBSCRIBER_DIGITS)}`;
}

export function isCompleteSaudiMobile(value: string): boolean {
  return /^\+9665\d{8}$/.test(normalizeSaudiPhoneInput(value));
}

export { SAUDI_COUNTRY_CODE };
