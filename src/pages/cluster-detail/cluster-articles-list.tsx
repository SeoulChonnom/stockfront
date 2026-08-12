import { useState } from 'react';

import { EmptyState } from '@/components/state';
import { Button } from '@/components/ui/button';

import type { ClusterArticle } from '../../lib/view-models';
import {
  ARTICLE_PAGE_SIZE,
  type ArticleFilters,
  type ArticleSort,
  applyArticleFilters,
  listSources,
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

function ClusterArticleRow({ article }: { article: ClusterArticle }) {
  const originalUrl = getSafeExternalUrl(article.originalUrl);
  const mirrorUrl = article.mirrorUrl
    ? getSafeExternalUrl(article.mirrorUrl)
    : null;
  const title = displayArticleTitle(article.title);

  // Keep each article to two logical lines: title first, then publisher,
  // date, original-source badge, and mirror link together below.
  return (
    <li className='min-w-0 border-b border-line px-[18px] py-3'>
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
      </div>
    </li>
  );
}

export function ClusterArticlesList({
  articles,
}: {
  articles: ClusterArticle[];
}) {
  const [filters, setFilters] = useState<ArticleFilters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(ARTICLE_PAGE_SIZE);

  // A filter change can only shrink the match set relative to what's on
  // screen, so re-showing whatever visibleCount had reached before would
  // dump every match at once — the exact "show everything" bug this
  // control replaces. Reset to one page whenever filters change.
  function updateFilters(patch: Partial<ArticleFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setVisibleCount(ARTICLE_PAGE_SIZE);
  }

  const filtered = applyArticleFilters(articles, filters);
  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

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
      ) : filtered.length === 0 ? (
        <div className='p-[18px]'>
          <EmptyState
            description='조건에 맞는 기사가 없습니다.'
            kind='search-results'
          />
        </div>
      ) : (
        <ul className='m-0 list-none p-0'>
          {visible.map((article) => (
            <ClusterArticleRow article={article} key={article.id} />
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <div className='border-t border-line px-[18px] py-3'>
          <Button
            onClick={() =>
              setVisibleCount((current) => current + ARTICLE_PAGE_SIZE)
            }
            type='button'
            variant='secondary'
          >
            {`기사 ${Math.min(ARTICLE_PAGE_SIZE, remaining)}건 더 보기`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
