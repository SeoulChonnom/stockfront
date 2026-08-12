import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { MarketIndex } from '@/lib/view-models';

import { MarketIndexCards } from './market-index-cards';

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

describe('MarketIndexCards — per-card missing data', () => {
  it('shows 데이터 없음 for the card with a missing value, without dropping the other index', () => {
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

    render(<MarketIndexCards indices={[good, missing]} />);

    // The good index still renders its real numbers.
    expect(screen.getByText('KOSPI')).toBeInTheDocument();
    expect(screen.getByText('2,765.53')).toBeInTheDocument();
    expect(screen.getByText('+18.21')).toBeInTheDocument();
    expect(screen.getByText('+0.66%')).toBeInTheDocument();

    // The bad index keeps its card (label still shown) with 데이터 없음
    // instead of rendering '-' for every field.
    expect(screen.getByText('KRX 300')).toBeInTheDocument();
    expect(screen.getByText('데이터 없음')).toBeInTheDocument();
  });

  it('does not announce a direction for a neutral index (missing changeValue)', () => {
    const neutral = makeIndex({
      value: '2,765.53',
      change: '-',
      changeRate: '-',
      direction: 'none',
    });

    render(<MarketIndexCards indices={[neutral]} />);

    expect(screen.getByText('2,765.53')).toBeInTheDocument();
    expect(screen.queryByText('상승')).not.toBeInTheDocument();
    expect(screen.queryByText('하락')).not.toBeInTheDocument();
  });

  // Only high/low missing (value/change/changeRate present) must hide the
  // 고가/저가 line entirely instead of printing the content-free
  // "고가 - · 저가 -". `MarketIndexTable` must match this behaviour.
  it('hides the 고가/저가 line when only high/low are missing', () => {
    const onlyHighLowMissing = makeIndex({ high: '-', low: '-' });

    render(<MarketIndexCards indices={[onlyHighLowMissing]} />);

    expect(screen.getByText('2,765.53')).toBeInTheDocument();
    expect(screen.queryByText(/고가 -/)).not.toBeInTheDocument();
    expect(screen.queryByText(/저가 -/)).not.toBeInTheDocument();
  });
});
