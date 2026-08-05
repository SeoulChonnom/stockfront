import { parseKstAwareDate } from './kst-date';

const KST_TIME_ZONE = 'Asia/Seoul';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

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

/**
 * 한국어 소요 시간 ("2분 32초" / "48초" / "-").
 *
 * design v2 레퍼런스(`Market Brief v2.dc.html`의 `dur()`, 1422-1426행)는
 * 목록 행의 소요(2113행)와 상세의 소요(2148행)를 모두 이 형식으로 그린다.
 * 위 `formatDurationSeconds`의 영문 형식("2m 32s")은 배치 화면에서 요약
 * 타일(한글)과 테이블(영문)이 서로 다른 단위를 쓰는 원인이었다.
 *
 * 원래 이 함수는 `src/pages/batch-operations/format-batch.ts`에 있었다 —
 * 그 파일의 주석대로 "`src/lib/**`가 당시 phase의 파일 소유권 밖"이었기
 * 때문이며, 기능적 이유는 아니었다. `src/lib/mappers/batch.ts`가 이 포맷을
 * 써야 하는데 `lib`가 `pages`를 import할 수는 없으므로 이리로 옮겼다.
 */
export function formatDurationKo(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return '-';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes <= 0) {
    return `${remainingSeconds}초`;
  }

  return remainingSeconds > 0
    ? `${minutes}분 ${remainingSeconds}초`
    : `${minutes}분`;
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
