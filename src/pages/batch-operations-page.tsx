import { useState } from 'react';

import { PageMessage } from '../components/ui';
import { parseListFilters } from '../lib/app-state';
import {
  useBatchJobDetail,
  useBatchJobs,
  useStartBatchRunMutation,
} from '../lib/query-hooks';
import { buildUrl, navigate } from '../lib/router';
import type { BatchRun, BatchSummaryView } from '../lib/view-models';
import { BatchOperationsFooter } from './batch-operations/batch-operations-footer';
import { BatchOperationsHistoryTable } from './batch-operations/batch-operations-history-table';
import { BatchOperationsSummary } from './batch-operations/batch-operations-summary';
import { BatchRunDetailPanel } from './batch-operations/batch-run-detail-panel';

const batchOperationStatuses = ['SUCCESS', 'PARTIAL', 'FAILED'];

function buildBatchOperationsUrl(filters: {
  from: string;
  to: string;
  status: string;
  page: number;
}) {
  return buildUrl('/ops/batches', filters);
}

export function BatchOperationsPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const applied = parseListFilters(searchParams, {
    allowedStatuses: batchOperationStatuses,
  });

  const jobsQuery = useBatchJobs({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    page: applied.page,
    size: 20,
  });
  const [manualSelectedJobId, setManualSelectedJobId] = useState<number | null>(
    null
  );
  const currentRows = jobsQuery.data?.rows ?? [];
  const defaultSelectedJobId =
    currentRows.find((run) => run.status === 'FAILED')?.id ??
    currentRows[0]?.id ??
    null;
  const selectedJobId = currentRows.some(
    (run) => run.id === manualSelectedJobId
  )
    ? manualSelectedJobId
    : defaultSelectedJobId;
  const detailQuery = useBatchJobDetail(selectedJobId);
  const startBatchMutation = useStartBatchRunMutation();
  const detailErrorMessage =
    detailQuery.error instanceof Error
      ? detailQuery.error.message
      : '배치 상세 정보를 불러오지 못했습니다.';

  if (jobsQuery.isLoading) {
    return (
      <PageMessage
        description='배치 실행 이력을 불러오는 중입니다.'
        title='Loading Batch Jobs'
      />
    );
  }

  if (jobsQuery.error) {
    return (
      <PageMessage
        description={jobsQuery.error.message}
        title='Batch Jobs Unavailable'
      />
    );
  }

  return (
    <BatchOperationsContent
      key={`${applied.from}:${applied.to}:${applied.status}:${applied.page}`}
      applied={applied}
      detailErrorMessage={detailErrorMessage}
      filtered={currentRows}
      isDetailError={detailQuery.isError}
      isDetailLoading={detailQuery.isLoading}
      onSelectJob={setManualSelectedJobId}
      selectedJobId={selectedJobId}
      selectedRun={detailQuery.data ?? null}
      startBatchMutation={startBatchMutation}
      summary={jobsQuery.data?.summary ?? null}
      totalCount={jobsQuery.data?.totalCount ?? 0}
    />
  );
}

function BatchOperationsContent({
  applied,
  detailErrorMessage,
  filtered,
  isDetailError,
  isDetailLoading,
  onSelectJob,
  selectedJobId,
  selectedRun,
  startBatchMutation,
  summary,
  totalCount,
}: {
  applied: {
    from: string;
    to: string;
    status: string;
  };
  detailErrorMessage: string;
  filtered: BatchRun[];
  isDetailError: boolean;
  isDetailLoading: boolean;
  onSelectJob: (jobId: number) => void;
  selectedJobId: number | null;
  selectedRun: BatchRun | null;
  startBatchMutation: ReturnType<typeof useStartBatchRunMutation>;
  summary: BatchSummaryView | null;
  totalCount: number;
}) {
  return (
    <div className='page-stack'>
      <BatchOperationsSummary
        isPending={startBatchMutation.isPending}
        onTrigger={() => startBatchMutation.mutate()}
        summary={summary}
      />

      <div className='ops-grid'>
        <BatchOperationsHistoryTable
          filtered={filtered}
          initialFilters={applied}
          onApplyFilters={(filters) =>
            navigate(
              buildBatchOperationsUrl({
                from: filters.from,
                to: filters.to,
                status: filters.status,
                page: 1,
              })
            )
          }
          onSelectJob={onSelectJob}
          selectedJobId={selectedJobId}
        />

        <BatchRunDetailPanel
          errorMessage={detailErrorMessage}
          isError={isDetailError}
          isLoading={isDetailLoading}
          selectedRun={selectedRun}
        />
      </div>

      <BatchOperationsFooter
        filteredCount={filtered.length}
        hasStartError={startBatchMutation.isError}
        totalCount={totalCount}
      />
    </div>
  );
}
