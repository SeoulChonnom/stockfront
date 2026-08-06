import { describe, expect, it, vi } from 'vitest';

import { parseListFilters, parseRoute } from './app-state';

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
        page: 1,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('D6: defaults to the KST calendar date, not the UTC one, in the early-KST-morning boundary window', () => {
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
    const allowedStatuses = ['READY', 'PARTIAL', 'FAILED'];

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
