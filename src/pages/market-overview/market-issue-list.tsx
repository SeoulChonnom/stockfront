import { useState } from 'react';

import { useNarrowViewport } from '@/components/shell/use-narrow-viewport';
import { Button } from '@/components/ui/button';
import { withBasePath } from '@/lib/router';
import { cn } from '@/lib/utils';
import type { ClusterCard } from '@/lib/view-models';

import { getSafeExternalUrl } from './link-utils';
import {
  buildClusterHref,
  type ClusterOriginQuery,
  createScrollSavingNavigateHandler,
} from './navigation';

/**
 * 핵심 이슈 — 카드 그리드 대신 행 리스트. 우측 열 200px,
 * ≤640px에서 1열로 접힘(Tailwind 기본 `sm` = 640px이므로 `sm:` 프리픽스로
 * 표현).
 */

const DESKTOP_INITIAL_COUNT = 5;
const MOBILE_INITIAL_COUNT = 3;

function buildRepresentativeLine(
  representative: ClusterCard['representativeArticle']
): string {
  const source = representative?.source ?? '언론사 미확인';
  const publishedAt = representative?.publishedAt ?? '발행 시각 미확인';
  return `${source} · ${publishedAt}`;
}

export function MarketIssueList({
  clusters,
  originQuery,
  currentPathname,
  currentSearch,
}: {
  clusters: ClusterCard[];
  originQuery: ClusterOriginQuery;
  currentPathname: string;
  currentSearch: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNarrow = useNarrowViewport();

  if (clusters.length === 0) {
    return (
      <p className='m-0 px-[18px] py-4 text-body-sm text-faint'>
        묶인 이슈가 없습니다. 수집 기사 수가 부족해 클러스터가 만들어지지 않은
        경우이며, 원문 목록이 있으면 아래에서 직접 확인할 수 있습니다.
      </p>
    );
  }

  const initialCount = isNarrow ? MOBILE_INITIAL_COUNT : DESKTOP_INITIAL_COUNT;
  const visible = expanded ? clusters : clusters.slice(0, initialCount);
  const remaining = clusters.length - visible.length;

  return (
    <div>
      {visible.map((cluster) => (
        <IssueRow
          cluster={cluster}
          currentPathname={currentPathname}
          currentSearch={currentSearch}
          key={cluster.id}
          originQuery={originQuery}
        />
      ))}
      {!expanded && remaining > 0 ? (
        <div className='border-t border-line px-[18px] py-3'>
          <Button
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            type='button'
            variant='secondary'
          >
            {`이슈 ${remaining}건 더 보기`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function IssueRow({
  cluster,
  originQuery,
  currentPathname,
  currentSearch,
  className,
}: {
  cluster: ClusterCard;
  originQuery: ClusterOriginQuery;
  currentPathname: string;
  currentSearch: string;
  className?: string;
}) {
  const href = buildClusterHref(cluster.id, originQuery);
  const onOpen = createScrollSavingNavigateHandler(
    href,
    currentPathname,
    currentSearch
  );
  const representative = cluster.representativeArticle;
  const originalUrl = getSafeExternalUrl(representative?.originalUrl);
  const mirrorUrl = getSafeExternalUrl(representative?.mirrorUrl);
  const representativeTitle = representative?.title ?? '대표 기사';
  const tags = cluster.tags.slice(0, 4);

  return (
    // Keep fixed 10px row/18px column gaps and 18px horizontal padding.
    <article
      className={cn(
        'grid min-w-0 grid-cols-1 gap-x-[18px] gap-y-[10px] border-b border-line px-[18px] py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_200px]',
        className
      )}
    >
      <div className='flex min-w-0 flex-col gap-[7px]'>
        <a
          className='inline-flex min-h-tap text-pretty wrap-anywhere items-center text-body font-semibold text-fg no-underline hover:text-[color:var(--primary)] hover:underline'
          href={withBasePath(href)}
          onClick={onOpen}
        >
          {cluster.title}
        </a>
        {cluster.summary ? (
          <p className='text-pretty wrap-anywhere m-0 line-clamp-3 text-body text-fg-soft'>
            {cluster.summary}
          </p>
        ) : null}
        {tags.length > 0 ? (
          <div className='flex flex-wrap gap-1.5'>
            {tags.map((tag) => (
              <span
                className='rounded-[var(--r-sm)] border border-line bg-[color:var(--surface-2)] px-1.75 py-0.5 text-caption text-fg-soft'
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1 wrap-anywhere text-body-sm text-faint'>
          <span>대표 기사 · {buildRepresentativeLine(representative)}</span>
          {originalUrl ? (
            <a
              aria-label={`${representativeTitle} 원문 (새 창)`}
              className='inline-flex min-h-tap items-center underline underline-offset-2 hover:text-[color:var(--primary)]'
              href={originalUrl}
              rel='noopener noreferrer'
              target='_blank'
            >
              원문 ↗
            </a>
          ) : null}
          {mirrorUrl ? (
            <a
              aria-label={`${representativeTitle} 네이버 미러 (새 창)`}
              className='inline-flex min-h-tap items-center underline underline-offset-2 hover:text-[color:var(--primary)]'
              href={mirrorUrl}
              rel='noopener noreferrer'
              target='_blank'
            >
              네이버 미러 ↗
            </a>
          ) : null}
        </div>
      </div>
      <div className='flex min-w-0 flex-col items-start gap-1.5'>
        <span className='mono text-body-sm font-semibold text-fg-soft'>
          기사 {cluster.articleCount}건
        </span>
      </div>
    </article>
  );
}
