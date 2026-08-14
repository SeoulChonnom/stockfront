import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ArticleGrouping, ClusterArticle } from '@/lib/view-models';

import { requestArticleFocus } from './article-focus-event';
import { ClusterArticlesList } from './cluster-articles-list';

function makeArticles(
  count: number,
  overrides: (index: number) => Partial<ClusterArticle> = () => ({})
): ClusterArticle[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `a-${index}`,
    source: index % 2 === 0 ? '한국경제' : '매일경제',
    title: `기사 제목 ${index}`,
    publishedAt: `2026-08-${String((index % 28) + 1).padStart(2, '0')} 09:00`,
    originalUrl: `https://example.com/${index}`,
    mirrorUrl: `https://n.news.naver.com/${index}`,
    // Defaults match A-5's "현재 서버 동작": every article its own
    // singleton, self-representative, no exact duplicates.
    similarGroupId: `sim-a-${index}`,
    isSimilarGroupRepresentative: true,
    exactDuplicateCount: 0,
    ...overrides(index),
  }));
}

const READY_GROUPING: ArticleGrouping = {
  status: 'READY',
  generatedAt: '2026-08-12 22:20 KST',
  issue: null,
};

describe('ClusterArticlesList paging and filters', () => {
  it('shows the first page and a more button labelled with the next batch size', async () => {
    const user = userEvent.setup();
    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={makeArticles(45)}
      />
    );

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
    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={makeArticles(45)}
      />
    );

    await user.click(screen.getByRole('button', { name: '기사 20건 더 보기' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(40);

    // Every article title contains "기사 제목", so this matches all of them
    // but exercises the filter-changed path.
    await user.type(screen.getByLabelText('제목 검색'), '기사');

    expect(screen.getAllByRole('listitem')).toHaveLength(20);
  });

  it('shows a dedicated empty state when a filter matches nothing, not an empty list', async () => {
    const user = userEvent.setup();
    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={makeArticles(5)}
      />
    );

    await user.type(screen.getByLabelText('제목 검색'), '존재하지않는단어');

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(
      screen.getByText('조건에 맞는 기사가 없습니다.')
    ).toBeInTheDocument();
  });

  it('gives the mirror link an accessible name that identifies the article, not a bare repeated label', () => {
    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={makeArticles(2)}
      />
    );

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
    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={makeArticles(1)}
      />
    );

    expect(screen.getByLabelText('정렬')).toBeInTheDocument();
    expect(screen.getByLabelText('언론사')).toBeInTheDocument();
    expect(screen.getByLabelText('제목 검색')).toBeInTheDocument();
  });
});

