import { useEffect, useRef, useState } from 'react';

import { useAnnounce } from '@/components/shell/use-announce';
import { PermissionState } from '@/components/state';
import { parseListFilters } from '@/lib/app-state';
import { can, useCapabilities } from '@/lib/capabilities';
import {
  useBatchJobDetail,
  useBatchJobs,
  useStartBatchRunMutation,
} from '@/lib/query-hooks';
import { navigate } from '@/lib/router';

import { BatchAttentionBanner } from './batch-operations/batch-attention-banner';
import { BatchDetailPanel } from './batch-operations/batch-detail-panel';
import { BatchFilters } from './batch-operations/batch-filters';
import { BatchHeader } from './batch-operations/batch-header';
import { BatchHistoryList } from './batch-operations/batch-history-list';
import { BatchSummaryTiles } from './batch-operations/batch-summary-tiles';
import {
  BatchTriggerBanner,
  type TriggerBannerState,
} from './batch-operations/batch-trigger-banner';
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
import { TriggerDialog } from './batch-operations/trigger-dialog';

const PAGE_SIZE = 20;

function buildFiltersKey(filters: BatchFiltersState) {
  return `${filters.from}:${filters.to}:${filters.status}:${filters.type}:${filters.page}`;
}

/**
 * `/ops/batches` (README §7-6/§7-7/§10/§16-11).
 *
 * SECURITY: `can('ops.view')` below is a UX affordance, not a security
 * boundary. The backend enforces ADMIN-only access to this screen's
 * endpoints and returns 403 to a non-admin token (confirmed 2026-07-30;
 * see README §10 and `src/lib/capabilities.ts`'s top-of-file note). The
 * gate here exists so a user is never shown a screen that would only 403
 * on them — it is not what keeps the data safe. A non-admin user gets
 * `PermissionState` and NOTHING
 * else: the gate is a plain `if` that returns before `AdminBatchOperations`
 * (the component that owns every batch query/mutation) is ever rendered, so
 * React never even calls its hooks — the log, Trigger dialog, detail panel
 * and summary tiles are absent from the DOM, not hidden by CSS, and no
 * batch-jobs/batch-job-detail request is ever issued for a non-admin user.
 */
export function BatchOperationsPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const { can: canDo } = useCapabilities();

  if (!canDo('ops.view')) {
    return <PermissionState />;
  }

  return <AdminBatchOperations searchParams={searchParams} />;
}

