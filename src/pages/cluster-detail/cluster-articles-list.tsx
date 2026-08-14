import { useEffect, useState } from 'react';

import { EmptyState, InlineAlert } from '@/components/state';
import { Button } from '@/components/ui/button';

import type { ArticleGrouping, ClusterArticle } from '../../lib/view-models';
import {
  ARTICLE_FOCUS_REQUEST_EVENT,
  type ArticleFocusRequestDetail,
} from './article-focus-event';
import {
  type ArticleFilters,
  type ArticleGroup,
  type ArticleSort,
  applyArticleFilters,
  buildArticleGroups,
  buildSingletonGroups,
  countArticlesInGroups,
  findGroupIndexForArticle,
  listSources,
  revealMoreGroups,
} from './cluster-article-controls';
import {
  displayArticleTitle,
  displayPublishedAt,
  displaySource,
} from './copy-fallbacks';
import { getSafeExternalUrl } from './url-safety';

const DEFAULT_FILTERS: ArticleFilters = {
  sort: 'relevance',
  source: '',
  query: '',
};

function createArticleDomIdResolver(
  articles: ClusterArticle[]
): (article: ClusterArticle) => string {
  const domIdsByArticle = new Map<ClusterArticle, string[]>();
  const usedDomIds = new Set<string>();

  function allocateDomId(article: ClusterArticle): string {
    const rawId = typeof article.id === 'string' ? article.id : '';
    const baseId = `cluster-article-${rawId.length > 0 ? rawId : 'article'}`;
    let domId = baseId;
    let suffix = 2;
    while (usedDomIds.has(domId)) {
      domId = `${baseId}--${suffix}`;
      suffix += 1;
    }
    usedDomIds.add(domId);
    return domId;
  }

  // Allocate in server order so the first occurrence of a duplicated raw ID
  // always owns the unsuffixed citation target. This preserves the raw API
  // article ID while making every rendered occurrence addressable uniquely.
  for (const article of articles) {
    if (!article || typeof article !== 'object') {
      continue;
    }

    const ids = domIdsByArticle.get(article) ?? [];
    ids.push(allocateDomId(article));
    domIdsByArticle.set(article, ids);
  }

  const renderedOccurrences = new Map<ClusterArticle, number>();
  return (article) => {
    const ids = domIdsByArticle.get(article) ?? [];
    const occurrence = renderedOccurrences.get(article) ?? 0;
    let domId = ids[occurrence];
    if (!domId) {
      // Runtime data should normally be one of `articles`, but keep the
      // renderer safe if a malformed grouping object introduces another
      // reference or repeats one more times than the source array.
      domId = allocateDomId(article);
      ids.push(domId);
      domIdsByArticle.set(article, ids);
    }
    renderedOccurrences.set(article, occurrence + 1);
    return domId;
  };
}

function findArticleFocusTarget(articleId: number): HTMLElement | null {
  // Keep the normal, unique-ID path as a single O(1) lookup. Duplicate raw
  // IDs use suffixed DOM IDs, so only that malformed-data fallback inspects
  // rendered rows by their safe, constant attribute selector.
  const directTarget = document.getElementById(`cluster-article-${articleId}`);
  if (directTarget) {
    return directTarget;
  }

  const rawArticleId = String(articleId);
  const renderedRows =
    document.querySelectorAll<HTMLElement>('[data-article-id]');
  for (const row of renderedRows) {
    if (row.getAttribute('data-article-id') === rawArticleId) {
      return row;
    }
  }

  return null;
}

function computeGroups(
  articles: ClusterArticle[],
  filters: ArticleFilters,
  status: ArticleGrouping['status']
): ArticleGroup[] {
  const visible = applyArticleFilters(articles, filters);
  return status === 'READY'
    ? buildArticleGroups(articles, visible)
    : buildSingletonGroups(visible);
}

type GroupToggleProps = {
  expanded: boolean;
  otherCount: number;
  onToggle: () => void;
};

