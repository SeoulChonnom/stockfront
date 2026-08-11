import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api/client';
import type { ClusterDetail } from '../lib/view-models';
import { ClusterDetailPage } from './cluster-detail-page';

const { mockUseClusterDetail } = vi.hoisted(() => ({
  mockUseClusterDetail: vi.fn(),
}));

vi.mock('../lib/query-hooks', () => ({
  useClusterDetail: mockUseClusterDetail,
}));

function baseDetail(overrides: Partial<ClusterDetail> = {}): ClusterDetail {
  return {
    id: 'cluster-1',
    businessDate: '2026-07-26',
    marketLabel: '미국 증시',
    title: 'cluster title',
    summary: 'cluster summary paragraph.',
    analysisLead: 'cluster analysis lead paragraph.',
    tags: ['반도체', 'AI'],
    analysis: ['analysis paragraph one.', 'analysis paragraph two.'],
    articles: [
      {
        id: 'safe',
        source: 'Safe Source',
        publishedAt: '2026-07-26 06:12',
        title: 'safe article',
        originalUrl: 'https://example.com/original',
        mirrorUrl: 'https://n.news.naver.com/mirror',
      },
    ],
    representative: {
      id: 'rep',
      source: 'Representative Source',
      publishedAt: '2026-07-26 06:15',
      title: 'representative article',
      originalUrl: 'https://example.com/representative',
      mirrorUrl: 'https://n.news.naver.com/representative-mirror',
      sourceSummary: 'summary',
    },
    articleCount: 1,
    updatedAt: '2026-07-27 06:12',
    ...overrides,
  };
}

function mockReady(detail: ClusterDetail) {
  mockUseClusterDetail.mockReturnValue({
    isLoading: false,
    error: null,
    data: detail,
    refetch: vi.fn(),
  });
}

function setLocation(search = '') {
  window.history.pushState(null, '', `/market/cluster/cluster-1${search}`);
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
  mockUseClusterDetail.mockReset();
});

describe('ClusterDetailPage', () => {
  it('renders only http/https URLs as real links, and only a distinct mirror URL as 네이버 미러', () => {
    setLocation('?origin=latest');
    mockReady(
      baseDetail({
        articles: [
          {
            id: 'safe',
            source: 'Safe Source',
            publishedAt: '2026-07-26 06:12',
            title: 'safe article',
            originalUrl: 'https://example.com/original',
            mirrorUrl: 'https://n.news.naver.com/mirror',
          },
          {
            id: 'unsafe',
            source: 'Unsafe Source',
            publishedAt: '2026-07-26 06:13',
            title: 'unsafe article',
            originalUrl: 'javascript:alert(1)',
            mirrorUrl: 'data:text/html,boom',
          },
          {
            id: 'no-mirror',
            source: 'No Mirror Source',
            publishedAt: '2026-07-26 06:14',
            title: 'no mirror article',
            originalUrl: 'https://example.com/no-mirror',
            // Simulates `naverLink: null` — mapClusterArticle backfills
            // mirrorUrl with originalUrl in that case (see
            // copy-fallbacks.ts's `hasDistinctMirror` doc comment).
            // 미러 없음 = null. 예전 mapper는 originLink로 backfill해서
            // 화면이 URL 문자열 비교로 추측해야 했다.
            mirrorUrl: null,
          },
        ],
      })
    );

    render(<ClusterDetailPage clusterId='cluster-1' />);

    // Linked article titles include a trailing "↗" in their accessible name.
    expect(
      screen.getByRole('link', { name: 'safe article ↗' })
    ).toHaveAttribute('href', 'https://example.com/original');
    expect(
      screen.queryByRole('link', { name: /unsafe article/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText('unsafe article')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'no mirror article ↗' })
    ).toHaveAttribute('href', 'https://example.com/no-mirror');

    const mirrorLinks = screen.getAllByRole('link', { name: /네이버 미러/ });
    expect(mirrorLinks.map((link) => link.getAttribute('href'))).toEqual([
      'https://n.news.naver.com/mirror',
      'https://n.news.naver.com/representative-mirror',
    ]);
  });

  it('breadcrumb shows 최신 브리프 for origin=latest', () => {
    setLocation('?origin=latest');
    mockReady(baseDetail());

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.getByRole('navigation', { name: '위치' })).toHaveTextContent(
      '최신 브리프'
    );
    expect(screen.getByRole('link', { name: '최신 브리프' })).toHaveAttribute(
      'href',
      '/market/latest'
    );
    expect(screen.queryByText(/진입 경로 정보가 없어/)).not.toBeInTheDocument();
  });

  it('breadcrumb shows 아카이브 YYYY-MM-DD for an archive-date origin', () => {
    setLocation('?origin=2026-07-06');
    mockReady(baseDetail());

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByRole('link', { name: '아카이브 2026-07-06' })
    ).toHaveAttribute('href', '/market/archive/2026-07-06');
  });

  it('direct entry (no origin) falls back to 시장 브리프 and shows the info box naming the businessDate', () => {
    setLocation('');
    mockReady(baseDetail({ businessDate: '2026-07-26' }));

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.getByRole('link', { name: '시장 브리프' })).toHaveAttribute(
      'href',
      '/market/archive/2026-07-26'
    );
    expect(
      screen.getByText(
        '진입 경로 정보가 없어 이 이슈의 기준일(2026-07-26) 브리프로 돌아갑니다.'
      )
    ).toBeInTheDocument();
  });

  it('omits the tag chip area entirely when there are zero tags', () => {
    setLocation('?origin=latest');
    mockReady(baseDetail({ tags: [] }));

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.queryByText('#반도체')).not.toBeInTheDocument();
  });

  it('shows the sparse-analysis fallback copy when analysis is empty', () => {
    setLocation('?origin=latest');
    mockReady(baseDetail({ analysis: [] }));

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByText(/이 이슈의 심층 분석이 아직 생성되지 않았습니다/)
    ).toBeInTheDocument();
  });

  it('renders a loading skeleton while the query is in flight', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: true,
      error: null,
      data: undefined,
      refetch: vi.fn(),
    });

    render(<ClusterDetailPage clusterId='cluster-1' />);

    const status = screen.getByRole('status', {
      name: '이슈 상세를 불러오는 중입니다.',
    });
    expect(status.children).toHaveLength(3);
    expect(status.children[0]).toHaveClass('h-[96px]');
    expect(status.children[1]).toHaveClass('h-[200px]');
    expect(status.children[2]).toHaveClass('h-[160px]');
  });

  it('shows the HTTP/code badge, actual API message, retry, and origin back action for an error', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError('not found', 404, null),
      data: undefined,
      refetch: vi.fn(),
    });

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.getByText('이 이슈를 찾을 수 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('404 · REQUEST_FAILED');
    expect(screen.getByRole('alert')).toHaveTextContent('not found');
    expect(
      screen.getByRole('heading', { name: '이 이슈를 찾을 수 없습니다' })
    ).toHaveAttribute('tabindex', '-1');
    expect(
      screen.getByRole('button', { name: '다시 시도' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '최신 브리프로 돌아가기' })
    ).toBeInTheDocument();
  });

  it('shows a generic retry alert for a non-404 error', () => {
    setLocation('?origin=latest');
    const refetch = vi.fn();
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError('server error', 500, null),
      data: undefined,
      refetch,
    });

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByText('이슈 상세를 불러오지 못했습니다')
    ).toBeInTheDocument();
    screen.getByRole('button', { name: '다시 시도' }).click();
    expect(refetch).toHaveBeenCalled();
  });
});
