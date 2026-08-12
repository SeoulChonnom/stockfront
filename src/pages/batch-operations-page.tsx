import { useEffect, useRef } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import { PermissionState } from '@/components/state';
import { parseListFilters } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import {
  useBatchJobDetail,
  useBatchJobs,
  useRetryAiMutation,
} from '@/lib/query-hooks';
import { navigate } from '@/lib/router';

import { BatchAttentionBanner } from './batch-operations/batch-attention-banner';
import { BatchDetailPanel } from './batch-operations/batch-detail-panel';
import { BatchFilters } from './batch-operations/batch-filters';
import { BatchHeader } from './batch-operations/batch-header';
import { BatchHistoryList } from './batch-operations/batch-history-list';
import { BatchSummaryTiles } from './batch-operations/batch-summary-tiles';
import {
  type BatchFilters as BatchFiltersState,
  buildBatchOperationsUrl,
  isDetailViewParam,
  parseJobIdParam,
  parseJobTypeParam,
} from './batch-operations/batch-url';
import {
  BATCH_STATUSES,
  type BatchFilterDraft,
} from './batch-operations/filter-copy';

const PAGE_SIZE = 20;

function buildFiltersKey(filters: BatchFiltersState) {
  return `${filters.from}:${filters.to}:${filters.status}:${filters.type}:${filters.page}`;
}

/** Capability gating is UX only; the backend remains the security boundary. */
export function BatchOperationsPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const { can: canDo } = useCapabilities();

  if (!canDo('ops.view')) {
    return <PermissionState />;
  }

  return (
    <AdminBatchOperations
      canTriggerAi={canDo('ops.trigger')}
      searchParams={searchParams}
    />
  );
}

