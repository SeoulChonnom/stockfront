import { describe, expect, it } from 'vitest';

import type { ClusterArticle } from '@/lib/view-models';

import { applyArticleFilters, listSources } from './cluster-article-controls';

function makeArticle(
  id: string,
  source: string | null,
  title: string,
  publishedAt: string | null
): ClusterArticle {
  return {
    id,
    source,
    title,
    publishedAt,
    originalUrl: `https://e.com/${id}`,
    mirrorUrl: null,
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
