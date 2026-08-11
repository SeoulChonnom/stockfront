import { Skeleton } from '@/components/state';
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
 * Cluster Detail (`/market/cluster/:uuid`).
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
    <div className='flex min-w-0 flex-col gap-[var(--gap)]'>
      <ClusterBreadcrumb
        businessDate={detail.businessDate}
        marketLabel={detail.marketLabel}
        origin={origin}
      />
      <ClusterHeader detail={detail} origin={origin} />

      {/* The aside uses a 400px track to preserve its metadata layout. */}
      <div className='grid min-w-0 grid-cols-1 gap-[var(--gap)] min-[1181px]:grid-cols-[minmax(0,1fr)_400px] min-[1181px]:items-start'>
        <div className='flex min-w-0 flex-col gap-[var(--gap)]'>
          <ClusterAnalysis
            analysis={detail.analysis}
            analysisLead={detail.analysisLead}
          />
          <ClusterArticlesList articles={detail.articles} />
        </div>
        <ClusterRepresentativeAside representative={detail.representative} />
      </div>
    </div>
  );
}

function ClusterDetailSkeleton() {
  return (
    <div
      aria-busy='true'
      aria-label='이슈 상세를 불러오는 중입니다.'
      className='flex min-w-0 flex-col gap-3'
      role='status'
    >
      <Skeleton className='h-[96px] w-full' />
      <Skeleton className='h-[200px] w-full' />
      <Skeleton className='h-[160px] w-full' />
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
  const status = error instanceof ApiError ? error.status : null;
  const code = getClusterErrorCode(error);
  const message =
    error instanceof Error
      ? error.message
      : '이슈 상세를 불러오는 중 오류가 발생했습니다.';
  const back = getErrorBackLink();

  return (
    <section
      aria-labelledby='page-title'
      className='min-w-0 rounded-[var(--r-lg)] border border-[color:var(--danger-line)] border-l-4 border-l-[color:var(--danger)] bg-[color:var(--surface)] p-5'
      role='alert'
    >
      <span className='mono inline-flex rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-caption font-semibold text-[color:var(--danger)]'>
        {status === null ? code : `${status} · ${code}`}
      </span>
      <h1
        className='m-0 mt-2 mb-1.5 text-[19px] font-semibold text-fg'
        id='page-title'
        tabIndex={-1}
      >
        {status === 404
          ? '이 이슈를 찾을 수 없습니다'
          : '이슈 상세를 불러오지 못했습니다'}
      </h1>
      <p className='measure-error wrap-anywhere m-0 mb-4 text-body text-fg-soft'>
        {message}
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button onClick={onRetry} type='button' variant='primary'>
          다시 시도
        </Button>
        <Button
          onClick={() => navigate(back.href)}
          type='button'
          variant='secondary'
        >
          {back.label}
        </Button>
      </div>
    </section>
  );
}

function getClusterErrorCode(error: unknown) {
  if (error instanceof ApiError) {
    if (
      error.body &&
      typeof error.body === 'object' &&
      'code' in error.body &&
      typeof error.body.code === 'string' &&
      error.body.code.length > 0
    ) {
      return error.body.code;
    }

    if (error.status === 0) {
      return 'NETWORK_ERROR';
    }

    if (error.status >= 500) {
      return 'INTERNAL_ERROR';
    }
  }

  return 'REQUEST_FAILED';
}

function getErrorBackLink() {
  const origin = new URLSearchParams(window.location.search).get('origin');

  if (origin === 'latest') {
    return { href: '/market/latest', label: '최신 브리프로 돌아가기' };
  }

  if (origin && /^\d{4}-\d{2}-\d{2}$/.test(origin)) {
    return {
      href: `/market/archive/${origin}`,
      label: `${origin} 브리프로 돌아가기`,
    };
  }

  return { href: '/market/latest', label: '최신 브리프로 이동' };
}