function AdminBatchOperations({
  canTriggerAi,
  searchParams,
}: {
  canTriggerAi: boolean;
  searchParams: URLSearchParams;
}) {
  const announce = useAnnounce();
  const applied: BatchFiltersState = {
    ...parseListFilters(searchParams, { allowedStatuses: BATCH_STATUSES }),
    type: parseJobTypeParam(searchParams),
  };
  const appliedKey = buildFiltersKey(applied);
  // Announce applied-filter results only after the matching async query settles.
  const pendingApplyAnnounceKeyRef = useRef<string | null>(null);
  const jobIdParam = parseJobIdParam(searchParams);
  const isDetailView = isDetailViewParam(searchParams);

  const jobsQuery = useBatchJobs({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    jobType: applied.type || undefined,
    page: applied.page,
    size: PAGE_SIZE,
  });

  useEffect(() => {
    if (pendingApplyAnnounceKeyRef.current !== appliedKey) {
      return;
    }

    if (jobsQuery.isLoading) {
      return;
    }

    pendingApplyAnnounceKeyRef.current = null;

    if (!jobsQuery.isError) {
      announce(`조회 결과 ${jobsQuery.data?.totalCount ?? 0}건을 찾았습니다.`);
    }
  }, [
    appliedKey,
    jobsQuery.isLoading,
    jobsQuery.data,
    jobsQuery.isError,
    announce,
  ]);

  const rows = jobsQuery.data?.rows ?? [];
  const fallbackJobId = rows[0]?.id ?? null;
  // Filter/page changes can push the URL's jobId outside the new result.
  // Fall back to the first row so the detail panel never contradicts the
  // filtered list. While the query is loading or has failed, rows is empty
  // and we can't yet judge membership, so a deep-linked jobId is kept as-is
  // (a list error already keeps the previous filters and selection).
  const hasSelectedInRows =
    jobIdParam !== null && rows.some((row) => row.id === jobIdParam);
  const selectedJobId =
    jobIdParam !== null &&
    (jobsQuery.isLoading || jobsQuery.isError || hasSelectedInRows)
      ? jobIdParam
      : fallbackJobId;
  // Child mutation callbacks read this ref to reject stale completions after unmount.
  const selectedJobIdRef = useRef(selectedJobId);
  selectedJobIdRef.current = selectedJobId;
  const detailQuery = useBatchJobDetail(selectedJobId);

  const retryAiMutation = useRetryAiMutation();

  function goTo(
    filters: Partial<{
      from: string;
      to: string;
      status: string;
      type: string;
      page: number;
    }>,
    extra: { jobId?: number | null; view?: 'detail' | null } = {}
  ) {
    navigate(
      buildBatchOperationsUrl(
        {
          from: filters.from ?? applied.from,
          to: filters.to ?? applied.to,
          status: filters.status ?? applied.status,
          type: filters.type ?? applied.type,
          page: filters.page ?? applied.page,
        },
        {
          jobId: 'jobId' in extra ? extra.jobId : selectedJobId,
          view: 'view' in extra ? extra.view : isDetailView ? 'detail' : null,
        }
      )
    );
  }

  // Filter changes reset to page 1; bare reset URLs let the shared parser restore defaults.
  function handleFilterApply(next: BatchFilterDraft) {
    const target: BatchFiltersState = { ...next, page: 1 };
    pendingApplyAnnounceKeyRef.current = buildFiltersKey(target);
    goTo(target, { jobId: null, view: null });
  }

  /** Cancels a pending result announcement when another filter action wins. */
  function cancelPendingApplyAnnounce() {
    pendingApplyAnnounceKeyRef.current = null;
  }

  function handleFilterReset() {
    cancelPendingApplyAnnounce();
    navigate('/ops/batches');
  }

  const counts = jobsQuery.data?.counts ?? null;

  return (
    <div className='flex min-w-0 flex-col gap-[var(--gap)]'>
      <BatchHeader />

      <BatchFilters
        applied={applied}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      <section aria-label='배치 요약' className='flex min-w-0 flex-col gap-3'>
        {counts && counts.failedCount + counts.partialCount > 0 ? (
          <BatchAttentionBanner
            failedCount={counts.failedCount}
            onFilterFailed={() => {
              cancelPendingApplyAnnounce();
              goTo({ status: 'FAILED', page: 1 }, { jobId: null, view: null });
            }}
            onFilterPartial={() => {
              cancelPendingApplyAnnounce();
              goTo({ status: 'PARTIAL', page: 1 }, { jobId: null, view: null });
            }}
            partialCount={counts.partialCount}
          />
        ) : null}

        <BatchSummaryTiles
          avgDurationSeconds={counts?.avgDurationSeconds ?? null}
          failedCount={counts?.failedCount ?? 0}
          partialCount={counts?.partialCount ?? 0}
          successCount={counts?.successCount ?? 0}
        />
      </section>

      <div className='grid min-w-0 grid-cols-1 gap-[var(--gap)] min-[1181px]:grid-cols-[minmax(0,1fr)_400px]'>
        <BatchHistoryList
          applied={applied}
          hiddenOnNarrowView={isDetailView}
          isError={jobsQuery.isError}
          isFetching={jobsQuery.isFetching}
          isLoading={jobsQuery.isLoading}
          dataUpdatedAt={jobsQuery.dataUpdatedAt}
          onAnnounce={announce}
          onClearFilters={() => {
            cancelPendingApplyAnnounce();
            goTo(
              { status: '', type: '', page: 1 },
              { jobId: null, view: null }
            );
          }}
          onPageChange={(page) => goTo({ page }, { jobId: null, view: null })}
          onRetry={() => {
            void jobsQuery.refetch();
          }}
          onRefresh={() => {
            void jobsQuery.refetch();
          }}
          onSelectRow={(jobId) =>
            goTo(
              {},
              { jobId, view: window.innerWidth <= 1180 ? 'detail' : null }
            )
          }
          pageSize={PAGE_SIZE}
          rows={rows}
          selectedJobId={selectedJobId}
          totalCount={jobsQuery.data?.totalCount ?? 0}
        />

        <BatchDetailPanel
          canRetryAi={canTriggerAi}
          hasSelection={selectedJobId !== null}
          hiddenOnNarrowView={!isDetailView}
          isError={detailQuery.isError}
          isFetching={detailQuery.isFetching}
          isLoading={detailQuery.isLoading}
          onAnnounce={announce}
          onBackToList={() => goTo({}, { view: null })}
          onRetry={() => {
            void detailQuery.refetch();
          }}
          isCurrentRetryJob={(jobId) => selectedJobIdRef.current === jobId}
          retryAiMutation={retryAiMutation}
          run={detailQuery.data ?? null}
          selectedJobId={selectedJobId}
        />
      </div>
    </div>
  );
}