function ClusterArticleRow({
  article,
  domId,
  groupToggle,
  isGroupMember = false,
}: {
  article: ClusterArticle;
  domId: string;
  groupToggle?: GroupToggleProps;
  isGroupMember?: boolean;
}) {
  const originalUrl = getSafeExternalUrl(article.originalUrl);
  const mirrorUrl = article.mirrorUrl
    ? getSafeExternalUrl(article.mirrorUrl)
    : null;
  const title = displayArticleTitle(article.title);

  // Keep each article to two logical lines: title first, then publisher,
  // date, original-source badge, and mirror link together below.
  //
  // `id` + `tabIndex={-1}` give this row a stable jump/focus target for
  // `ClusterAnalysis`'s sentence-level citations (A-3 "근거 기사 참조 UX"):
  // a citation click scrolls here and calls `.focus()`, expanding this
  // row's similar-article group first if it's currently collapsed (B-4,
  // A-5 — see `article-focus-event.ts`). The row isn't a natural tab stop,
  // but `base.css`'s global `:focus-visible` rule still rings it once
  // programmatically focused — no local outline override needed.
  // `scroll-mt-24` matches the anchor-offset convention already used for
  // `archive-search-page.tsx`'s results heading.
  return (
    <li
      className={`min-w-0 scroll-mt-24 border-b border-line px-[18px] py-3 ${
        isGroupMember ? 'bg-[color:var(--surface-2)] ps-7' : ''
      }`}
      data-article-id={article.id}
      id={domId}
      tabIndex={-1}
    >
      {originalUrl ? (
        <a
          className='wrap-anywhere font-medium text-fg underline-offset-2 hover:underline'
          href={originalUrl}
          rel='noopener noreferrer'
          target='_blank'
        >
          {title} ↗
        </a>
      ) : (
        <span className='wrap-anywhere font-medium text-fg'>{title}</span>
      )}
      <div className='mono mt-1 flex flex-wrap items-center gap-2 text-caption text-faint'>
        <span>{displaySource(article.source)}</span>
        <span>{displayPublishedAt(article.publishedAt)}</span>
        {/* Product layout: "제목 링크 + mono 메타 + 원문 배지 + 네이버 미러 ↗"
            — the title itself links to the original source; this badge
            labels that destination in words (not color-only), distinct
            from the 네이버 미러 link below. */}
        <span className='rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.5 py-0.5 text-caption font-semibold text-faint'>
          원문
        </span>
        {/* B-4 (A-5 "표시 규칙"): only shown when > 0 — never a "0건"
            badge, and never the similar-group's other-article count. */}
        {article.exactDuplicateCount > 0 ? (
          <span className='rounded-[var(--r-sm)] border border-line px-1.5 py-0.5 text-caption text-faint'>
            원문 중복 {article.exactDuplicateCount}건
          </span>
        ) : null}
        {/* 네이버 미러 uses a bordered chip matching the 원문 배지. The
            aria-label repeats the article title so a screen reader doesn't
            hear a bare, repeated "네이버 미러" across every row. */}
        {mirrorUrl ? (
          <a
            aria-label={`${title} 네이버 미러 (새 창)`}
            className='rounded-[var(--r-sm)] border border-line px-1.5 py-0.5 text-fg-soft no-underline'
            href={mirrorUrl}
            rel='noopener noreferrer'
            target='_blank'
          >
            네이버 미러 ↗
          </a>
        ) : null}
        {groupToggle ? (
          <button
            aria-expanded={groupToggle.expanded}
            className='ms-auto rounded-[var(--r-sm)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2 py-0.5 text-caption font-semibold text-fg-soft'
            onClick={groupToggle.onToggle}
            type='button'
          >
            {groupToggle.expanded
              ? '유사 기사 접기'
              : `유사 기사 ${groupToggle.otherCount}건 더 보기`}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function ArticleGroupRows({
  getArticleDomId,
  group,
  expanded,
  onToggle,
}: {
  getArticleDomId: (article: ClusterArticle) => string;
  group: ArticleGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const others = group.articles.filter(
    (article) => article.id !== group.representative.id
  );
  const hasOthers = others.length > 0;
  const representativeDomId = getArticleDomId(group.representative);

  return (
    <>
      <ClusterArticleRow
        article={group.representative}
        domId={representativeDomId}
        groupToggle={
          hasOthers
            ? { expanded, otherCount: others.length, onToggle }
            : undefined
        }
      />
      {hasOthers && expanded
        ? others.map((article) => {
            const domId = getArticleDomId(article);
            return (
              <ClusterArticleRow
                article={article}
                domId={domId}
                isGroupMember
                key={domId}
              />
            );
          })
        : null}
    </>
  );
}

export function ClusterArticlesList({
  articles,
  articleGrouping,
}: {
  articles: ClusterArticle[];
  articleGrouping: ArticleGrouping;
}) {
  const [filters, setFilters] = useState<ArticleFilters>(DEFAULT_FILTERS);
  const groupingStatus: ArticleGrouping['status'] =
    articleGrouping?.status === 'READY' ? 'READY' : 'UNAVAILABLE';
  const allGroups = computeGroups(articles, filters, groupingStatus);
  const [visibleGroupCount, setVisibleGroupCount] = useState(
    () => revealMoreGroups(allGroups, 0).length
  );
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set()
  );
  const [pendingFocusArticleId, setPendingFocusArticleId] = useState<
    number | null
  >(null);
  const getArticleDomId = createArticleDomIdResolver(articles);

  // A filter change can only shrink the match set relative to what's on
  // screen, so re-showing whatever visibleGroupCount had reached before
  // would dump every match at once — the exact "show everything" bug this
  // control replaces. Reset to one page whenever filters change.
  function updateFilters(patch: Partial<ArticleFilters>) {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    const nextGroups = computeGroups(articles, nextFilters, groupingStatus);
    setVisibleGroupCount(revealMoreGroups(nextGroups, 0).length);
  }

  const visibleGroups = allGroups.slice(0, visibleGroupCount);
  const totalArticleCount = countArticlesInGroups(allGroups);
  const shownArticleCount = countArticlesInGroups(visibleGroups);
  const remaining = totalArticleCount - shownArticleCount;
  const nextRevealCount =
    remaining > 0
      ? countArticlesInGroups(revealMoreGroups(allGroups, shownArticleCount)) -
        shownArticleCount
      : 0;

  function showMore() {
    setVisibleGroupCount(revealMoreGroups(allGroups, shownArticleCount).length);
  }

  // Bridge for B-2 citations that need to reach a row B-4 grouping has
  // collapsed (see `article-focus-event.ts`'s doc comment).
  useEffect(() => {
    function handleFocusRequest(event: Event) {
      const detail = (event as CustomEvent<ArticleFocusRequestDetail>).detail;
      if (detail) {
        setPendingFocusArticleId(detail.articleId);
      }
    }

    document.addEventListener(ARTICLE_FOCUS_REQUEST_EVENT, handleFocusRequest);
    return () =>
      document.removeEventListener(
        ARTICLE_FOCUS_REQUEST_EVENT,
        handleFocusRequest
      );
  }, []);

  useEffect(() => {
    if (pendingFocusArticleId === null) {
      return;
    }

    const target = findArticleFocusTarget(pendingFocusArticleId);
    if (target) {
      target.focus({ preventScroll: true });
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setPendingFocusArticleId(null);
      return;
    }

    const groupIndex = findGroupIndexForArticle(
      allGroups,
      String(pendingFocusArticleId)
    );
    if (groupIndex === -1) {
      // Not in the currently filtered/grouped view (e.g. hidden by the
      // title search or publisher filter) — nothing to reveal, matching
      // the pre-existing no-op-when-truly-missing behavior.
      setPendingFocusArticleId(null);
      return;
    }

    const targetGroup = allGroups[groupIndex];
    let changed = false;

    if (
      targetGroup.articles.length > 1 &&
      !expandedGroupIds.has(targetGroup.id)
    ) {
      setExpandedGroupIds((current) => new Set(current).add(targetGroup.id));
      changed = true;
    }

    if (visibleGroupCount <= groupIndex) {
      setVisibleGroupCount(groupIndex + 1);
      changed = true;
    }

    if (!changed) {
      // Already expanded and revealed, yet the row still isn't there —
      // stop retrying rather than leaving a dangling pending focus.
      setPendingFocusArticleId(null);
    }
  }, [pendingFocusArticleId, allGroups, expandedGroupIds, visibleGroupCount]);

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  return (
    // Header, body, and pager own their padding.
    <section
      aria-labelledby='cluster-articles-heading'
      className='flex min-w-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)]'
    >
      <div className='flex flex-wrap items-center gap-2.5 border-b border-line px-[18px] py-3.5'>
        {/* Keep this dense card heading at 15px. */}
        <h2
          className='m-0 text-[15px] font-semibold text-fg'
          id='cluster-articles-heading'
        >
          관련 기사
        </h2>
        <span className='mono text-caption text-faint'>
          관련 기사 {articles.length}건
        </span>
      </div>

      {/* B-4 (A-5 "UNAVAILABLE 처리"): one non-blocking notice, no collapse
          UI. This never changes the page's own status — grouping failure
          is isolated to this cluster. */}
      {articles.length > 0 && groupingStatus === 'UNAVAILABLE' ? (
        <div className='border-b border-line px-[18px] py-3'>
          <InlineAlert title='유사 기사 묶음을 사용할 수 없습니다' tone='info'>
            {articleGrouping?.issue?.message ??
              '유사 기사 묶음을 표시할 수 없어 전체 목록을 보여드립니다.'}
          </InlineAlert>
        </div>
      ) : null}

      {articles.length > 0 ? (
        <div className='flex flex-wrap items-end gap-3 border-b border-line px-[18px] py-3'>
          <div className='flex flex-col gap-1'>
            <label className='text-label text-faint' htmlFor='article-sort'>
              정렬
            </label>
            <select
              className='min-h-tap rounded-[var(--r-md)] border border-line bg-[color:var(--surface)] px-2 text-body'
              id='article-sort'
              onChange={(event) =>
                updateFilters({ sort: event.target.value as ArticleSort })
              }
              value={filters.sort}
            >
              <option value='relevance'>관련도순</option>
              <option value='latest'>최신순</option>
            </select>
          </div>

          <div className='flex flex-col gap-1'>
            <label className='text-label text-faint' htmlFor='article-source'>
              언론사
            </label>
            <select
              className='min-h-tap rounded-[var(--r-md)] border border-line bg-[color:var(--surface)] px-2 text-body'
              id='article-source'
              onChange={(event) =>
                updateFilters({ source: event.target.value })
              }
              value={filters.source}
            >
              <option value=''>전체</option>
              {listSources(articles).map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className='flex min-w-0 flex-1 flex-col gap-1'>
            <label className='text-label text-faint' htmlFor='article-query'>
              제목 검색
            </label>
            <input
              className='min-h-tap min-w-0 rounded-[var(--r-md)] border border-line bg-[color:var(--surface)] px-2 text-body'
              id='article-query'
              onChange={(event) => updateFilters({ query: event.target.value })}
              type='search'
              value={filters.query}
            />
          </div>
        </div>
      ) : null}

      {articles.length === 0 ? (
        <div className='p-[18px]'>
          <EmptyState kind='no-articles' />
        </div>
      ) : totalArticleCount === 0 ? (
        <div className='p-[18px]'>
          <EmptyState
            description='조건에 맞는 기사가 없습니다.'
            kind='search-results'
          />
        </div>
      ) : (
        <ul className='m-0 list-none p-0'>
          {visibleGroups.map((group) => (
            <ArticleGroupRows
              expanded={expandedGroupIds.has(group.id)}
              getArticleDomId={getArticleDomId}
              group={group}
              key={group.id}
              onToggle={() => toggleGroup(group.id)}
            />
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <div className='border-t border-line px-[18px] py-3'>
          <Button onClick={showMore} type='button' variant='secondary'>
            {`기사 ${nextRevealCount}건 더 보기`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
