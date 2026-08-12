import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { ClusterArticle } from '@/lib/view-models';

import { ClusterArticlesList } from './cluster-articles-list';

function makeArticles(count: number): ClusterArticle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `a-${index}`,
    source: index % 2 === 0 ? '한국경제' : '매일경제',
    title: `기사 제목 ${index}`,
    publishedAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 09:00`,
    originalUrl: `https://example.com/${index}`,
    mirrorUrl: `https://n.news.naver.com/${index}`,
  }));
}

describe('ClusterArticlesList paging and filters', () => {
  it('shows the first page and a more button labelled with the next batch size', async () => {
    const user = userEvent.setup();
    render(<ClusterArticlesList articles={makeArticles(45)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(20);
    const moreButton = screen.getByRole('button', {
      name: '기사 20건 더 보기',
    });

    await user.click(moreButton);
    expect(screen.getAllByRole('listitem')).toHaveLength(40);

    // Only 5 remain (45 - 40), so the label must say 5, not the page size.
    expect(
      screen.getByRole('button', { name: '기사 5건 더 보기' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '기사 5건 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(45);
    expect(
      screen.queryByRole('button', { name: /더 보기/ })
    ).not.toBeInTheDocument();
  });

  it('resets the visible count to one page when a filter changes after loading more', async () => {
    const user = userEvent.setup();
    render(<ClusterArticlesList articles={makeArticles(45)} />);

    await user.click(screen.getByRole('button', { name: '기사 20건 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(40);

    // Every article title contains "기사 제목", so this matches all of them
    // but exercises the filter-changed path.
    await user.type(screen.getByLabelText('제목 검색'), '기사');

    expect(screen.getAllByRole('listitem')).toHaveLength(20);
  });

  it('shows a dedicated empty state when a filter matches nothing, not an empty list', async () => {
    const user = userEvent.setup();
    render(<ClusterArticlesList articles={makeArticles(5)} />);

    await user.type(screen.getByLabelText('제목 검색'), '존재하지않는단어');

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(
      screen.getByText('조건에 맞는 기사가 없습니다.')
    ).toBeInTheDocument();
  });

  it('gives the mirror link an accessible name that identifies the article, not a bare repeated label', () => {
    render(<ClusterArticlesList articles={makeArticles(2)} />);

    expect(
      screen.getByRole('link', { name: '기사 제목 0 네이버 미러 (새 창)' })
    ).toHaveAttribute('href', 'https://n.news.naver.com/0');
    expect(
      screen.getByRole('link', { name: '기사 제목 1 네이버 미러 (새 창)' })
    ).toHaveAttribute('href', 'https://n.news.naver.com/1');
    expect(
      screen.queryByRole('link', { name: '네이버 미러 ↗' })
    ).not.toBeInTheDocument();
  });

  it('every filter control has an associated label reachable by accessible name', () => {
    render(<ClusterArticlesList articles={makeArticles(1)} />);

    expect(screen.getByLabelText('정렬')).toBeInTheDocument();
    expect(screen.getByLabelText('언론사')).toBeInTheDocument();
    expect(screen.getByLabelText('제목 검색')).toBeInTheDocument();
  });
});
