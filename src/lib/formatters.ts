const KST_TIME_ZONE = 'Asia/Seoul';
const KST_OFFSET_MS = 9 * 60 * 60_000;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Matches a trailing `Z` or explicit `+HH:MM`/`-HH:MM` (or `+HHMM`) offset.
const OFFSET_SUFFIX_REGEX = /(?:Z|[+-]\d{2}:?\d{2})$/;
const NAIVE_DATETIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

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
function parseKstAwareDate(value: unknown): Date | null {
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
 * Formats a DTO timestamp as an absolute KST wall-clock string:
 * "YYYY-MM-DD HH:mm KST". See `parseKstAwareDate` for how naive
 * (no-offset) vs. offset-qualified inputs are interpreted; the result is
 * independent of the host runtime's local timezone either way.
 *
 * Returns `null` (not the `'-'` sentinel used by the legacy
 * `formatDateTime`/`formatTime`) for missing or unparseable input, so that
 * callers building view models can distinguish "no value" from "formatted
 * text" and choose their own empty-state copy.
 */
export function formatKstDateTime(value: unknown): string | null {
  const date = parseKstAwareDate(value);

  if (date === null) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? '00';

  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')} KST`;
}

/**
 * Formats a DTO timestamp as a Korean relative-freshness string, e.g.
 * "2시간 12분 전". Intended as a secondary annotation next to the absolute
 * KST display (see `formatKstDateTime`), never as the primary value.
 *
 * Uses the same `parseKstAwareDate` interpretation as `formatKstDateTime` —
 * a naive (no-offset) `value` is read as KST wall-clock digits, not
 * host-local time — so the computed "N시간 M분 전" duration is correct
 * regardless of the host runtime's timezone.
 *
 * `now` is injectable so callers (and tests) can pin the reference instant
 * instead of relying on the wall clock at call time. Returns `null` for
 * missing/unparseable input, matching `formatKstDateTime`'s convention for
 * this pair of new formatters.
 */
export function formatRelativeFreshness(
  value: unknown,
  now: Date = new Date()
): string | null {
  const date = parseKstAwareDate(value);

  if (date === null) {
    return null;
  }

  const diffMs = Math.max(0, now.getTime() - date.getTime());

  if (diffMs < MINUTE_MS) {
    return '방금 전';
  }

  const days = Math.floor(diffMs / DAY_MS);

  if (days > 0) {
    return `${days}일 전`;
  }

  const hours = Math.floor(diffMs / HOUR_MS);
  const minutes = Math.floor((diffMs % HOUR_MS) / MINUTE_MS);

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분 전` : `${hours}시간 전`;
  }

  return `${minutes}분 전`;
}

/**
 * Formats an integer count with `ko-KR` thousands separators (e.g. counts,
 * pageId/jobId display). Non-numeric/non-finite input falls back to the
 * `'-'` sentinel, consistent with the other numeric formatters below.
 */
export function formatInteger(value: unknown): string {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return '-';
  }

  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return Math.trunc(numeric).toLocaleString('ko-KR');
}

export function formatDateTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatTime(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatSignedNumber(
  value: string | number | null | undefined,
  digits = 2
) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return '-';
  }

  const numeric = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return typeof value === 'string' ? value : '-';
  }

  const formatted = Math.abs(numeric).toLocaleString('ko-KR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  if (numeric > 0) {
    return `+${formatted}`;
  }

  if (numeric < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function formatPercent(value: string | number | null | undefined) {
  const formatted = formatSignedNumber(value, 2);
  return formatted === '-' ? formatted : `${formatted}%`;
}

export function formatNumericText(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return '-';
  }

  const numeric = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return typeof value === 'string' ? value : '-';
  }

  return numeric.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDurationSeconds(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-';
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function toStatusTone(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return 'failed';
  }

  const normalized = value.toLowerCase();

  if (normalized === 'success') {
    return 'success';
  }

  if (normalized === 'ready') {
    return 'ready';
  }

  if (normalized === 'partial') {
    return 'partial';
  }

  return 'failed';
}
