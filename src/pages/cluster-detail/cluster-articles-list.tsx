import { useState } from 'react';

import { EmptyState } from '@/components/state';
import { Button } from '@/components/ui/button';

import type { ClusterArticle } from '../../lib/view-models';
import {
  displayArticleTitle,
  displayPublishedAt,
  displaySource,
} from './copy-fallbacks';
import { getSafeExternalUrl } from './url-safety';

const INITIAL_VISIBLE_COUNT = 10;

function ClusterArticleRow({ article }: { article: ClusterArticle }) {
  const originalUrl = getSafeExternalUrl(article.originalUrl);
  const mirrorUrl = article.mirrorUrl
    ? getSafeExternalUrl(article.mirrorUrl)
    : null;

  // C10: design is 2 lines — title (+ "↗") on its own line, then
  // publisher/date/원문 배지/네이버 미러 all inline on the line below. The
  // app previously pulled the 원문 badge up next to the title (3 lines).
  return (
    <li className='min-w-0 border-b border-line px-[18px] py-3'>
      {originalUrl ? (
        <a
          className='wrap-anywhere font-medium text-fg underline-offset-2 hover:underline'
          href={originalUrl}
          rel='noopener noreferrer'
          target='_blank'
        >
          {displayArticleTitle(article.title)} ↗
        </a>
      ) : (
        <span className='wrap-anywhere font-medium text-fg'>
          {displayArticleTitle(article.title)}
        </span>
      )}
      <div className='mono mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-faint'>
        <span>{displaySource(article.source)}</span>
        <span>{displayPublishedAt(article.publishedAt)}</span>
        {/* README §7-5: "제목 링크 + mono 메타 + 원문 배지 + 네이버 미러 ↗"
            — the title itself links to the original source; this badge
            labels that destination in words (not color-only), distinct
            from the 네이버 미러 link below. */}
        <span className='rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.5 py-0.5 text-[11.5px] font-semibold text-faint'>
          원문
        </span>
        {/* F6: design's 네이버 미러 is a bordered chip (matching 원문's
            style), not a plain underlined link. */}
        {mirrorUrl ? (
          <a
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
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? articles
    : articles.slice(0, INITIAL_VISIBLE_COUNT);
  const remaining = articles.length - INITIAL_VISIBLE_COUNT;

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
        <span className='mono text-[11.5px] text-faint'>
          관련 기사 {articles.length}건
        </span>
        {remaining > 0 ? (
          <Button
            aria-expanded={expanded}
            className='ml-auto'
            onClick={() => setExpanded((current) => !current)}
            size='sm'
            type='button'
            variant='secondary'
          >
            {expanded ? '간략히 보기' : `남은 ${remaining}건 더 보기`}
          </Button>
        ) : null}
      </div>

      {articles.length === 0 ? (
        <div className='p-[18px]'>
          <EmptyState kind='no-articles' />
        </div>
      ) : (
        <ul className='m-0 list-none p-0'>
          {visible.map((article) => (
            <ClusterArticleRow article={article} key={article.id} />
          ))}
        </ul>
      )}
    </section>
  );
}
