/**
 * `businessDate` date arithmetic for Archive Detail's prev/next navigation
 * (README §7-3: "인접 날짜 이동은 날짜 산술이다"). `businessDate` is a plain
 * `YYYY-MM-DD` calendar date (no time component), so UTC-based arithmetic on
 * the parsed y/m/d triplet is timezone-safe — there's no wall-clock/instant
 * ambiguity to worry about the way there is for `generatedAt` timestamps.
 */

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

/**
 * "오늘"을 KST 기준으로 계산한다 — `businessDate`는 KST 기준 날짜(README §13)
 * 이므로, Archive Detail의 "다음 날짜" 버튼을 미래에서 비활성화하려면 호스트
 * 런타임의 로컬 타임존이 아니라 KST 기준 오늘을 기준으로 비교해야 한다.
 */
export function getTodayBusinessDateKst(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? '01';

  return `${part('year')}-${part('month')}-${part('day')}`;
}
