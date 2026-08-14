import { describe, expect, it, vi } from 'vitest';

import {
  getDefaultArchiveFilters,
  getStatusOptions,
  validateArchiveFilters,
} from './filter-copy';

describe('getDefaultArchiveFilters', () => {
  it('defaults to the KST calendar date, not the UTC one, in the early-KST-morning boundary window', () => {
    // 2026-07-27T00:30 KST == 2026-07-26T15:30:00Z — see the matching test
    // and comment in `src/lib/app-state.test.ts`. This file duplicates
    // `app-state.ts`'s date-default helpers on purpose (its own header
    // comment explains why); both must default to the exact same range.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T15:30:00Z'));

    try {
      expect(getDefaultArchiveFilters()).toEqual({
        from: '2026-07-13',
        to: '2026-07-27',
        status: '',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getStatusOptions', () => {
  it('exposes only the public 전체/READY/PARTIAL options', () => {
    expect(getStatusOptions().map((option) => option.value)).toEqual([
      '',
      'READY',
      'PARTIAL',
    ]);
    expect(getStatusOptions().map((option) => option.label)).not.toContain(
      'FAILED · 생성 실패'
    );
  });
});

describe('validateArchiveFilters', () => {
  it('accepts a valid leap day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01T00:00:00+09:00'));

    try {
      expect(
        validateArchiveFilters({
          from: '2024-02-29',
          to: '2024-02-29',
          status: '',
        })
      ).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a date with an impossible calendar day as a format error', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01T00:00:00+09:00'));

    try {
      expect(
        validateArchiveFilters({
          from: '2024-02-30',
          to: '2024-03-01',
          status: '',
        })
      ).toEqual({
        from: '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해 주세요.',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
