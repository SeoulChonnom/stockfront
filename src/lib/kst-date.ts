/** KST helpers avoid host-local parsing; naive DTO timestamps are literal Asia/Seoul wall time. */

const KST_TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

const OFFSET_SUFFIX_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/;
const NAIVE_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/** Validates an exact calendar date without Date's overflow normalization. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = ISO_DATE_REGEX.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= daysInMonth[month - 1];
}

/** Shifts an instant by KST's fixed offset; `now` is injectable for tests. */
function getKstNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + KST_OFFSET_MS);
}

/** Today's date in KST; using UTC directly would be a day behind before 09:00 KST. */
export function getTodayIso(now: Date = new Date()): string {
  return getKstNow(now).toISOString().slice(0, 10);
}

/** `days` days before today (KST) as `YYYY-MM-DD`. */
export function getRelativeIso(days: number, now: Date = new Date()): string {
  const date = getKstNow(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Parses naive DTO timestamps as KST wall time; offset-qualified values stay absolute. */
export function parseKstAwareDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (OFFSET_SUFFIX_REGEX.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = NAIVE_DATETIME_REGEX.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  // Treat parsed digits as KST regardless of the host timezone.
  const epochAsIfUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    second ? Number(second) : 0
  );
  const date = new Date(epochAsIfUtc - KST_OFFSET_MS);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Uses an explicit Asia/Seoul zone for business-date navigation. */
export function getTodayBusinessDateKst(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? '01';

  return `${part('year')}-${part('month')}-${part('day')}`;
}
