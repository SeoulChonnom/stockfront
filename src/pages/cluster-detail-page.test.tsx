import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api/client';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
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
    analysisStatus: 'READY',
    analysisGeneratedAt: '2026-07-27 06:12 KST',
    analysisIssues: [],
    conflictStatus: 'NONE',
    sections: [
      {
        kind: 'background',
        title: '발생 배경',
        paragraphs: [
          {
            sentences: [
              {
                text: 'analysis paragraph one.',
                sourceArticleIds: [],
                conflictStatus: 'NONE',
                conflictingSourceArticleIds: [],
                conflictNote: null,
              },
            ],
          },
        ],
      },
    ],
    articles: [
      {
        id: 'safe',
        source: 'Safe Source',
        publishedAt: '2026-07-26 06:12',
        title: 'safe article',
        originalUrl: 'https://example.com/original',
        mirrorUrl: 'https://n.news.naver.com/mirror',
        similarGroupId: 'sim-safe',
        isSimilarGroupRepresentative: true,
        exactDuplicateCount: 0,
      },
    ],
    articleGrouping: {
      status: 'READY',
      generatedAt: '2026-07-27 06:12',
      issue: null,
    },
    representative: {
      id: 'rep',
      source: 'Representative Source',
      publishedAt: '2026-07-26 06:15',
      title: 'representative article',
      originalUrl: 'https://example.com/representative',
      mirrorUrl: 'https://n.news.naver.com/representative-mirror',
      sourceSummary: 'summary',
      similarGroupId: 'sim-rep',
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: 0,
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
  // See archive-search-page.test.tsx's afterEach comment: unmount
  // deterministically first, since resetting the role override can
  // synchronously notify `useCapabilities()` subscribers, and a stray
  // re-render after `mockUseClusterDetail.mockReset()` would call the mock
  // with no return value configured and throw.
  cleanup();
  resetRoleOverrideForTesting();
  window.history.replaceState(null, '', '/');
  mockUseClusterDetail.mockReset();
});

describe('ClusterDetailPage — 돌아갈 곳', () => {
  it('offers one action when the back link already points at this cluster’s own brief', () => {
    // 진입 경로 없이 직접 들어오면 "돌아가기"의 목적지가 이 클러스터의
    // 기준일 브리프가 된다. 그 옆에 같은 곳으로 가는 버튼을 하나 더 두면
    // 선택지가 둘로 보이지만 실제로는 하나다.
    setLocation();
    mockReady(baseDetail());

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByRole('button', { name: /해당 날짜 브리프 열기/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /시장 브리프 보기/ })
    ).not.toBeInTheDocument();
  });

  it('keeps both actions when they lead to different places', () => {
    setLocation('?origin=latest');
    mockReady(baseDetail());

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByRole('button', { name: /최신 브리프로 돌아가기/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /시장 브리프 보기/ })
    ).toBeInTheDocument();
  });
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
            similarGroupId: 'sim-safe',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 0,
          },
          {
            id: 'unsafe',
            source: 'Unsafe Source',
            publishedAt: '2026-07-26 06:13',
            title: 'unsafe article',
            originalUrl: 'javascript:alert(1)',
            mirrorUrl: 'data:text/html,boom',
            similarGroupId: 'sim-unsafe',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 0,
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
            similarGroupId: 'sim-no-mirror',
            isSimilarGroupRepresentative: true,
            exactDuplicateCount: 0,
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

  it('shows the UNAVAILABLE guidance state when the analysis has no sections, but keeps the summary lead', () => {
    setLocation('?origin=latest');
    mockReady(
      baseDetail({
        analysisStatus: 'UNAVAILABLE',
        analysisGeneratedAt: null,
        analysisIssues: [
          {
            code: 'NO_GROUNDED_SENTENCES',
            message: '근거를 확인할 수 있는 분석 문장이 없습니다.',
          },
        ],
        conflictStatus: 'NOT_CHECKED',
        sections: [],
      })
    );

    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(
      screen.getByText(/이 이슈는 근거를 확인할 수 있는 분석 문장이 없습니다/)
    ).toBeInTheDocument();
    // summary.short/long stay visible even when the analysis is unavailable (A-3).
    expect(screen.getByText('cluster summary paragraph.')).toBeInTheDocument();
    expect(
      screen.getByText('cluster analysis lead paragraph.')
    ).toBeInTheDocument();
  });

  it('shows analysisGeneratedAt beside the analysis heading, not cluster updatedAt', () => {
    setLocation('?origin=latest');
    mockReady(
      baseDetail({
        analysisGeneratedAt: '2026-07-27 09:00 KST',
        updatedAt: '2026-07-27 10:00 KST',
      })
    );

    render(<ClusterDetailPage clusterId='cluster-1' />);

    const analysis = screen.getByRole('region', { name: 'AI 심층 분석' });
    expect(analysis).toHaveTextContent('생성 기준 2026-07-27 09:00 KST');
    expect(analysis).not.toHaveTextContent('2026-07-27 10:00 KST');
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

  it('operator: shows the HTTP/code badge, actual API message, retry, and origin back action for an error', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError('not found', 404, null),
      data: undefined,
      refetch: vi.fn(),
    });

    setRoleOverride('admin');
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

  it('regular user: hides the HTTP/code badge and the raw API message for the same error', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError(
        'provider batch pipeline threshold rejected the request',
        404,
        null
      ),
      data: undefined,
      refetch: vi.fn(),
    });

    setRoleOverride('user');
    render(<ClusterDetailPage clusterId='cluster-1' />);

    const alert = screen.getByRole('alert');
    expect(screen.getByText('이 이슈를 찾을 수 없습니다')).toBeInTheDocument();
    expect(alert).not.toHaveTextContent('REQUEST_FAILED');
    expect(alert).not.toHaveTextContent(
      'provider batch pipeline threshold rejected the request'
    );
    expect(
      screen.getByRole('button', { name: '다시 시도' })
    ).toBeInTheDocument();
  });

  it('regular user: hides a backend-supplied error body code the same way as the hardcoded literals', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError('validation failed', 422, {
        code: 'VALIDATION_ERROR',
      }),
      data: undefined,
      refetch: vi.fn(),
    });

    setRoleOverride('user');
    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.getByRole('alert')).not.toHaveTextContent('VALIDATION_ERROR');
  });

  it('operator: still sees a backend-supplied error body code', () => {
    setLocation('?origin=latest');
    mockUseClusterDetail.mockReturnValue({
      isLoading: false,
      error: new ApiError('validation failed', 422, {
        code: 'VALIDATION_ERROR',
      }),
      data: undefined,
      refetch: vi.fn(),
    });

    setRoleOverride('admin');
    render(<ClusterDetailPage clusterId='cluster-1' />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '422 · VALIDATION_ERROR'
    );
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
