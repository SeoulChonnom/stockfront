import { describe, expect, it, vi } from 'vitest';

import {
  type ArchiveFilterDraft,
  getArchiveRangePresets,
  getDefaultArchiveFilters,
  getMarketSummaryLabel,
  getStatusOptions,
  matchArchiveRangePreset,
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

describe('getArchiveRangePresets', () => {
  it('computes each documented range off the KST today value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:30:00Z'));

    try {
      expect(getArchiveRangePresets()).toEqual([
        { id: '7d', label: '지난 7일', from: '2026-07-20', to: '2026-07-27' },
        { id: '30d', label: '지난 30일', from: '2026-06-27', to: '2026-07-27' },
        { id: '90d', label: '지난 90일', from: '2026-04-28', to: '2026-07-27' },
        { id: 'ytd', label: '올해', from: '2026-01-01', to: '2026-07-27' },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  // KST 자정 부근(00:30 KST == 전날 15:30 UTC)에서 `new Date().getFullYear()`를
  // 썼다면 여기서 2026 대신 브라우저 로컬 연도가 나왔을 것이다 —
  // `getDefaultArchiveFilters`의 KST 경계 테스트와 같은 계약을 지킨다.
  it("derives 올해's year from getTodayIso(), not the host's local year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:30:00Z')); // 2026-01-01T09:30 KST

    try {
      const ytd = getArchiveRangePresets().find(
        (preset) => preset.id === 'ytd'
      );
      expect(ytd).toEqual({
        id: 'ytd',
        label: '올해',
        from: '2026-01-01',
        to: '2026-01-01',
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('matchArchiveRangePreset', () => {
  it('returns the matching preset id for an exact from/to match', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:30:00Z'));

    try {
      expect(
        matchArchiveRangePreset({ from: '2026-07-20', to: '2026-07-27' })
      ).toBe('7d');
      expect(
        matchArchiveRangePreset({ from: '2026-01-01', to: '2026-07-27' })
      ).toBe('ytd');
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns null for the default 14-day range, which matches no preset', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:30:00Z'));

    try {
      expect(
        matchArchiveRangePreset({ from: '2026-07-13', to: '2026-07-27' })
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns null for a partial match (same from, different to)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T00:30:00Z'));

    try {
      expect(
        matchArchiveRangePreset({ from: '2026-07-20', to: '2026-07-26' })
      ).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
