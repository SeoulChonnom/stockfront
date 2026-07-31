import { describe, expect, it, vi } from 'vitest';

import { getDefaultArchiveFilters, getStatusOptions } from './filter-copy';

describe('getDefaultArchiveFilters', () => {
  it('D6: defaults to the KST calendar date, not the UTC one, in the early-KST-morning boundary window', () => {
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
  it('exposes the 전체/READY/PARTIAL/FAILED options', () => {
    expect(getStatusOptions().map((option) => option.value)).toEqual([
      '',
      'READY',
      'PARTIAL',
      'FAILED',
    ]);
  });
});
