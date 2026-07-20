import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClusterDetailPage } from './cluster-detail-page';

const { mockUseClusterDetail } = vi.hoisted(() => ({
  mockUseClusterDetail: vi.fn(),
}));

vi.mock('../lib/query-hooks', () => ({
  useClusterDetail: mockUseClusterDetail,
}));

describe('ClusterDetailPage', () => {
  it('renders only http and https article URLs as external links', () => {
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        id: 'cluster-1',
        businessDate: '2026-03-31',
        marketLabel: '미국',
        title: 'cluster title',
        tags: [],
        analysis: ['analysis paragraph'],
        articles: [
          {
            id: 'safe',
            source: 'Safe Source',
            publishedAt: '2026-03-31 06:12',
            title: 'safe article',
            originalUrl: 'https://example.com/original',
            mirrorUrl: 'http://example.com/mirror',
          },
          {
            id: 'unsafe',
            source: 'Unsafe Source',
            publishedAt: '2026-03-31 06:13',
            title: 'unsafe article',
            originalUrl: 'javascript:alert(1)',
            mirrorUrl: 'data:text/html,boom',
          },
          {
            id: 'malformed',
            source: 'Malformed Source',
            publishedAt: '2026-03-31 06:14',
            title: 'malformed article',
            originalUrl: 'not a url',
            mirrorUrl: '://missing-scheme',
          },
        ],
        representative: {
          id: 'rep',
          source: 'Representative Source',
          publishedAt: '2026-03-31 06:15',
          title: 'representative article',
          originalUrl: 'javascript:alert(2)',
          mirrorUrl: 'https://example.com/representative-mirror',
          sourceSummary: 'summary',
        },
        articleCount: 3,
        updatedAt: '2026-03-31 06:15',
      },
    });

    render(<ClusterDetailPage clusterId='cluster-1' />);

    const originalLinks = screen.getAllByRole('link', {
      name: /Original Link/i,
    });
    const mirrorLinks = screen.getAllByRole('link', { name: /Naver Mirror/i });

    expect(originalLinks).toHaveLength(1);
    expect(originalLinks[0]).toHaveAttribute(
      'href',
      'https://example.com/original'
    );
    expect(originalLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mirrorLinks).toHaveLength(2);
    expect(mirrorLinks.map((link) => link.getAttribute('href'))).toEqual([
      'http://example.com/mirror',
      'https://example.com/representative-mirror',
    ]);
    mirrorLinks.forEach((link) => {
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
    expect(
      screen.queryByRole('link', { name: /javascript/i })
    ).not.toBeInTheDocument();
  });
});
