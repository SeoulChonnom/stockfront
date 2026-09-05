import { describe, expect, it, vi } from 'vitest';

import {
  type ArchiveFilterDraft,
  getDefaultArchiveFilters,
  getMarketSummaryLabel,
  getStatusOptions,
  validateArchiveFilters,
} from '@/pages/archive-search/filter-copy';

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
        market: '',
        themes: [],
        q: '',
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

  it('labels carry no backend enum — only the Korean text `StatusBadge` also shows', () => {
    expect(getStatusOptions().map((option) => option.label)).toEqual([
      '전체 상태',
      '준비 완료',
      '부분 생성',
    ]);
  });
});

describe('getMarketSummaryLabel', () => {
  it('maps KR and US to their Korean names, with no market code in the label', () => {
    expect(getMarketSummaryLabel('KR')).toBe('한국');
    expect(getMarketSummaryLabel('US')).toBe('미국');
  });

  it('falls back to 전체 시장 for empty or unknown values', () => {
    expect(getMarketSummaryLabel('')).toBe('전체 시장');
    expect(getMarketSummaryLabel('EU')).toBe('전체 시장');
  });
});

describe('validateArchiveFilters', () => {
  const validDraft: ArchiveFilterDraft = {
    from: '2026-02-01',
    to: '2026-03-01',
    status: '',
    market: '',
    themes: [],
    q: '',
  };

  it('accepts a valid leap day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01T00:00:00+09:00'));

    try {
      expect(
        validateArchiveFilters({
          ...validDraft,
          from: '2024-02-29',
          to: '2024-02-29',
        })
      ).toEqual({});
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a date with an impossible calendar day by asking the user to pick one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01T00:00:00+09:00'));

    try {
      expect(
        validateArchiveFilters({
          ...validDraft,
          from: '2024-02-30',
          to: '2024-03-01',
        })
      ).toEqual({
        from: '기준일을 선택해 주세요.',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('provides the server-aligned keyword hints for short and over-tokenized queries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T00:00:00+09:00'));

    try {
      expect(
        validateArchiveFilters({
          from: '2026-02-01',
          to: '2026-03-01',
          status: '',
          market: '',
          themes: [],
          q: 'a',
        })
      ).toMatchObject({
        q: '검색어는 2자 이상 입력해 주세요.',
      });

      expect(
        validateArchiveFilters({
          from: '2026-02-01',
          to: '2026-03-01',
          status: '',
          market: '',
          themes: [],
          q: Array.from({ length: 11 }, (_, index) => `t${index}`).join(' '),
        })
      ).toMatchObject({
        q: '검색어는 최대 10개 단어까지 입력해 주세요.',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