// B-4 유사 기사 그룹 (docs/backend-requests-2026-08-12.md#A-5).
describe('ClusterArticlesList similar-article groups', () => {
  it('a multi-article group starts collapsed, with a keyboard-operable toggle exposing correct ARIA state', async () => {
    const user = userEvent.setup();
    const articles = makeArticles(2, (index) => ({
      similarGroupId: 'sim-1',
      isSimilarGroupRepresentative: index === 0,
      // Keep the tab sequence short and focused on the toggle itself.
      mirrorUrl: null,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    // Representative shown; the other member is collapsed.
    expect(
      screen.getByText('기사 제목 0', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('기사 제목 1', { exact: false })
    ).not.toBeInTheDocument();

    const toggle = screen.getByRole('button', {
      name: '유사 기사 1건 더 보기',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.tab(); // sort select
    await user.tab(); // source select
    await user.tab(); // query input
    await user.tab(); // representative row's title link
    await user.tab(); // toggle
    expect(toggle).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(
      screen.getByText('기사 제목 1', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '유사 기사 접기' })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('a group with only one visible article shows no collapse toggle', () => {
    const articles = makeArticles(1, () => ({
      similarGroupId: 'sim-solo',
      isSimilarGroupRepresentative: true,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    expect(
      screen.queryByRole('button', { name: /유사 기사/ })
    ).not.toBeInTheDocument();
  });

  it('shows the survivor in server order (not sort order) as the display representative once the server representative is filtered out', async () => {
    const user = userEvent.setup();
    const articles = [
      {
        id: 'rep',
        source: '한국경제',
        title: '대표 기사',
        publishedAt: '2026-08-10 09:00',
        originalUrl: 'https://example.com/rep',
        mirrorUrl: null,
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: true,
        exactDuplicateCount: 0,
      },
      {
        id: 'older',
        source: '매일경제',
        title: '먼저 온 기사',
        publishedAt: '2026-08-09 09:00',
        originalUrl: 'https://example.com/older',
        mirrorUrl: null,
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
        exactDuplicateCount: 0,
      },
      {
        id: 'newer',
        source: '매일경제',
        title: '나중에 온 기사',
        publishedAt: '2026-08-11 09:00',
        originalUrl: 'https://example.com/newer',
        mirrorUrl: null,
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
        exactDuplicateCount: 0,
      },
    ];

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    await user.selectOptions(screen.getByLabelText('정렬'), 'latest');
    await user.selectOptions(screen.getByLabelText('언론사'), '매일경제');

    // '나중에 온 기사' sorts first under 최신순, but the display
    // representative must stay the server-order-first survivor
    // ('먼저 온 기사'), never a re-scored pick (A-5).
    expect(
      screen.getByText('먼저 온 기사', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('나중에 온 기사', { exact: false })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '유사 기사 1건 더 보기' })
    ).toBeInTheDocument();
  });

  it('shows "원문 중복 N건" only when exactDuplicateCount is positive, and never for a 0 count', () => {
    const articles = makeArticles(2, (index) => ({
      exactDuplicateCount: index === 0 ? 2 : 0,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    expect(screen.getByText('원문 중복 2건')).toBeInTheDocument();
    expect(screen.queryByText(/원문 중복 0건/)).not.toBeInTheDocument();
  });

  it('UNAVAILABLE renders a flat list with no collapse UI, plus exactly one non-blocking notice, and keeps duplicate counts', () => {
    const articles = makeArticles(2, (index) => ({
      // Even a malformed UNAVAILABLE response sharing a similarGroupId
      // must never produce collapse UI (A-5 "UNAVAILABLE 처리").
      similarGroupId: 'sim-shared',
      isSimilarGroupRepresentative: index === 0,
      exactDuplicateCount: index === 0 ? 3 : 0,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={{
          status: 'UNAVAILABLE',
          generatedAt: null,
          issue: {
            code: 'SIMILARITY_GROUPING_FAILED',
            message: '유사 기사 묶음을 생성하지 못했습니다.',
          },
        }}
        articles={articles}
      />
    );

    // Both articles render flat — no toggle collapses the second one.
    expect(
      screen.getByText('기사 제목 0', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.getByText('기사 제목 1', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /유사 기사/ })
    ).not.toBeInTheDocument();
    // Exact-duplicate counts stay visible — independent of grouping.
    expect(screen.getByText('원문 중복 3건')).toBeInTheDocument();
    // Exactly one non-blocking notice; not styled as a page failure.
    expect(
      screen.getByText('유사 기사 묶음을 생성하지 못했습니다.')
    ).toBeInTheDocument();
  });

  it('renders malformed READY grouping data flat without a collapse toggle', () => {
    const articles = makeArticles(2, (index) => ({
      similarGroupId: 'sim-inconsistent',
      // Two representatives violate the backend grouping invariant. This
      // test exercises the runtime guard before a mapper has normalized it.
      isSimilarGroupRepresentative: true,
      exactDuplicateCount: index === 0 ? 6 : 0,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    expect(
      screen.getByText('기사 제목 0', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.getByText('기사 제목 1', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /유사 기사/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText('원문 중복 6건')).toBeInTheDocument();
  });

  it('treats an unknown grouping status as unavailable and keeps the list flat', () => {
    const malformedGrouping = {
      status: 'BROKEN',
      generatedAt: null,
      issue: null,
    } as unknown as ArticleGrouping;

    render(
      <ClusterArticlesList
        articleGrouping={malformedGrouping}
        articles={makeArticles(2, (index) => ({
          similarGroupId: 'sim-status',
          isSimilarGroupRepresentative: index === 0,
        }))}
      />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /유사 기사/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('유사 기사 묶음을 사용할 수 없습니다')
    ).toBeInTheDocument();
  });

  it('keeps fallback group keys and citation targets unique for duplicate IDs', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const articles = makeArticles(3, (index) => ({
      // The first raw ID intentionally collides with the old index-based
      // fallback for the third article. The other two IDs exercise both the
      // fallback group-key allocator and the canonical citation target.
      id: index === 0 ? 'singleton-2-2' : '2',
      title: `중복 기사 ${index}`,
      similarGroupId: 'malformed-grouping',
      isSimilarGroupRepresentative: true,
    }));

    try {
      render(
        <ClusterArticlesList
          articleGrouping={READY_GROUPING}
          articles={articles}
        />
      );

      const rows = screen.getAllByRole('listitem');
      const rowIds = rows.map((row) => row.id);
      expect(rows).toHaveLength(3);
      expect(new Set(rowIds).size).toBe(3);
      expect(rowIds[1]).toBe('cluster-article-2');
      expect(rowIds[2]).not.toBe(rowIds[1]);
      expect(
        consoleError.mock.calls.some(
          ([message]) =>
            typeof message === 'string' && /unique.*key|same key/i.test(message)
        )
      ).toBe(false);

      requestArticleFocus(2);
      await waitFor(() => expect(rows[1]).toHaveFocus());
    } finally {
      consoleError.mockRestore();
    }
  });

  it('focuses the first rendered duplicate when the canonical occurrence is filtered out', async () => {
    const user = userEvent.setup();
    const articles = makeArticles(2, (index) => ({
      id: '2',
      source: index === 0 ? '한국경제' : '매일경제',
      title: index === 0 ? '필터된 대표' : '보이는 중복',
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    await user.selectOptions(screen.getByLabelText('언론사'), '매일경제');
    const visibleRow = screen
      .getByText('보이는 중복', { exact: false })
      .closest('li');
    expect(visibleRow).not.toBeNull();
    expect(visibleRow).toHaveAttribute('data-article-id', '2');

    requestArticleFocus(2);
    await waitFor(() => expect(visibleRow).toHaveFocus());
  });

  it('focuses a visible duplicate when the canonical occurrence is on another page', async () => {
    const user = userEvent.setup();
    const articles = makeArticles(21, (index) => ({
      id: index === 0 || index === 20 ? '2' : `a-${index}`,
      title: index === 0 ? '두 번째 페이지 대표' : `기사 제목 ${index}`,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={articles}
      />
    );

    await user.selectOptions(screen.getByLabelText('정렬'), 'latest');
    expect(
      screen.getByText('기사 제목 20', { exact: false })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('두 번째 페이지 대표', { exact: false })
    ).not.toBeInTheDocument();
    const visibleRow = screen
      .getByText('기사 제목 20', { exact: false })
      .closest('li');
    expect(visibleRow).not.toBeNull();
    expect(visibleRow).toHaveAttribute('data-article-id', '2');

    requestArticleFocus(2);
    await waitFor(() => expect(visibleRow).toHaveFocus());
  });

  it('load-more breaks on group boundaries: a group is never split across the increment', async () => {
    const user = userEvent.setup();
    // 18 singles, then a 5-article group (crosses the 20-article
    // increment), then 2 more singles that must wait for the next page.
    const singles = makeArticles(18);
    const bigGroup = makeArticles(5, (index) => ({
      id: `g-${index}`,
      similarGroupId: 'sim-big',
      isSimilarGroupRepresentative: index === 0,
    }));
    const trailingSingles = makeArticles(2, (index) => ({
      id: `t-${index}`,
      similarGroupId: `sim-t-${index}`,
    }));

    render(
      <ClusterArticlesList
        articleGrouping={READY_GROUPING}
        articles={[...singles, ...bigGroup, ...trailingSingles]}
      />
    );

    // Page 1: 18 singleton rows + the big group's (collapsed) head row =
    // 19 listitems. The big group's 5 articles all count toward the
    // 20-article increment even though only its head row renders — it is
    // never split, just collapsed (A-5 "추가 로딩과 그룹 경계").
    expect(screen.getAllByRole('listitem')).toHaveLength(19);
    expect(
      screen.getByRole('button', { name: '유사 기사 4건 더 보기' })
    ).toBeInTheDocument();
    // The pagination button (not the group's own toggle) reflects the 2
    // trailing singles still withheld, not the 5 already covered.
    const loadMore = screen.getByRole('button', { name: '기사 2건 더 보기' });

    await user.click(loadMore);
    expect(screen.getAllByRole('listitem')).toHaveLength(21);
    expect(
      screen.queryByRole('button', { name: /^기사 \d+건 더 보기$/ })
    ).not.toBeInTheDocument();

    // The big group's own toggle still independently expands its members.
    await user.click(
      screen.getByRole('button', { name: '유사 기사 4건 더 보기' })
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(25);
  });
});
