import { InlineAlert, Skeleton, SkeletonText } from '@/components/state';
import { Button } from '@/components/ui/button';

import { ApiError } from '../lib/api/client';
import { useClusterDetail } from '../lib/query-hooks';
import { navigate, useUrlState } from '../lib/router';
import { ClusterAnalysis } from './cluster-detail/cluster-analysis';
import { ClusterArticlesList } from './cluster-detail/cluster-articles-list';
import { ClusterBreadcrumb } from './cluster-detail/cluster-breadcrumb';
import { ClusterHeader } from './cluster-detail/cluster-header';
import { ClusterRepresentativeAside } from './cluster-detail/cluster-representative-aside';

/**
 * Cluster Detail (`/market/cluster/:uuid`) — README §7-5.
 *
 * Two confirmed data-layer gaps this page works around (both in
 * `src/lib/mappers.ts`/`view-models.ts`, out of this phase's file
 * ownership — see individual component comments for the per-field detail):
 *
 * 1. `ClusterDetail` never carries `summary.short`/`summary.long` as
 *    first-class fields. `mapClusterDetailToView` drops
 *    `response.summary.long` entirely and only folds `summary.short` into
 *    `representative.sourceSummary` (a different UI slot). This page does
 *    NOT reuse `representative.sourceSummary` a second time as a fake page
 *    lead — that would show duplicate text in two unrelated places and
 *    misrepresent what the data actually contains. `ClusterAnalysis` renders
 *    `analysis[]` only; the header has no separate lead paragraph.
 * 2. `ClusterArticle.mirrorUrl` is typed as a non-nullable `string`, and the
 *    mapper backfills it with `originalUrl` whenever the DTO's `naverLink`
 *    is null — so a genuinely-absent mirror is indistinguishable from
 *    "same as original" at the type level. `copy-fallbacks.ts`'s
 *    `hasDistinctMirror` compares the two URLs as the only available
 *    signal (a real 네이버 미러 URL essentially never coincides with the
 *    article's own origin URL).
 *
 * `origin` is read directly via `useUrlState()` rather than threaded in as
 * a prop — `src/app/app-page-content.tsx` (out of this phase's file
 * ownership) only passes this page a bare `clusterId`.
 */
export function ClusterDetailPage({ clusterId }: { clusterId: string }) {
  const url = useUrlState();
  const origin = url.searchParams.get('origin');
  const clusterQuery = useClusterDetail(clusterId);

  if (clusterQuery.isLoading) {
    return <ClusterDetailSkeleton />;
  }

  if (clusterQuery.error || !clusterQuery.data) {
    return (
      <ClusterDetailErrorState
        error={clusterQuery.error}
        onRetry={() => void clusterQuery.refetch()}
      />
    );
  }

  const detail = clusterQuery.data;

  return (
    <div className='flex min-w-0 flex-col gap-5'>
      <ClusterBreadcrumb
        businessDate={detail.businessDate}
        marketLabel={detail.marketLabel}
        origin={origin}
      />
      <ClusterHeader detail={detail} />

      <div className='grid min-w-0 grid-cols-1 gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px] min-[1181px]:items-start'>
        <div className='flex min-w-0 flex-col gap-5'>
          <ClusterAnalysis analysis={detail.analysis} />
          <ClusterArticlesList articles={detail.articles} />
        </div>
        <ClusterRepresentativeAside representative={detail.representative} />
      </div>
    </div>
  );
}

function ClusterDetailSkeleton() {
  return (
    <div aria-busy='true' className='flex min-w-0 flex-col gap-5'>
      <Skeleton className='h-4 w-64' />
      <div className='flex min-w-0 flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
        <Skeleton className='h-4 w-40' />
        <Skeleton className='h-8 w-3/4' />
        <SkeletonText lines={2} />
      </div>
      <p className='m-0 text-[13.5px] text-[color:var(--text-soft)]'>
        이슈 상세를 불러오는 중입니다.
      </p>
      <div className='grid min-w-0 grid-cols-1 gap-5 min-[1181px]:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='flex min-w-0 flex-col gap-5'>
          <div className='rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
            <SkeletonText lines={5} />
          </div>
          <div className='rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
            <SkeletonText lines={6} />
          </div>
        </div>
        <div className='rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5'>
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}

function ClusterDetailErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const is404 = error instanceof ApiError && error.status === 404;

  if (is404) {
    return (
      <InlineAlert
        actions={
          <Button onClick={() => navigate('/market/latest')} type='button'>
            최신 브리프로 이동
          </Button>
        }
        title='이 이슈를 찾을 수 없습니다'
        tone='danger'
      >
        주소가 바뀌었거나 이슈가 삭제됐을 수 있습니다. 최신 브리프에서 다시
        시작하세요.
      </InlineAlert>
    );
  }

  return (
    <InlineAlert
      actions={
        <Button onClick={onRetry} type='button'>
          다시 시도
        </Button>
      }
      title='이슈 상세를 불러오지 못했습니다'
      tone='danger'
    >
      잠시 후 다시 시도해 주세요.
    </InlineAlert>
  );
}
