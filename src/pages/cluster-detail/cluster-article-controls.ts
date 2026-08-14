import type { ClusterArticle } from '@/lib/view-models';

/**
 * 관련 기사 목록 제어. 클러스터 상세는 기사 전체를 한 응답으로 받으므로
 * 정렬·필터·검색을 클라이언트에서 수행한다. 서버 페이지네이션이 아니다.
 *
 * B-4 유사 기사 그룹 (docs/backend-requests-2026-08-12.md#A-5): `articles[]`는
 * 서버가 보내는 평면 배열 그대로다. 그룹은 이 파일이 `similarGroupId`로
 * 묶어서 만들며, 그 값 자체를 파싱해 의미를 꺼내 쓰지 않는다. 그룹 재구성은
 * 언론사 필터·제목 검색·정렬을 적용한 *뒤에* 수행한다 — "필터·정렬 후 그룹
 * 재구성" 규칙.
 */

const ARTICLE_PAGE_SIZE = 20;

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

/** One visible similar-article group: `articles` in current display order, `representative` chosen per A-5. */
export type ArticleGroup = {
  id: string;
  representative: ClusterArticle;
  articles: ClusterArticle[];
};

function hasValidGroupingFields(article: unknown): article is ClusterArticle {
  if (!article || typeof article !== 'object') {
    return false;
  }

  const candidate = article as ClusterArticle;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.similarGroupId === 'string' &&
    candidate.similarGroupId.trim().length > 0 &&
    typeof candidate.isSimilarGroupRepresentative === 'boolean' &&
    Number.isSafeInteger(candidate.exactDuplicateCount) &&
    candidate.exactDuplicateCount >= 0
  );
}

/**
 * The API guarantees one representative per group. Keep that invariant at
 * the view boundary too: an unexpected READY payload must never create a
 * misleading collapse control or make the renderer throw.
 */
function hasConsistentGrouping(
  serverArticles: ClusterArticle[],
  visibleArticles: ClusterArticle[]
): boolean {
  const serverIds = new Set<string>();
  const serverArticleById = new Map<string, ClusterArticle>();
  const representativesByGroup = new Map<string, number>();

  for (const article of serverArticles) {
    if (!hasValidGroupingFields(article) || serverIds.has(article.id)) {
      return false;
    }

    serverIds.add(article.id);
    serverArticleById.set(article.id, article);
    const representativeCount =
      representativesByGroup.get(article.similarGroupId) ?? 0;
    representativesByGroup.set(
      article.similarGroupId,
      representativeCount + (article.isSimilarGroupRepresentative ? 1 : 0)
    );
  }

  if (
    [...representativesByGroup.values()].some(
      (representativeCount) => representativeCount !== 1
    )
  ) {
    return false;
  }

  const visibleIds = new Set<string>();
  for (const article of visibleArticles) {
    if (!hasValidGroupingFields(article)) {
      return false;
    }

    const serverArticle = serverArticleById.get(article.id);
    if (
      visibleIds.has(article.id) ||
      !serverIds.has(article.id) ||
      !serverArticle ||
      serverArticle.similarGroupId !== article.similarGroupId ||
      serverArticle.isSimilarGroupRepresentative !==
        article.isSimilarGroupRepresentative ||
      serverArticle.exactDuplicateCount !== article.exactDuplicateCount
    ) {
      return false;
    }

    visibleIds.add(article.id);
  }

  return true;
}

/**
 * Builds groups from the already filtered/sorted article list (A-5
 * "필터·정렬 후 그룹 재구성"). Group order and each group's internal article
 * order follow `visibleArticles`'s order (first-appearance order for
 * groups) — whatever the active sort produced. The server's original
 * `articles` order is consulted separately, only to break the
 * representative tie below.
 *
 * Representative selection:
 * - the server representative (`isSimilarGroupRepresentative`), if it
 *   survived filtering;
 * - otherwise the first surviving article **in server order** — not the
 *   current sort order, so switching between 관련도순/최신순 never changes
 *   which article a group displays as its head ("점수를 다시 계산하지
 *   않는다").
 */
