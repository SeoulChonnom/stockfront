import { describe, expect, it } from 'vitest';

import {
  formatDateTime,
  formatInteger,
  formatKstDateTime,
  formatNumericText,
  formatRelativeFreshness,
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

  it('formats signed numbers and percentages with ko-KR thousands separators', () => {
    expect(formatSignedNumber(1234.5)).toBe('+1,234.50');
    expect(formatNumericText(17862.23)).toBe('17,862.23');
  });

  describe('formatKstDateTime', () => {
    it('formats a UTC ISO timestamp as an absolute KST wall-clock string', () => {
      // 2026-07-27T06:12:10Z is 2026-07-27 15:12 in Asia/Seoul (UTC+9).
      expect(formatKstDateTime('2026-07-27T06:12:10Z')).toBe(
        '2026-07-27 15:12 KST'
      );
    });

    it('rolls the KST date forward across the UTC day boundary at midnight', () => {
      // 2026-07-27T15:00:00Z is 2026-07-28 00:00 in Asia/Seoul — the date
      // component must roll over, not stay on the UTC calendar day, and the
      // hour must read "00" rather than a wraparound "24".
      expect(formatKstDateTime('2026-07-27T15:00:00Z')).toBe(
        '2026-07-28 00:00 KST'
      );
    });

    it('reads a naive (no-offset) timestamp as literal KST wall-clock digits, independent of the host runtime timezone', () => {
      // Every timestamp in the real DTO contract (fixtures.js `NOW_KST`,
      // `generatedAt`, `publishedAt`, `startedAt`, ...) has no trailing Z or
      // offset and already represents KST wall-clock time. Naively passing
      // such a string to `new Date(value)` parses it using the *host
      // runtime's local timezone*, which would make this test's outcome
      // depend on `process.env.TZ` — run this file with
      // `TZ=America/New_York pnpm exec vitest run src/lib/formatters.test.ts`
      // to confirm the assertion below does not change.
      expect(formatKstDateTime('2026-07-27T06:12:10')).toBe(
        '2026-07-27 06:12 KST'
      );
    });

    it.each([null, undefined, 123, {}, '', 'not a real date'])(
      'returns null (not the "-" sentinel) for invalid/missing input (%p)',
      (value) => {
        expect(formatKstDateTime(value)).toBeNull();
      }
    );
  });

  describe('formatRelativeFreshness', () => {
    const now = new Date('2026-07-27T08:24:31Z');

    it('formats an hours+minutes-old timestamp as "N시간 M분 전"', () => {
      const twoHoursTwelveMinutesAgo = new Date(
        now.getTime() - (2 * 60 + 12) * 60_000
      ).toISOString();
      expect(formatRelativeFreshness(twoHoursTwelveMinutesAgo, now)).toBe(
        '2시간 12분 전'
      );
    });

    it('omits the minutes segment on an exact hour boundary', () => {
      const threeHoursAgo = new Date(
        now.getTime() - 3 * 60 * 60_000
      ).toISOString();
      expect(formatRelativeFreshness(threeHoursAgo, now)).toBe('3시간 전');
    });

    it('formats a sub-minute-old timestamp as "방금 전"', () => {
      const thirtySecondsAgo = new Date(now.getTime() - 30_000).toISOString();
      expect(formatRelativeFreshness(thirtySecondsAgo, now)).toBe('방금 전');
    });

    it('formats a multi-day-old timestamp as "N일 전"', () => {
      const threeDaysAgo = new Date(
        now.getTime() - 3 * 24 * 60 * 60_000
      ).toISOString();
      expect(formatRelativeFreshness(threeDaysAgo, now)).toBe('3일 전');
    });

    it('clamps a timestamp in the future (clock skew) to "방금 전" instead of a negative duration', () => {
      const oneMinuteInTheFuture = new Date(
        now.getTime() + 60_000
      ).toISOString();
      expect(formatRelativeFreshness(oneMinuteInTheFuture, now)).toBe(
        '방금 전'
      );
    });

    it('accepts an injected `now` so results are deterministic across test runs', () => {
      const fixedNow = new Date('2026-01-01T00:00:00Z');
      const oneHourBefore = new Date(
        fixedNow.getTime() - 60 * 60_000
      ).toISOString();
      expect(formatRelativeFreshness(oneHourBefore, fixedNow)).toBe('1시간 전');
    });

    it.each([null, undefined, 123, {}, '', 'not a real date'])(
      'returns null for invalid/missing input (%p)',
      (value) => {
        expect(formatRelativeFreshness(value, now)).toBeNull();
      }
    );
  });

  describe('formatInteger', () => {
    it('formats integers with ko-KR thousands separators', () => {
      expect(formatInteger(174)).toBe('174');
      expect(formatInteger(123456)).toBe('123,456');
    });

    it('truncates fractional input rather than rounding or throwing', () => {
      expect(formatInteger(114.9)).toBe('114');
    });

    it.each([null, undefined, Number.NaN, {}, 'not a number'])(
      'falls back to "-" for non-finite/non-numeric input (%p)',
      (value) => {
        expect(formatInteger(value)).toBe('-');
      }
    );
  });
});
