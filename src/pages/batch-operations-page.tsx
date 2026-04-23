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
  const applied = parseListFilters(searchParams);

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
  const defaultSelectedJobId =
    jobsQuery.data?.rows.find((run) => run.status === 'FAILED')?.id ??
    jobsQuery.data?.rows[0]?.id ??
    null;
  const selectedJobId = manualSelectedJobId ?? defaultSelectedJobId;
  const detailQuery = useBatchJobDetail(selectedJobId);
  const startBatchMutation = useStartBatchRunMutation();

  if (jobsQuery.isLoading) {
    return (
      <PageMessage
        description="배치 실행 이력을 불러오는 중입니다."
        title="Loading Batch Jobs"
      />
    );
  }

  if (jobsQuery.error) {
    return (
      <PageMessage
        description={jobsQuery.error.message}
        title="Batch Jobs Unavailable"
      />
    );
  }

  return (
    <BatchOperationsContent
      key={`${applied.from}:${applied.to}:${applied.status}:${applied.page}`}
      applied={applied}
      filtered={jobsQuery.data?.rows ?? []}
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
  filtered,
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
  filtered: BatchRun[];
  onSelectJob: (jobId: number) => void;
  selectedJobId: number | null;
  selectedRun: BatchRun | null;
  startBatchMutation: ReturnType<typeof useStartBatchRunMutation>;
  summary: BatchSummaryView | null;
  totalCount: number;
}) {
  return (
    <div className="page-stack">
      <BatchOperationsSummary
        isPending={startBatchMutation.isPending}
        onTrigger={() => startBatchMutation.mutate()}
        summary={summary}
      />

      <div className="ops-grid">
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

        <BatchRunDetailPanel selectedRun={selectedRun} />
      </div>

      <BatchOperationsFooter
        filteredCount={filtered.length}
        hasStartError={startBatchMutation.isError}
        totalCount={totalCount}
      />
    </div>
  );
}
