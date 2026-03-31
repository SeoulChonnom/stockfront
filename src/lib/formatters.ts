export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

export function formatTime(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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
  digits = 2,
) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numeric = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  const formatted = Math.abs(numeric).toLocaleString('en-US', {
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

  const numeric = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return numeric.toLocaleString('en-US', {
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

export function toStatusTone(value: string) {
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
