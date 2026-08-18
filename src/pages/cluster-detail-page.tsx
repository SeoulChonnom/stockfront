import { Skeleton } from '@/components/state';
import { Button } from '@/components/ui/button';

import { ApiError } from '../lib/api/client';
import type { Audience } from '../lib/audience-copy';
import {
  errorCodeCopy,
  rawErrorMessageCopy,
  unknownErrorMessageCopy,
} from '../lib/audience-copy';
import { useCapabilities } from '../lib/capabilities';
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
 * `detail.summary` (DTO `summary.short`) and `detail.analysisLead` (DTO
 * `summary.long`) are separate first-class fields — the header (this
 * component -> `ClusterHeader`) renders the former, `ClusterAnalysis`
 * renders the latter as its lead paragraph, and neither is a fallback
 * for the other. `ClusterAnalysis`'s own structured `sections[]` (B-2,
 * docs/backend-requests-2026-08-12.md#A-3) render below that lead.
 *
 * `origin` is read directly via `useUrlState()` rather than threaded in as
 * a prop — `src/app/app-page-content.tsx` (out of this phase's file
 * ownership) only passes this page a bare `clusterId`.
 */
export function ClusterDetailPage({ clusterId }: { clusterId: string }) {
  const url = useUrlState();
  const origin = url.searchParams.get('origin');
  const clusterQuery = useClusterDetail(clusterId);
  // `app-page-content.tsx` (a different agent's file-ownership scope) only
  // passes this page a bare `clusterId` (see the file doc comment above),
  // so this reads its own audience via `useCapabilities()` rather than
  // requiring a prop threaded through that file.
  const { can } = useCapabilities();
  const canViewOps = can('ops.view');

  if (clusterQuery.isLoading) {
    return <ClusterDetailSkeleton />;
  }

  if (clusterQuery.error || !clusterQuery.data) {
    return (
      <ClusterDetailErrorState
        canViewOps={canViewOps}
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
            analysisGeneratedAt={detail.analysisGeneratedAt}
            analysisIssues={detail.analysisIssues}
            analysisLead={detail.analysisLead}
            analysisStatus={detail.analysisStatus}
            articles={detail.articles}
            conflictStatus={detail.conflictStatus}
            sections={detail.sections}
          />
          <ClusterArticlesList
            articleGrouping={detail.articleGrouping}
            articles={detail.articles}
          />
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
  canViewOps,
  error,
  onRetry,
}: {
  canViewOps: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const audience: Audience = { canViewOps };
  const status = error instanceof ApiError ? error.status : null;
  const rawCode = getClusterErrorCode(error);
  // Gate the whole composed badge (not just `rawCode`) so a null code never
  // gets stringified into a stray "500 · null" — this also covers the
  // `error.body.code` passthrough inside `getClusterErrorCode`, which is
  // raw backend text and deserves the same protection as the hardcoded
  // English literals.
  const badge = errorCodeCopy(
    audience,
    status === null ? rawCode : `${status} · ${rawCode}`
  );
  const message =
    error instanceof ApiError
      ? rawErrorMessageCopy(audience, error.message)
      : error instanceof Error
        ? unknownErrorMessageCopy(audience, error.message)
        : '이슈 상세를 불러오는 중 오류가 발생했습니다.';
  const back = getErrorBackLink();

  return (
    <section
      aria-labelledby='page-title'
      className='min-w-0 rounded-[var(--r-lg)] border border-[color:var(--danger-line)] border-l-4 border-l-[color:var(--danger)] bg-[color:var(--surface)] p-5'
      role='alert'
    >
      {badge ? (
        <span className='mono inline-flex rounded-[var(--r-sm)] border border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] px-2 py-0.5 text-body-sm font-semibold text-[color:var(--danger)]'>
          {badge}
        </span>
      ) : null}
      <h1
        className='m-0 mt-2 mb-1.5 text-h1 font-semibold text-fg'
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