export function buildArticleGroups(
  serverArticles: ClusterArticle[],
  visibleArticles: ClusterArticle[]
): ArticleGroup[] {
  if (!hasConsistentGrouping(serverArticles, visibleArticles)) {
    return buildSingletonGroups(visibleArticles);
  }

  const visibleIds = new Set(visibleArticles.map((article) => article.id));

  const groupOrder: string[] = [];
  const membersByGroup = new Map<string, ClusterArticle[]>();
  for (const article of visibleArticles) {
    const groupId = article.similarGroupId;
    let members = membersByGroup.get(groupId);
    if (!members) {
      members = [];
      membersByGroup.set(groupId, members);
      groupOrder.push(groupId);
    }
    members.push(article);
  }

  const serverFirstSurvivor = new Map<string, ClusterArticle>();
  const serverRepresentative = new Map<string, ClusterArticle>();
  for (const article of serverArticles) {
    if (!visibleIds.has(article.id)) {
      continue;
    }
    if (!serverFirstSurvivor.has(article.similarGroupId)) {
      serverFirstSurvivor.set(article.similarGroupId, article);
    }
    if (article.isSimilarGroupRepresentative) {
      serverRepresentative.set(article.similarGroupId, article);
    }
  }

  return groupOrder.map((groupId) => {
    // biome-ignore lint/style/noNonNullAssertion: groupId only ever came from membersByGroup.set above
    const members = membersByGroup.get(groupId)!;
    const serverHead =
      serverRepresentative.get(groupId) ??
      serverFirstSurvivor.get(groupId) ??
      members[0];
    const representative =
      members.find((article) => article.id === serverHead.id) ?? members[0];

    return { id: groupId, representative, articles: members };
  });
}

/**
 * `articleGrouping.status !== 'READY'` fallback (A-5 "UNAVAILABLE 처리"):
 * every article becomes its own group regardless of what its
 * `similarGroupId`/`isSimilarGroupRepresentative` say, so a malformed
 * response can never accidentally show collapse UI while grouping is
 * unavailable. `exactDuplicateCount` is untouched — it stays valid and
 * keeps displaying (A-5: "중복 수는 유사도 계산과 무관하게 산출되기 때문").
 */
export function buildSingletonGroups(
  visibleArticles: ClusterArticle[]
): ArticleGroup[] {
  const usedGroupIds = new Set<string>();

  return visibleArticles.flatMap((article) => {
    if (!article || typeof article !== 'object') {
      return [];
    }

    const candidate = article as ClusterArticle;
    const articleId = typeof candidate.id === 'string' ? candidate.id : '';
    const baseId = articleId.length > 0 ? articleId : 'article';
    let groupId = baseId;
    let suffix = 2;
    while (usedGroupIds.has(groupId)) {
      groupId = `${baseId}--${suffix}`;
      suffix += 1;
    }
    usedGroupIds.add(groupId);

    return [
      {
        id: groupId,
        representative: candidate,
        articles: [candidate],
      },
    ];
  });
}

/**
 * Extends `visibleGroups` (currently shown, from a prior call) by whole
 * groups until at least `ARTICLE_PAGE_SIZE` more articles are covered, or
 * every group is included (A-5 "추가 로딩과 그룹 경계"). A group that would
 * straddle the 20-article increment is included in full rather than split.
 */
export function revealMoreGroups(
  groups: ArticleGroup[],
  currentlyVisibleCount: number
): ArticleGroup[] {
  const target = currentlyVisibleCount + ARTICLE_PAGE_SIZE;
  let covered = 0;
  let cutoff = groups.length;

  for (let index = 0; index < groups.length; index++) {
    covered += groups[index].articles.length;
    if (covered >= target) {
      cutoff = index + 1;
      break;
    }
  }

  return groups.slice(0, cutoff);
}

/** Total article count across `groups`, used for remaining/paging math. */
export function countArticlesInGroups(groups: ArticleGroup[]): number {
  return groups.reduce((sum, group) => sum + group.articles.length, 0);
}

/** Index of the group containing `articleId`, or -1 if it isn't in `groups` (e.g. filtered out). */
export function findGroupIndexForArticle(
  groups: ArticleGroup[],
  articleId: string
): number {
  return groups.findIndex((group) =>
    group.articles.some((article) => article.id === articleId)
  );
}
