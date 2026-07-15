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
    expect(parseRoute('/market/cluster/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toEqual({
      page: 'cluster-detail',
      clusterId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
  });
});
