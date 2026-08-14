import { describe, expect, it } from 'vitest';

import type { ClusterArticle } from '@/lib/view-models';

import {
  applyArticleFilters,
  buildArticleGroups,
  buildSingletonGroups,
  countArticlesInGroups,
  findGroupIndexForArticle,
  listSources,
  revealMoreGroups,
} from './cluster-article-controls';

function makeArticle(
  id: string,
  source: string | null,
  title: string,
  publishedAt: string | null,
  grouping: Partial<
    Pick<
      ClusterArticle,
      'similarGroupId' | 'isSimilarGroupRepresentative' | 'exactDuplicateCount'
    >
  > = {}
): ClusterArticle {
  return {
    id,
    source,
    title,
    publishedAt,
    originalUrl: `https://e.com/${id}`,
    mirrorUrl: null,
    // Defaults match A-5's "현재 서버 동작": every article its own
    // singleton, self-representative, no exact duplicates.
    similarGroupId: `sim-${id}`,
    isSimilarGroupRepresentative: true,
    exactDuplicateCount: 0,
    ...grouping,
  };
}

const articles = [
  makeArticle('1', '한국경제', '반도체 수출 증가', '2026-08-10 09:00'),
  makeArticle('2', '매일경제', '환율 급등', '2026-08-12 09:00'),
  makeArticle('3', '한국경제', '반도체 설비 투자', '2026-08-11 09:00'),
];

describe('cluster article controls', () => {
  it('lists each publisher once, sorted', () => {
    expect(listSources(articles)).toEqual(['매일경제', '한국경제']);
  });

  it('keeps the backend order for relevance sort', () => {
    const result = applyArticleFilters(articles, {
      sort: 'relevance',
      source: '',
      query: '',
    });

    expect(result.map((item) => item.id)).toEqual(['1', '2', '3']);
  });

  it('sorts newest first for latest sort', () => {
    const result = applyArticleFilters(articles, {
      sort: 'latest',
      source: '',
      query: '',
    });

    expect(result.map((item) => item.id)).toEqual(['2', '3', '1']);
  });

  it('filters by publisher', () => {
    const result = applyArticleFilters(articles, {
      sort: 'relevance',
      source: '한국경제',
      query: '',
    });

    expect(result.map((item) => item.id)).toEqual(['1', '3']);
  });

  it('filters by title substring, ignoring case and spaces', () => {
    const result = applyArticleFilters(articles, {
      sort: 'relevance',
      source: '',
      query: '반도체',
    });

    expect(result.map((item) => item.id)).toEqual(['1', '3']);
  });

  it('returns an empty list when nothing matches', () => {
    const result = applyArticleFilters(articles, {
      sort: 'relevance',
      source: '',
      query: '없는단어',
    });

    expect(result).toEqual([]);
  });
});

