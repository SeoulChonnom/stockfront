import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MarketIndex } from '@/lib/view-models';

import { MarketIndexTable } from './market-index-table';

function makeIndex(overrides: Partial<MarketIndex> = {}): MarketIndex {
  return {
    label: 'KOSPI',
    code: 'KS11',
    value: '2,765.53',
    change: '+18.21',
    changeRate: '+0.66%',
    direction: 'up',
    high: '2,772.11',
    low: '2,742.48',
    ...overrides,
  };
}

describe('MarketIndexTable — per-row missing data', () => {
  it('shows 데이터 없음 for the row with a missing value, without hiding the row or suppressing the other index', () => {
    const good = makeIndex();
    const missing = makeIndex({
      label: 'KRX 300',
      code: 'KRX300',
      value: '-',
      change: '-',
      changeRate: '-',
      direction: 'none',
      high: '-',
      low: '-',
    });

    render(<MarketIndexTable canViewOps={false} indices={[good, missing]} />);

    // The good index still renders its real numbers.
    expect(screen.getByText('KOSPI')).toBeInTheDocument();
    expect(screen.getByText('2,765.53')).toBeInTheDocument();
    expect(screen.getByText('+18.21')).toBeInTheDocument();
    expect(screen.getByText('+0.66%')).toBeInTheDocument();

    // The bad index keeps its row (label still shown) but collapses to
    // a single 데이터 없음 cell instead of six '-' cells.
    expect(screen.getByText('KRX 300')).toBeInTheDocument();
    expect(screen.getByText('데이터 없음')).toBeInTheDocument();
  });

  it('spans the missing-value cell across exactly the remaining header columns', () => {
    const missing = makeIndex({ value: '-', direction: 'none' });

    render(<MarketIndexTable canViewOps={false} indices={[missing]} />);

    const headers = screen.getAllByRole('columnheader');
    // 지수, 종가, 등락, 등락률, 고가, 저가 — the label column plus this many
    // more must equal the header count, or the row will misalign/overflow.
    expect(headers).toHaveLength(6);

    const noDataCell = screen.getByText('데이터 없음').closest('td');
    expect(noDataCell).toHaveAttribute('colspan', String(headers.length - 1));
  });

  it('does not announce a direction for a neutral index (missing changeValue)', () => {
    const neutral = makeIndex({
      value: '2,765.53',
      change: '-',
      changeRate: '-',
      direction: 'none',
    });

    render(<MarketIndexTable canViewOps={false} indices={[neutral]} />);

    // Value is still shown — 값 없이 방향만 생략한다.
    expect(screen.getByText('2,765.53')).toBeInTheDocument();
    expect(screen.queryByText('상승')).not.toBeInTheDocument();
    expect(screen.queryByText('하락')).not.toBeInTheDocument();
  });
});
