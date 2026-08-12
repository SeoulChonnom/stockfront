import { describe, expect, it } from 'vitest';

import type { MarketIndex } from '@/lib/view-models';

import { orderIndices } from './index-order';

function makeIndex(code: string | null, label: string): MarketIndex {
  return {
    label,
    code,
    value: '1,000.00',
    change: '+1.00',
    changeRate: '+0.10%',
    direction: 'up',
    high: '1,010.00',
    low: '990.00',
  };
}

describe('orderIndices', () => {
  it('puts Dow, S&P 500, and NASDAQ first in that order', () => {
    const ordered = orderIndices([
      makeIndex('^IXIC', 'NASDAQ'),
      makeIndex('^GSPC', 'S&P 500'),
      makeIndex('^DJI', 'DOW JONES'),
    ]);

    expect(ordered.map((item) => item.code)).toEqual([
      '^DJI',
      '^GSPC',
      '^IXIC',
    ]);
  });

  it('puts KOSPI before KOSDAQ', () => {
    const ordered = orderIndices([
      makeIndex('KQ11', 'KOSDAQ'),
      makeIndex('KS11', 'KOSPI'),
    ]);

    expect(ordered.map((item) => item.code)).toEqual(['KS11', 'KQ11']);
  });

  it('keeps unranked indices in backend order after the ranked ones', () => {
    const ordered = orderIndices([
      makeIndex('^RUT', 'RUSSELL 2000'),
      makeIndex('^VIX', 'VIX'),
      makeIndex('^GSPC', 'S&P 500'),
    ]);

    expect(ordered.map((item) => item.code)).toEqual(['^GSPC', '^RUT', '^VIX']);
  });

  it('never drops an index', () => {
    const input = [
      makeIndex(null, '이름만 있는 지수'),
      makeIndex('KRX300', 'KRX 300'),
      makeIndex('KS11', 'KOSPI'),
    ];

    expect(orderIndices(input)).toHaveLength(3);
  });
});