function AdminBatchOperations({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const announce = useAnnounce();
  const applied: BatchFiltersState = {
    ...parseListFilters(searchParams, { allowedStatuses: BATCH_STATUSES }),
    type: parseJobTypeParam(searchParams),
  };
  const appliedKey = buildFiltersKey(applied);
  // §7-6 조회 조건 카드의 "조회 결과 N건을 찾았습니다." announce는 Archive
  // Search(`archive-search-page.tsx`)와 동일한 패턴을 쓴다: 검증을 통과한
  // 필터 적용 직후 목표 키를 기록해 두고, 그 키에 대한 쿼리가 (성공적으로)
  // 로딩을 마쳤을 때만 한 번 announce한다 — TanStack Query가 비동기라
  // navigate 시점에는 아직 새 totalCount를 알 수 없기 때문.
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
  // E2: default selection is the first (newest) row — matching the design
  // — not the first FAILED row, which used to show a different job in the
  // detail panel than what the list visually led with.
  const fallbackJobId = rows[0]?.id ?? null;
  const selectedJobId = jobIdParam ?? fallbackJobId;
  const detailQuery = useBatchJobDetail(selectedJobId);

  const startBatchMutation = useStartBatchRunMutation();
  const [triggerDialog, setTriggerDialog] = useState<{
    open: boolean;
    prefillDate?: string;
  }>({ open: false });
  const [triggerBanner, setTriggerBanner] = useState<TriggerBannerState | null>(
    null
  );

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

  // 조회 조건 카드의 조회/초기화 — page는 항상 1로 리셋한다(§7-4/§7-6 공통
  // 규칙). 초기화는 bare URL로 이동해 `parseListFilters`/`parseJobTypeParam`
  // 이 자기 자신의 기본값을 다시 계산하게 한다 — 기본값 계산을 여기서
  // 중복하지 않는다(Archive Search의 `handleReset`과 동일한 이유).
  function handleFilterApply(next: BatchFilterDraft) {
    const target: BatchFiltersState = { ...next, page: 1 };
    pendingApplyAnnounceKeyRef.current = buildFiltersKey(target);
    goTo(target);
  }

  /**
   * 조회 이외의 경로로 필터가 바뀔 때(초기화·필터 해제·주의 배너의 빠른 필터)
   * 대기 중인 "조회 결과 N건" announce를 취소한다. 이 경로들은 각자 자기
   * announce를 갖고 있고, ref는 액션 종류가 아니라 필터 값 조합(`appliedKey`)
   * 만으로 매칭되기 때문에 — 조회 직후 결과가 도착하기 전에 이 버튼들을 누르고
   * 필터를 왕복시켜 같은 조합으로 되돌아오면 — 엉뚱한 시점에 조회 announce가
   * 뒤늦게 터질 수 있다.
   */
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
      <BatchHeader onOpenTrigger={() => setTriggerDialog({ open: true })} />

      {triggerBanner ? (
        <BatchTriggerBanner
          banner={triggerBanner}
          onDismiss={() => setTriggerBanner(null)}
          onOpenDetail={(jobId) => goTo({}, { jobId, view: 'detail' })}
        />
      ) : null}

      <BatchFilters
        applied={applied}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
      />

      {/* V3 (parity cycle 6): the design nests the attention banner and the
          summary tiles inside a single `<section aria-label="배치 요약"
          style="gap:12px">`, not as two flat siblings of this page's own
          `--gap` stack (20px at desktop) — that 8px difference (20 vs 12
          between the banner and the tiles) was the bulk of the
          `title-to-first-block` gap mismatch. */}
      <section aria-label='배치 요약' className='flex min-w-0 flex-col gap-3'>
        {counts && counts.failedCount + counts.partialCount > 0 ? (
          <BatchAttentionBanner
            failedCount={counts.failedCount}
            onFilterFailed={() => {
              cancelPendingApplyAnnounce();
              goTo({ status: 'FAILED', page: 1 });
            }}
            onFilterPartial={() => {
              cancelPendingApplyAnnounce();
              goTo({ status: 'PARTIAL', page: 1 });
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
            goTo({ status: '', type: '', page: 1 });
          }}
          onPageChange={(page) => goTo({ page })}
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
          hasSelection={selectedJobId !== null}
          hiddenOnNarrowView={!isDetailView}
          isError={detailQuery.isError}
          isFetching={detailQuery.isFetching}
          isLoading={detailQuery.isLoading}
          onAnnounce={announce}
          onBackToList={() => goTo({}, { view: null })}
          onReRun={(businessDate) =>
            setTriggerDialog({ open: true, prefillDate: businessDate })
          }
          onRetry={() => {
            void detailQuery.refetch();
          }}
          run={detailQuery.data ?? null}
          selectedJobId={selectedJobId}
        />
      </div>

      <TriggerDialog
        canUseAdvancedOptions={can('ops.advancedTriggerOptions')}
        initialBusinessDate={triggerDialog.prefillDate}
        isOpen={triggerDialog.open}
        mutation={startBatchMutation}
        onClose={() => setTriggerDialog({ open: false })}
        onOpenJobDetail={(jobId) => {
          setTriggerDialog({ open: false });
          goTo({}, { jobId, view: 'detail' });
        }}
        onTriggered={(result) => {
          setTriggerBanner({
            jobId: result.jobId,
            status: result.status,
            businessDate: result.businessDate,
            startedAt: result.startedAt,
          });
        }}
      />
    </div>
  );
}