// B-4 유사 기사 그룹 (docs/backend-requests-2026-08-12.md#A-5).
describe('article grouping', () => {
  const RELEVANCE = { sort: 'relevance' as const, source: '', query: '' };

  it('groups singleton articles one-per-group, preserving server order', () => {
    const visible = applyArticleFilters(articles, RELEVANCE);
    const groups = buildArticleGroups(articles, visible);

    expect(groups.map((group) => group.id)).toEqual([
      'sim-1',
      'sim-2',
      'sim-3',
    ]);
    for (const group of groups) {
      expect(group.articles).toHaveLength(1);
      expect(group.representative).toBe(group.articles[0]);
    }
  });

  it('keeps the server representative when it survives filtering', () => {
    const grouped = [
      makeArticle('1', '한국경제', '반도체 A', '2026-08-10 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: true,
      }),
      makeArticle('2', '한국경제', '반도체 B', '2026-08-11 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
      }),
    ];
    const visible = applyArticleFilters(grouped, RELEVANCE);
    const [group] = buildArticleGroups(grouped, visible);

    expect(group.articles.map((article) => article.id)).toEqual(['1', '2']);
    expect(group.representative.id).toBe('1');
  });

  it('a group with a single visible article has no other members, regardless of total group size', () => {
    const grouped = [
      makeArticle('1', '한국경제', '반도체 A', '2026-08-10 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: true,
      }),
      makeArticle('2', '매일경제', '반도체 B', '2026-08-11 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
      }),
    ];
    const filters = {
      sort: 'relevance' as const,
      source: '한국경제',
      query: '',
    };
    const visible = applyArticleFilters(grouped, filters);
    const [group] = buildArticleGroups(grouped, visible);

    expect(group.articles).toHaveLength(1);
    expect(group.representative.id).toBe('1');
  });

  it('falls back to the first surviving article in SERVER order — not sort order — when the representative is filtered out', () => {
    const grouped = [
      makeArticle('1', '한국경제', '반도체 A (대표)', '2026-08-10 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: true,
      }),
      makeArticle('2', '매일경제', '반도체 B', '2026-08-09 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
      }),
      makeArticle('3', '매일경제', '반도체 C', '2026-08-12 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
      }),
    ];
    // Filtering out the representative (한국경제) leaves '2' and '3', with
    // '2' first in server order but '3' newer (latest-sort would put '3'
    // first) — the representative must stay '2' regardless of sort.
    const filters = { sort: 'latest' as const, source: '매일경제', query: '' };
    const visible = applyArticleFilters(grouped, filters);
    const [group] = buildArticleGroups(grouped, visible);

    expect(visible.map((article) => article.id)).toEqual(['3', '2']);
    expect(group.articles.map((article) => article.id)).toEqual(['3', '2']);
    expect(group.representative.id).toBe('2');
  });

  it('falls back to singleton groups when READY grouping metadata is inconsistent', () => {
    const malformed = [
      makeArticle('1', '한국경제', '첫 기사', '2026-08-10 09:00', {
        similarGroupId: 'sim-shared',
        isSimilarGroupRepresentative: true,
      }),
      makeArticle('2', '매일경제', '둘째 기사', '2026-08-11 09:00', {
        similarGroupId: 'sim-shared',
        isSimilarGroupRepresentative: true,
      }),
    ];

    const groups = buildArticleGroups(malformed, malformed);

    expect(
      groups.map((group) => group.articles.map((article) => article.id))
    ).toEqual([['1'], ['2']]);
    expect(groups.every((group) => group.articles.length === 1)).toBe(true);
  });

  it('keeps singleton fallback group keys unique when malformed articles repeat an ID', () => {
    const malformed = [
      makeArticle('same-id', '한국경제', '첫 기사', '2026-08-10 09:00'),
      makeArticle('same-id', '매일경제', '둘째 기사', '2026-08-11 09:00'),
    ];

    const groups = buildArticleGroups(malformed, malformed);

    expect(groups).toHaveLength(2);
    expect(new Set(groups.map((group) => group.id)).size).toBe(2);
    expect(groups.map((group) => group.articles[0].id)).toEqual([
      'same-id',
      'same-id',
    ]);
  });

  it('allocates fallback keys against every prior raw ID, including adversarial collision names', () => {
    const malformed = [
      makeArticle('singleton-2-a', '한국경제', '첫 기사', '2026-08-10 09:00'),
      makeArticle('a', '매일경제', '둘째 기사', '2026-08-11 09:00'),
      makeArticle('a', '서울경제', '셋째 기사', '2026-08-12 09:00'),
    ];

    const groups = buildSingletonGroups(malformed);
    const groupIds = groups.map((group) => group.id);

    expect(new Set(groupIds).size).toBe(3);
    expect(groupIds[0]).toBe('singleton-2-a');
    expect(groupIds[1]).toBe('a');
    expect(groupIds[2]).not.toBe(groupIds[0]);
    expect(groupIds[2]).not.toBe(groupIds[1]);
  });

  it('does not throw when a runtime article entry is not an object', () => {
    const malformed = [null] as unknown as ClusterArticle[];

    expect(() => buildArticleGroups(malformed, malformed)).not.toThrow();
    expect(buildArticleGroups(malformed, malformed)).toEqual([]);
  });

  it('buildSingletonGroups ignores similarGroupId and forces one article per group', () => {
    const grouped = [
      makeArticle('1', '한국경제', '반도체 A', '2026-08-10 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: true,
      }),
      makeArticle('2', '매일경제', '반도체 B', '2026-08-11 09:00', {
        similarGroupId: 'sim-1',
        isSimilarGroupRepresentative: false,
      }),
    ];

    const groups = buildSingletonGroups(grouped);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.articles.length)).toEqual([1, 1]);
    expect(groups[0].representative.id).toBe('1');
    expect(groups[1].representative.id).toBe('2');
  });

  it('countArticlesInGroups sums every article across all groups', () => {
    const groups = buildSingletonGroups(articles);
    expect(countArticlesInGroups(groups)).toBe(3);
  });

  it('findGroupIndexForArticle finds the containing group, or -1 when absent', () => {
    const groups = buildSingletonGroups(articles);
    expect(findGroupIndexForArticle(groups, '2')).toBe(1);
    expect(findGroupIndexForArticle(groups, 'missing')).toBe(-1);
  });

  it('revealMoreGroups reveals whole singleton groups 20 at a time, matching the pre-grouping page size', () => {
    const many = Array.from({ length: 45 }, (_, index) =>
      makeArticle(String(index), null, `기사 ${index}`, null)
    );
    const groups = buildSingletonGroups(many);

    const firstPage = revealMoreGroups(groups, 0);
    expect(countArticlesInGroups(firstPage)).toBe(20);

    const secondPage = revealMoreGroups(groups, 20);
    expect(countArticlesInGroups(secondPage)).toBe(40);

    const thirdPage = revealMoreGroups(groups, 40);
    expect(countArticlesInGroups(thirdPage)).toBe(45);
  });

  it('revealMoreGroups never splits a group across the load-more boundary', () => {
    // 18 singleton articles + one 5-article group = a 20-article increment
    // lands mid-group; the whole group of 5 must be included, not just its
    // head (A-5 "그룹 경계에서 끊는다").
    const singles = Array.from({ length: 18 }, (_, index) =>
      makeArticle(`s${index}`, null, `기사 ${index}`, null)
    );
    const bigGroup = Array.from({ length: 5 }, (_, index) =>
      makeArticle(`g${index}`, null, `그룹 기사 ${index}`, null, {
        similarGroupId: 'sim-big',
        isSimilarGroupRepresentative: index === 0,
      })
    );
    const all = [...singles, ...bigGroup];
    const visible = applyArticleFilters(all, RELEVANCE);
    const groups = buildArticleGroups(all, visible);

    const firstPage = revealMoreGroups(groups, 0);

    // 18 singles + the full 5-article group = 23, not 18 + a partial group.
    expect(countArticlesInGroups(firstPage)).toBe(23);
    const lastGroup = firstPage.at(-1);
    expect(lastGroup?.id).toBe('sim-big');
    expect(lastGroup?.articles).toHaveLength(5);
  });
});
