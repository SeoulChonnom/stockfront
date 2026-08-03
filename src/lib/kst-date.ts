/**
 * Shared KST (Asia/Seoul) date helpers.
 *
 * This backend/UI pair is KST-only, but `new Date().toISOString()` and
 * `new Date(value)` both read/parse relative to UTC or the host runtime's
 * own local timezone — never Korea's. Two different, both-correct
 * techniques are used below for two different jobs:
 *
 * - `getKstNow`/`getTodayIso`/`getRelativeIso` shift the current instant by
 *   a fixed +9h offset before reading its UTC calendar fields. This is
 *   correct for Korea specifically (KST never observes DST), and matches
 *   the technique historically duplicated across `app-state.ts` and
 *   `archive-search/filter-copy.ts`.
 * - `parseKstAwareDate` builds the epoch as if a naive (no offset/`Z`)
 *   timestamp's digits were UTC, then subtracts the KST offset — the
 *   correct way to turn a literal KST wall-clock string into an absolute
 *   instant, independent of the host runtime's own timezone.
 * - `getTodayBusinessDateKst` uses `Intl.DateTimeFormat` with an explicit
 *   `timeZone: 'Asia/Seoul'`, which remains correct even if the offset
 *   rule ever changed — the only one of these techniques that does not
 *   hardcode +9h.
 */

const KST_TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Matches a trailing `Z` or explicit `+HH:MM`/`-HH:MM` (or `+HHMM`) offset.
const OFFSET_SUFFIX_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/;
const NAIVE_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Returns the current instant shifted by the fixed KST offset, so reading
 * its UTC calendar/clock fields yields KST wall-clock values regardless of
 * the host runtime's own timezone. `now` is injectable for tests.
 */
export function getKstNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + KST_OFFSET_MS);
}

/**
 * Today's date (KST) as `YYYY-MM-DD`.
 *
 * D6 (parity cycle 2): `new Date().toISOString()` reads the UTC calendar
 * date. Between 00:00 and 09:00 KST that is still YESTERDAY in UTC, so a
 * naive implementation shifts every default from/to range one day earlier
 * for roughly a third of the day, every day — a real user-facing bug, not
 * just a parity mismatch.
 */
export function getTodayIso(now: Date = new Date()): string {
  return getKstNow(now).toISOString().slice(0, 10);
}

/** `days` days before today (KST) as `YYYY-MM-DD`. */
export function getRelativeIso(days: number, now: Date = new Date()): string {
  const date = getKstNow(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Parses a DTO timestamp into an absolute instant, honoring this backend's
 * datetime convention rather than assuming ISO-8601-with-UTC everywhere.
 *
 * Every timestamp in the real API contract (see
 * `docs/design_v2/handoff_v2/fixtures.js`, e.g. `NOW_KST = '2026-07-27T08:24:31'`
 * and every `generatedAt`/`publishedAt`/`startedAt` fixture) ships with NO
 * trailing `Z` or offset — it is a naive KST wall-clock string, not UTC.
 * Passing a naive string straight to `new Date(value)` parses it using the
 * *host runtime's local timezone*, which only happens to be correct when
 * that runtime is itself running in KST — silently wrong in CI, on a
 * non-KST dev machine, or in a browser outside Korea. So: a naive string is
 * read as literal KST wall-clock digits (converted to the matching absolute
 * instant); a string WITH an explicit offset/`Z` is a genuine absolute
 * instant and is parsed as such.
 */
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
  // Build the epoch as if these fields were UTC, then subtract the KST
  // offset — this yields the absolute instant whose Asia/Seoul wall clock
  // is exactly the digits we parsed, independent of the host's local zone.
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

/**
 * "오늘"을 KST 기준으로 계산한다 — `businessDate`는 KST 기준 날짜(README §13)
 * 이므로, Archive Detail의 "다음 날짜" 버튼을 미래에서 비활성화하려면 호스트
 * 런타임의 로컬 타임존이 아니라 KST 기준 오늘을 기준으로 비교해야 한다.
 */
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
