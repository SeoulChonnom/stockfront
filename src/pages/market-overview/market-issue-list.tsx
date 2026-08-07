import { Button } from '@/components/ui/button';
import { withBasePath } from '@/lib/router';
import type { ClusterCard } from '@/lib/view-models';

import { getSafeExternalUrl } from './link-utils';
import {
  buildClusterHref,
  type ClusterOriginQuery,
  createScrollSavingNavigateHandler,
} from './navigation';

/**
 * 핵심 이슈 — README §7-2: "카드 그리드 대신 행 리스트". 우측 열 200px,
 * ≤640px에서 1열로 접힘(Tailwind 기본 `sm` = 640px이므로 `sm:` 프리픽스로
 * 표현).
 */

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
  if (clusters.length === 0) {
    return (
      <p className='m-0 px-[18px] py-4 text-[13px] text-faint'>
        묶인 이슈가 없습니다. 수집 기사 수가 부족해 클러스터가 만들어지지 않은
        경우이며, 원문 목록이 있으면 아래에서 직접 확인할 수 있습니다.
      </p>
    );
  }

  return (
    <div>
      {clusters.map((cluster) => (
        <IssueRow
          cluster={cluster}
          currentPathname={currentPathname}
          currentSearch={currentSearch}
          key={cluster.id}
          originQuery={originQuery}
        />
      ))}
    </div>
  );
}

function IssueRow({
  cluster,
  originQuery,
  currentPathname,
  currentSearch,
}: {
  cluster: ClusterCard;
  originQuery: ClusterOriginQuery;
  currentPathname: string;
  currentSearch: string;
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

  return (
    // Keep fixed 10px row/18px column gaps and 18px horizontal padding.
    <article className='grid min-w-0 grid-cols-1 gap-x-[18px] gap-y-[10px] border-b border-line px-[18px] py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_200px]'>
      <div className='flex min-w-0 flex-col gap-[7px]'>
        <a
          className='text-pretty wrap-anywhere text-[15px] font-semibold text-fg no-underline hover:text-[color:var(--primary)] hover:underline'
          href={withBasePath(href)}
          onClick={onOpen}
        >
          {cluster.title}
        </a>
        {cluster.summary ? (
          <p className='text-pretty wrap-anywhere m-0 text-[13.5px] text-fg-soft'>
            {cluster.summary}
          </p>
        ) : null}
        {cluster.tags.length > 0 ? (
          <div className='flex flex-wrap gap-1.5'>
            {cluster.tags.map((tag) => (
              <span
                className='rounded-[var(--r-sm)] border border-line bg-[color:var(--surface-2)] px-1.75 py-0.5 text-[11.5px] text-fg-soft'
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className='wrap-anywhere text-[12px] text-faint'>
          대표 기사 · {buildRepresentativeLine(representative)}
        </div>
      </div>
      <div className='flex min-w-0 flex-col items-start gap-1.5'>
        <span className='mono text-[12px] font-semibold text-fg-soft'>
          기사 {cluster.articleCount}건
        </span>
        <Button asChild className='min-h-9 px-3 text-[12.5px]' size='sm'>
          <a href={withBasePath(href)} onClick={onOpen}>
            이슈 상세
          </a>
        </Button>
        {originalUrl ? (
          <Button
            asChild
            className='min-h-9 px-3 text-[12.5px]'
            size='sm'
            variant='secondary'
          >
            <a href={originalUrl} rel='noopener noreferrer' target='_blank'>
              원문 ↗
            </a>
          </Button>
        ) : null}
        {mirrorUrl ? (
          <a
            className='text-[12px] text-faint underline'
            href={mirrorUrl}
            rel='noopener noreferrer'
            target='_blank'
          >
            네이버 미러 ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}
