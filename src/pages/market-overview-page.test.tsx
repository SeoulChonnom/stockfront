import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MarketSnapshot } from '../lib/view-models';
import { MarketOverviewPage } from './market-overview-page';

const partialSnapshot: MarketSnapshot = {
  pageId: 42,
  businessDate: '2026-03-17',
  versionNo: 3,
  generatedAt: '2026. 03. 17. 09:30',
  status: 'partial',
  globalHeadline: 'Partial market brief',
  markets: [
    {
      label: 'US',
      summaryTitle: 'US summary',
      summaryBody: 'The page is partially generated.',
      indices: [],
      clusters: [
        {
          id: 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678',
          articleCount: 2,
          title: 'Partial cluster',
          summary: 'Cluster summary',
          tags: ['macro'],
        },
      ],
    },
  ],
};

describe('MarketOverviewPage', () => {
  it('preserves a partial page status in the source view archive filter', () => {
    render(
      <MarketOverviewPage
        mode='archive'
        snapshot={partialSnapshot}
        title='Archive'
      />
    );

    expect(screen.getByRole('link', { name: 'Source View' })).toHaveAttribute(
      'href',
      '/market/archive/search?from=2026-03-17&to=2026-03-17&status=PARTIAL&page=1'
    );
  });
});
