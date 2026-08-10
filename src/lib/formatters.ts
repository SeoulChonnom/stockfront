import { parseKstAwareDate } from './kst-date';

const KST_TIME_ZONE = 'Asia/Seoul';
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Formats an absolute KST timestamp; null indicates missing or unparseable input. */
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

/** Formats relative freshness from the same KST-aware instant; `now` is injectable. */
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

/** Korean duration used by batch summary and detail views. */
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

/** Korean duration for per-step `durationMs`, which can be well under a second. */
export function formatDurationMs(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return '-';
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  const minutes = Math.floor(value / MINUTE_MS);
  const seconds = (value % MINUTE_MS) / 1000;
  const formattedSeconds = seconds.toLocaleString('ko-KR', {
    maximumFractionDigits: 2,
  });

  return minutes > 0
    ? `${minutes}분 ${formattedSeconds}초`
    : `${formattedSeconds}초`;
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
