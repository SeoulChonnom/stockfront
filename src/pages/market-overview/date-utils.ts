/**
 * `businessDate` date arithmetic for Archive Detail's prev/next navigation
 * (README §7-3: "인접 날짜 이동은 날짜 산술이다"). `businessDate` is a plain
 * `YYYY-MM-DD` calendar date (no time component), so UTC-based arithmetic on
 * the parsed y/m/d triplet is timezone-safe — there's no wall-clock/instant
 * ambiguity to worry about the way there is for `generatedAt` timestamps.
 */

export { getTodayBusinessDateKst } from '@/lib/kst-date';

const DAY_MS = 24 * 60 * 60_000;

export function shiftBusinessDate(businessDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDate);

  if (!match) {
    return businessDate;
  }

  const [, year, month, day] = match;
  const shifted = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)) + days * DAY_MS
  );

  return shifted.toISOString().slice(0, 10);
}
