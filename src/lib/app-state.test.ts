import { describe, expect, it, vi } from 'vitest';
import type { ThemeNodeResponse } from './api/types';
import {
  parseListFilters,
  parseRoute,
  pruneThemeCodesToCatalog,
} from './app-state';

describe('parseListFilters', () => {
  it('parses valid search params into list filters', () => {
    const searchParams = new URLSearchParams({
      from: '2026-03-01',
      to: '2026-03-14',
      status: 'FAILED',
      page: '3',
    });

    expect(parseListFilters(searchParams)).toEqual({
      from: '2026-03-01',
      to: '2026-03-14',
      status: 'FAILED',
      market: '',
      themes: [],
      q: '',
      page: 3,
    });
  });

  it('normalizes reversed valid date ranges before returning filters', () => {
    const searchParams = new URLSearchParams({
      from: '2026-03-14',
      to: '2026-03-01',
      status: 'READY',
      page: '2',
    });

    expect(parseListFilters(searchParams)).toEqual({
      from: '2026-03-01',
      to: '2026-03-14',
      status: 'READY',
      market: '',
      themes: [],
      q: '',
      page: 2,
    });
  });

  it('falls back for invalid dates and page values', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T00:00:00Z'));

    try {
      const searchParams = new URLSearchParams({
        from: 'bad-date',
        to: 'still-bad',
        page: '0',
      });

      expect(parseListFilters(searchParams)).toEqual({
        from: '2026-04-08',
        to: '2026-04-22',
        status: '',
        market: '',
        themes: [],
        q: '',
        page: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back for dates with valid shape but impossible calendar days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T00:00:00Z'));

    try {
      expect(
        parseListFilters(
          new URLSearchParams({
            from: '2026-02-30',
            to: '2026-03-01',
          })
        )
      ).toEqual({
        from: '2026-03-01',
        to: '2026-04-08',
        status: '',
        market: '',
        themes: [],
        q: '',
        page: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('defaults to the KST calendar date, not the UTC one, in the early-KST-morning boundary window', () => {
    // 2026-07-27T00:30 KST == 2026-07-26T15:30:00Z — a naive
    // `new Date().toISOString()` reads the UTC date and would default `to`
    // to 2026-07-26 (yesterday in Korea) for this entire 00:00–09:00 KST
    // window, every day. The default range must be anchored on 2026-07-27.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T15:30:00Z'));

    try {
      expect(parseListFilters(new URLSearchParams())).toEqual({
        from: '2026-07-13',
        to: '2026-07-27',
        status: '',
        market: '',
        themes: [],
        q: '',
        page: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('normalizes invalid page values to the first page', () => {
    for (const page of ['-1', '2.5', 'Infinity', 'NaN']) {
      expect(parseListFilters(new URLSearchParams({ page })).page).toBe(1);
    }
  });

  it('removes statuses outside the route allowlist', () => {
    const allowedStatuses = ['READY', 'PARTIAL'];

    expect(
      parseListFilters(new URLSearchParams({ status: 'READY' }), {
        allowedStatuses,
      }).status
    ).toBe('READY');
    expect(
      parseListFilters(new URLSearchParams({ status: 'SUCCESS' }), {
        allowedStatuses,
      }).status
    ).toBe('');
    expect(
      parseListFilters(new URLSearchParams({ status: 'FAILED' }), {
        allowedStatuses,
      }).status
    ).toBe('');
  });

  it('parses archive market, repeated themes, and q while deduplicating themes in URL order', () => {
    const searchParams = new URLSearchParams(
      'market=KR&theme=SECTOR&theme=MARKET_FLOW_INVESTOR&theme=SECTOR&q=%EC%99%B8%EA%B5%AD%EC%9D%B8+%EB%A7%A4%EC%88%98&page=4'
    );

    expect(parseListFilters(searchParams)).toMatchObject({
      market: 'KR',
      themes: ['SECTOR', 'MARKET_FLOW_INVESTOR'],
      q: '외국인 매수',
      page: 4,
    });
  });

  it('caps parsed theme selections at ten and ignores invalid market values', () => {
    const searchParams = new URLSearchParams();
    searchParams.set('market', 'JP');
    for (let index = 0; index < 12; index += 1) {
      searchParams.append('theme', `THEME_${index}`);
    }

    expect(parseListFilters(searchParams)).toMatchObject({
      market: '',
      themes: Array.from({ length: 10 }, (_, index) => `THEME_${index}`),
    });
  });

  it('prunes unknown theme codes only against the loaded recursive catalog and preserves selected order', () => {
    const catalog = [
      {
        code: 'SECTOR',
        label: '업종',
        description: '산업',
        children: [
          {
            code: 'SECTOR_SEMICONDUCTORS',
            label: '반도체',
            description: '반도체 산업',
            children: [],
          },
        ],
      },
    ] satisfies ThemeNodeResponse[];

    expect(
      pruneThemeCodesToCatalog(
        ['UNKNOWN', 'SECTOR_SEMICONDUCTORS', 'SECTOR', 'UNKNOWN'],
        catalog
      )
    ).toEqual(['SECTOR_SEMICONDUCTORS', 'SECTOR']);
  });
});

describe('parseRoute', () => {
  it('maps known paths to stable route objects', () => {
    expect(parseRoute('/')).toEqual({ page: 'latest' });
    expect(parseRoute('/market/latest')).toEqual({ page: 'latest' });
    expect(parseRoute('/market/archive/search')).toEqual({
      page: 'archive-search',
    });
    expect(parseRoute('/market/archive/2026-03-17')).toEqual({
      page: 'archive-market',
      businessDate: '2026-03-17',
      pageId: null,
    });
    expect(
      parseRoute(
        '/market/archive/2026-03-17',
        new URLSearchParams({ pageId: '42' })
      )
    ).toEqual({
      page: 'archive-market',
      businessDate: '2026-03-17',
      pageId: 42,
    });
    expect(
      parseRoute('/market/cluster/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    ).toEqual({
      page: 'cluster-detail',
      clusterId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
    expect(parseRoute('/ops/batches')).toEqual({ page: 'batch-ops' });
    expect(parseRoute('/something-else')).toEqual({ page: 'not-found' });
  });

  it('returns not-found for malformed archive and cluster detail paths', () => {
    expect(parseRoute('/market/archive/not-a-date')).toEqual({
      page: 'not-found',
    });
    expect(parseRoute('/market/cluster/not-a-uuid')).toEqual({
      page: 'not-found',
    });
  });

  it('returns not-found for archive paths with impossible calendar days', () => {
    expect(parseRoute('/market/archive/2026-02-30')).toEqual({
      page: 'not-found',
    });
  });

  it('keeps valid leap-day archive paths', () => {
    expect(parseRoute('/market/archive/2024-02-29')).toEqual({
      page: 'archive-market',
      businessDate: '2024-02-29',
      pageId: null,
    });
  });

  it('keeps valid archive routes and pageId parsing intact', () => {
    expect(
      parseRoute(
        '/market/archive/2026-03-17',
        new URLSearchParams({ pageId: 'not-a-page-id' })
      )
    ).toEqual({
      page: 'archive-market',
      businessDate: '2026-03-17',
      pageId: null,
    });
    expect(
      parseRoute('/market/cluster/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    ).toEqual({
      page: 'cluster-detail',
      clusterId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
  });
});
