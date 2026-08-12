import type { ClusterArticle } from '@/lib/view-models';

/**
 * 관련 기사 목록 제어. 클러스터 상세는 기사 전체를 한 응답으로 받으므로
 * 정렬·필터·검색을 클라이언트에서 수행한다. 서버 페이지네이션이 아니다.
 */

export const ARTICLE_PAGE_SIZE = 20;

export type ArticleSort = 'relevance' | 'latest';

export type ArticleFilters = {
  sort: ArticleSort;
  source: string;
  query: string;
};

export function listSources(articles: ClusterArticle[]): string[] {
  const sources = new Set<string>();

  for (const article of articles) {
    if (article.source) {
      sources.add(article.source);
    }
  }

  return [...sources].sort((left, right) => left.localeCompare(right, 'ko'));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

export function applyArticleFilters(
  articles: ClusterArticle[],
  filters: ArticleFilters
): ClusterArticle[] {
  const query = normalize(filters.query);

  const filtered = articles.filter((article) => {
    if (filters.source && article.source !== filters.source) {
      return false;
    }

    if (query && !normalize(article.title ?? '').includes(query)) {
      return false;
    }

    return true;
  });

  if (filters.sort === 'relevance') {
    return filtered;
  }

  return [...filtered].sort((left, right) =>
    (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
  );
}
