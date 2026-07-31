import { useState } from 'react';

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
import { BatchHeader } from './batch-operations/batch-header';
import { BatchHistoryList } from './batch-operations/batch-history-list';
import { BatchSummaryTiles } from './batch-operations/batch-summary-tiles';
import {
  BatchTriggerBanner,
  type TriggerBannerState,
} from './batch-operations/batch-trigger-banner';
import {
  buildBatchOperationsUrl,
  isDetailViewParam,
  parseJobIdParam,
} from './batch-operations/batch-url';
import { TriggerDialog } from './batch-operations/trigger-dialog';

const BATCH_STATUSES = ['SUCCESS', 'PARTIAL', 'FAILED'];
const PAGE_SIZE = 20;

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
  const applied = parseListFilters(searchParams, {
    allowedStatuses: BATCH_STATUSES,
  });
  const jobIdParam = parseJobIdParam(searchParams);
  const isDetailView = isDetailViewParam(searchParams);

  const jobsQuery = useBatchJobs({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    page: applied.page,
    size: PAGE_SIZE,
  });

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
          page: filters.page ?? applied.page,
        },
        {
          jobId: 'jobId' in extra ? extra.jobId : selectedJobId,
          view: 'view' in extra ? extra.view : isDetailView ? 'detail' : null,
        }
      )
    );
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

      {/* V3 (parity cycle 6): the design nests the attention banner and the
          summary tiles inside a single `<section aria-label="배치 요약"
          style="gap:12px">`, not as two flat siblings of this page's own
          `--gap` stack (20px at desktop) — that 8px difference (20 vs 12
          between the banner and the tiles) was the bulk of the
          `title-to-first-block` gap mismatch. */}
      <div aria-label='배치 요약' className='flex min-w-0 flex-col gap-3'>
        {counts && counts.failedCount + counts.partialCount > 0 ? (
          <BatchAttentionBanner
            failedCount={counts.failedCount}
            onFilterFailed={() => goTo({ status: 'FAILED', page: 1 })}
            onFilterPartial={() => goTo({ status: 'PARTIAL', page: 1 })}
            partialCount={counts.partialCount}
          />
        ) : null}

        <BatchSummaryTiles
          avgDurationSeconds={counts?.avgDurationSeconds ?? null}
          failedCount={counts?.failedCount ?? 0}
          partialCount={counts?.partialCount ?? 0}
          successCount={counts?.successCount ?? 0}
        />
      </div>

      <div className='grid min-w-0 grid-cols-1 gap-[var(--gap)] min-[1181px]:grid-cols-[minmax(0,1fr)_400px]'>
        <BatchHistoryList
          applied={applied}
          hiddenOnNarrowView={isDetailView}
          isError={jobsQuery.isError}
          isFetching={jobsQuery.isFetching}
          isLoading={jobsQuery.isLoading}
          onAnnounce={announce}
          onClearStatusFilter={() => goTo({ status: '', page: 1 })}
          onPageChange={(page) => goTo({ page })}
          onRetry={() => {
            void jobsQuery.refetch();
          }}
          onSelectRow={(jobId) => goTo({}, { jobId, view: 'detail' })}
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
