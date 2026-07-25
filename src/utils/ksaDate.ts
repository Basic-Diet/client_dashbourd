/** Matches backend `dateUtils.KSA_TIMEZONE` / `getTodayKSADate()`. */
export const KSA_TIMEZONE = "Asia/Riyadh";

/** Current calendar date in KSA as `YYYY-MM-DD` (required by dashboard accounting APIs). */
export function getTodayKSADate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KSA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current calendar month in KSA as `YYYY-MM` (required by monthly accounting APIs). */
export function getCurrentKSAMonth(now = new Date()): string {
  return getTodayKSADate(now).slice(0, 7);
}
