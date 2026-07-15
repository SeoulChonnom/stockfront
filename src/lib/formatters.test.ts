import { describe, expect, it } from 'vitest';

import {
  formatDateTime,
  formatNumericText,
  formatSignedNumber,
  formatTime,
} from './formatters';

describe('formatters', () => {
  it.each([
    { label: 'date time', formatter: formatDateTime },
    { label: 'time', formatter: formatTime },
  ])('falls back for non-string $label DTO values', ({ formatter }) => {
    expect(formatter({ iso: '2026-03-31T06:12:00Z' })).toBe('-');
  });

  it.each([
    { label: 'date time', formatter: formatDateTime },
    { label: 'time', formatter: formatTime },
  ])('falls back for invalid $label DTO strings', ({ formatter }) => {
    expect(formatter('not a real date')).toBe('-');
  });

  it.each([
    { label: 'signed number', formatter: formatSignedNumber },
    { label: 'numeric text', formatter: formatNumericText },
  ])('falls back for object $label DTO values', ({ formatter }) => {
    expect(formatter({ value: '16274.94' } as never)).toBe('-');
  });
});
