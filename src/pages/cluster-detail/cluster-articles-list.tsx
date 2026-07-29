import { ExternalLink } from 'lucide-react';
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

  return (
    <li className='min-w-0 border-b border-[color:var(--line)] pb-3 last:border-0 last:pb-0'>
      <div className='flex flex-wrap items-center gap-2'>
        {originalUrl ? (
          <a
            className='wrap-anywhere font-medium text-[color:var(--text)] underline-offset-2 hover:underline'
            href={originalUrl}
            rel='noopener noreferrer'
            target='_blank'
          >
            {displayArticleTitle(article.title)}
          </a>
        ) : (
          <span className='wrap-anywhere font-medium text-[color:var(--text)]'>
            {displayArticleTitle(article.title)}
          </span>
        )}
        {/* README §7-5: "제목 링크 + mono 메타 + 원문 배지 + 네이버 미러 ↗"
            — the title itself links to the original source; this badge
            labels that destination in words (not color-only), distinct
            from the 네이버 미러 link below. */}
        <span className='mono rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--text-faint)]'>
          원문
        </span>
      </div>
      <div className='mono mt-1 text-[12px] text-[color:var(--text-faint)]'>
        {displaySource(article.source)} ·{' '}
        {displayPublishedAt(article.publishedAt)}
      </div>
      {mirrorUrl ? (
        <a
          className='mt-1 inline-flex items-center gap-1 text-[12.5px] text-[color:var(--primary)] underline-offset-2 hover:underline'
          href={mirrorUrl}
          rel='noopener noreferrer'
          target='_blank'
        >
          네이버 미러
          <ExternalLink aria-hidden='true' size={12} />
        </a>
      ) : null}
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
    <section
      aria-labelledby='cluster-articles-heading'
      className='flex min-w-0 flex-col gap-3 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'
    >
      <h2
        className='m-0 text-[17px] font-semibold text-[color:var(--text)]'
        id='cluster-articles-heading'
      >
        관련 기사
      </h2>

      {articles.length === 0 ? (
        <EmptyState kind='no-articles' />
      ) : (
        <ul className='m-0 flex list-none flex-col gap-3 p-0'>
          {visible.map((article) => (
            <ClusterArticleRow article={article} key={article.id} />
          ))}
        </ul>
      )}

      {remaining > 0 ? (
        <Button
          aria-expanded={expanded}
          className='self-start'
          onClick={() => setExpanded((current) => !current)}
          type='button'
          variant='ghost'
        >
          {expanded ? '간략히 보기' : `남은 ${remaining}건 더 보기`}
        </Button>
      ) : null}
    </section>
  );
}
