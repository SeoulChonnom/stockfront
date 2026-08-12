import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ClusterCard } from '@/lib/view-models';

import { MarketIssueList } from './market-issue-list';

const cluster: ClusterCard = {
  id: 'cluster-1',
  articleCount: 4,
  title: '연준 위원 발언 이후 장기 금리 반등',
  summary: '장기 금리 반등으로 성장주 변동성이 확대되었습니다.',
  tags: ['금리', '성장주'],
  representativeArticle: {
    title: '대표 기사',
    source: '한국경제',
    publishedAt: '2026-07-26 22:41 KST',
    originalUrl: 'https://example.com/original',
    mirrorUrl: 'https://n.news.naver.com/mirror',
  },
};

describe('MarketIssueList semantic actions', () => {
  it('makes the title link the sole detail entry point and names external links by article title', () => {
    render(
      <MarketIssueList
        canViewOps={false}
        clusters={[cluster]}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    const detail = screen.getByRole('link', {
      name: '연준 위원 발언 이후 장기 금리 반등',
    });
    expect(detail).toHaveAttribute(
      'href',
      '/market/cluster/cluster-1?origin=latest'
    );

    expect(
      screen.queryByRole('link', { name: '이슈 상세' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '원문 ↗' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '네이버 미러 ↗' })
    ).not.toBeInTheDocument();

    const original = screen.getByRole('link', {
      name: '대표 기사 원문 (새 창)',
    });
    expect(original).toHaveAttribute('href', 'https://example.com/original');
    expect(original).toHaveAttribute('target', '_blank');
    expect(original).toHaveAttribute('rel', 'noopener noreferrer');
    expect(original).toHaveClass('underline');

    const mirror = screen.getByRole('link', {
      name: '대표 기사 네이버 미러 (새 창)',
    });
    expect(mirror).toHaveAttribute('href', 'https://n.news.naver.com/mirror');
    expect(mirror).toHaveAttribute('target', '_blank');
    expect(mirror).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mirror).toHaveClass('underline');
  });

  it('shows five issues before expanding and reveals the rest on demand', async () => {
    const clusters = Array.from({ length: 12 }, (_, index) => ({
      id: `c-${index}`,
      articleCount: 3,
      title: `이슈 ${index}`,
      summary: '요약',
      tags: [],
    }));
    const user = userEvent.setup();

    render(
      <MarketIssueList
        canViewOps={false}
        clusters={clusters}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    expect(screen.getAllByRole('article')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: '이슈 7건 더 보기' }));

    expect(screen.getAllByRole('article')).toHaveLength(12);
  });

  it('offers exactly one detail affordance per issue besides the title link', () => {
    const clusters = [
      {
        id: 'c-0',
        articleCount: 3,
        title: '이슈 0',
        summary: '요약',
        tags: [],
        representativeArticle: {
          title: '대표 기사 제목',
          source: '언론사',
          publishedAt: '2026-08-12 07:00',
          originalUrl: 'https://example.com/a',
          mirrorUrl: null,
        },
      },
    ];

    render(
      <MarketIssueList
        canViewOps={false}
        clusters={clusters}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    expect(
      screen.queryByRole('link', { name: '이슈 상세' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /대표 기사 제목/ })
    ).toBeInTheDocument();
  });
});

describe('MarketIssueList — empty clusters', () => {
  it('shows a plain-language reason to a regular user, without the collection-pipeline vocabulary', () => {
    render(
      <MarketIssueList
        canViewOps={false}
        clusters={[]}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    expect(screen.getByText(/묶인 이슈가 없습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/수집/)).not.toBeInTheDocument();
  });

  it('keeps the collection-pipeline reason for an operator', () => {
    render(
      <MarketIssueList
        canViewOps
        clusters={[]}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    expect(screen.getByText(/묶인 이슈가 없습니다/)).toBeInTheDocument();
    expect(screen.getByText(/수집 기사 수가 부족해/)).toBeInTheDocument();
  });
});
