import { render, screen } from '@testing-library/react';
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
  it('keeps issue detail as the primary action and demotes external sources to text links', () => {
    render(
      <MarketIssueList
        clusters={[cluster]}
        currentPathname='/market/latest'
        currentSearch=''
        originQuery={{ origin: 'latest' }}
      />
    );

    const detail = screen.getByRole('link', { name: '이슈 상세' });
    expect(detail).toHaveAttribute(
      'href',
      '/market/cluster/cluster-1?origin=latest'
    );
    expect(detail).toHaveClass('bg-[color:var(--primary)]');

    const original = screen.getByRole('link', { name: '원문 ↗' });
    expect(original).toHaveAttribute('href', 'https://example.com/original');
    expect(original).toHaveAttribute('target', '_blank');
    expect(original).toHaveAttribute('rel', 'noopener noreferrer');
    expect(original).not.toHaveClass('border');
    expect(original).toHaveClass('underline');

    const mirror = screen.getByRole('link', { name: '네이버 미러 ↗' });
    expect(mirror).toHaveAttribute('href', 'https://n.news.naver.com/mirror');
    expect(mirror).toHaveAttribute('target', '_blank');
    expect(mirror).toHaveAttribute('rel', 'noopener noreferrer');
    expect(mirror).not.toHaveClass('border');
    expect(mirror).toHaveClass('underline');
  });
});
