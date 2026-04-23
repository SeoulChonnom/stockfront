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

    const searchParams = new URLSearchParams({
      from: 'bad-date',
      to: 'still-bad',
      page: '0',
    });

    expect(parseListFilters(searchParams)).toEqual({
      from: '2026-04-22',
      to: '2026-04-08',
      status: '',
      page: 1,
    });

    vi.useRealTimers();
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

  it('falls back to default route params when archive or cluster ids are invalid', () => {
    expect(parseRoute('/market/archive/not-a-date')).toEqual({
      page: 'archive-market',
      businessDate: '2026-03-17',
    });
    expect(parseRoute('/market/cluster/not-a-uuid')).toEqual({
      page: 'cluster-detail',
      clusterId: 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678',
    });
  });
});
