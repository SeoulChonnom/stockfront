import { useState } from 'react';

import type { ArticleLink } from '@/lib/view-models';

import { getSafeExternalUrl } from './link-utils';

/**
 * 근거 원문 마지막 블록. 기본 4건 + `전체 N건 보기`
 * 토글(`aria-expanded`). `articleLinks`는 이전엔 mapper가 버리던 필드라
 * 이 화면에서 소비된다.
 */
export function MarketArticleLinks({ links }: { links: ArticleLink[] }) {
  const [expanded, setExpanded] = useState(false);

  if (links.length === 0) {
    return null;
  }

  const visible = expanded ? links : links.slice(0, 4);
  const needsToggle = links.length > 4;

  return (
    <div className='border-t border-line px-[18px] py-3.5'>
      <div className='mb-2.5 flex flex-wrap items-center gap-2.5'>
        <h3 className='m-0 text-body font-semibold'>근거 원문</h3>
        <span className='mono text-caption text-faint'>
          원문 {links.length}건
        </span>
        {needsToggle ? (
          <button
            aria-expanded={expanded}
            className='ml-auto min-h-8.5 rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-3 text-body-sm text-fg-soft'
            onClick={() => setExpanded((current) => !current)}
            type='button'
          >
            {expanded ? '접기' : `전체 ${links.length}건 보기`}
          </button>
        ) : null}
      </div>
      <ul className='m-0 flex list-none flex-col gap-2 p-0'>
        {visible.map((link) => (
          <ArticleLinkRow key={link.id} link={link} />
        ))}
      </ul>
    </div>
  );
}

function ArticleLinkRow({ link }: { link: ArticleLink }) {
  const originalUrl = getSafeExternalUrl(link.originalUrl);
  const mirrorUrl = getSafeExternalUrl(link.mirrorUrl);
  const meta = `${link.source ?? '언론사 미확인'} · ${link.publishedAt ?? '-'}`;

  return (
    <li className='flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1.5 border-b border-line pb-2'>
      {originalUrl ? (
        <a
          className='wrap-anywhere text-body font-medium text-fg no-underline hover:text-[color:var(--primary)] hover:underline'
          href={originalUrl}
          rel='noopener noreferrer'
          target='_blank'
        >
          {`${link.title} ↗`}
        </a>
      ) : (
        <span className='wrap-anywhere text-body font-medium text-fg'>
          {link.title}
        </span>
      )}
      <span className='mono wrap-anywhere text-caption text-faint'>{meta}</span>
      {/* B-4 (docs/backend-requests-2026-08-12.md#A-5 "표시 규칙"): only
          shown when > 0 — mirrors the same rule in
          `cluster-detail/cluster-articles-list.tsx`. Never the similar
          group's other-article count; this surface never renders group
          collapse UI at all (cluster-detail only), only the duplicate
          badge. */}
      {link.exactDuplicateCount > 0 ? (
        <span className='rounded-[var(--r-sm)] border border-line px-1.5 py-0.5 text-caption text-faint'>
          원문 중복 {link.exactDuplicateCount}건
        </span>
      ) : null}
      {mirrorUrl ? (
        <a
          className='text-caption text-faint underline'
          href={mirrorUrl}
          rel='noopener noreferrer'
          target='_blank'
        >
          미러 ↗
        </a>
      ) : null}
    </li>
  );
}
