import {
  CheckCircle2,
  ChevronRight,
  Database,
  Filter,
  Play,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { InfoRow, PageMessage } from '../components/ui';
import {
  getRelativeIso,
  getStatusClass,
  getTodayIso,
  normalizeDateParam,
} from '../lib/app-state';
import {
  useBatchJobDetail,
  useBatchJobs,
  useStartBatchRunMutation,
} from '../lib/query-hooks';
import { buildUrl, navigate } from '../lib/router';
import type { BatchRun, BatchSummaryView } from '../lib/view-models';

export function BatchOperationsPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}) {
  const defaults = {
    from: getTodayIso(),
    to: getRelativeIso(14),
    status: '',
    page: '1',
  };

  const applied = {
    from: normalizeDateParam(searchParams.get('from'), defaults.from),
    to: normalizeDateParam(searchParams.get('to'), defaults.to),
    status: searchParams.get('status') ?? defaults.status,
    page: Number(searchParams.get('page') ?? defaults.page) || 1,
  };

  const jobsQuery = useBatchJobs({
    fromDate: applied.from,
    toDate: applied.to,
    status: applied.status || undefined,
    page: applied.page,
    size: 20,
  });
  const [manualSelectedJobId, setManualSelectedJobId] = useState<number | null>(
    null,
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
  const [draft, setDraft] = useState({
    from: applied.from,
    to: applied.to,
    status: applied.status,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(
      buildUrl('/ops/batches', {
        from: draft.from,
        to: draft.to,
        status: draft.status,
        page: 1,
      }),
    );
  }

  return (
    <div className="page-stack">
      <section className="page-intro split-intro">
        <div>
          <span className="eyebrow">Operations</span>
          <h1 id="page-title" tabIndex={-1}>
            Batch Operations
          </h1>
          <p>
            파이프라인 상태, 실행 시간, 실패 로그를 한 화면에서 확인하는 운영용
            모니터링 보드입니다. 목록과 상세는 API 응답을 분리 조회합니다.
          </p>
        </div>
        <Button
          disabled={startBatchMutation.isPending}
          onClick={() => startBatchMutation.mutate()}
          type="button"
          variant="primary"
        >
          <Play size={16} />
          {startBatchMutation.isPending ? 'Triggering...' : 'Manual Trigger'}
        </Button>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Recent Success Rate"
          tone="success"
          value={summary?.successRate ?? '0.0%'}
          supporting={summary?.successSupporting ?? 'No data'}
        />
        <StatCard
          icon={<Timer size={18} />}
          label="Avg Processing Time"
          tone="primary"
          value={summary?.avgProcessingTime ?? '-'}
          supporting={summary?.durationSupporting ?? 'No data'}
        />
        <StatCard
          icon={<Database size={18} />}
          label="Market Sync Quality"
          tone="neutral"
          value={summary?.marketSyncQuality ?? '-'}
          supporting={summary?.qualitySupporting ?? 'No data'}
        />
      </section>

      <div className="ops-grid">
        <Card className="panel table-panel">
          <CardContent className="p-6">
            <div className="table-panel-head">
              <div>
                <h2>Batch Execution History</h2>
                <p>US / KR pipeline health and execution timelines</p>
              </div>
              <div className="tag-row">
                <span className="soft-chip">US Market</span>
                <span className="soft-chip">KR Market</span>
              </div>
            </div>

            <form className="ops-filter-bar" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="ops-status-trigger" id="ops-status-label">
                  Status
                </label>
                <Select
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: value === 'all' ? '' : value,
                    }))
                  }
                  value={draft.status || undefined}
                >
                  <SelectTrigger
                    aria-labelledby="ops-status-label"
                    id="ops-status-trigger"
                  >
                    <SelectValue placeholder="ALL STATUSES" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ALL STATUSES</SelectItem>
                    <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                    <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <label htmlFor="ops-from">From</label>
                <Input
                  id="ops-from"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      from: event.target.value,
                    }))
                  }
                  type="date"
                  value={draft.from}
                />
              </div>
              <div className="field">
                <label htmlFor="ops-to">To</label>
                <Input
                  id="ops-to"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      to: event.target.value,
                    }))
                  }
                  type="date"
                  value={draft.to}
                />
              </div>
              <Button className="ops-apply" type="submit" variant="ghost">
                <Filter size={15} />
                Apply Filters
              </Button>
            </form>

            <div className="table-wrap">
              <Table className="data-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Bus. Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Counts (S/R/C)</TableHead>
                    <TableHead>
                      <span className="sr-only">Detail indicator</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        조회 조건에 맞는 배치 이력이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((run) => (
                    <BatchRow
                      isSelected={selectedJobId === run.id}
                      key={run.id}
                      onSelect={onSelectJob}
                      run={run}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="panel ops-detail">
          <CardContent className="grid gap-6 p-6">
            <div className="panel-header">
              <TriangleAlert
                className={
                  selectedRun?.status === 'FAILED' ? 'trend-down' : 'trend-up'
                }
                size={18}
              />
              <h2>Selected Run Detail</h2>
            </div>
            <div className="log-box">
              {selectedRun?.detail ?? '선택된 배치가 없습니다.'}
            </div>
            <div className="metric-list">
              <InfoRow
                label="Job ID"
                value={selectedRun ? String(selectedRun.id) : '-'}
              />
              <InfoRow
                label="Page Version"
                value={selectedRun?.pageVersion ?? '-'}
              />
              <InfoRow label="Date" value={selectedRun?.businessDate ?? '-'} />
              <InfoRow label="Duration" value={selectedRun?.duration ?? '-'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="page-intro">
        <p>
          Showing <strong>{filtered.length}</strong> of{' '}
          <strong>{totalCount}</strong> batch jobs
        </p>
        {startBatchMutation.isError && (
          <p>배치 실행 요청에 실패했습니다. 다시 시도해 주세요.</p>
        )}
      </footer>
    </div>
  );
}

function BatchRow({
  isSelected,
  onSelect,
  run,
}: {
  isSelected: boolean;
  onSelect: (jobId: number) => void;
  run: BatchRun;
}) {
  return (
    <TableRow
      aria-selected={isSelected}
      className={run.status === 'FAILED' ? 'row-alert' : ''}
      onClick={() => onSelect(run.id)}
      style={{ cursor: 'pointer' }}
    >
      <TableCell>
        <div className="market-cell">
          <span
            className={`market-bar ${run.market === 'US Market' ? 'market-bar-us' : 'market-bar-kr'}`}
          />
          <strong>{run.market}</strong>
        </div>
      </TableCell>
      <TableCell className="numeric">{run.businessDate}</TableCell>
      <TableCell>
        <span className={getStatusClass(run.status)}>{run.status}</span>
      </TableCell>
      <TableCell>
        <div className="timeline-cell">
          <span>
            {run.startedAt} → {run.finishedAt}
          </span>
          <small>Duration: {run.duration}</small>
        </div>
      </TableCell>
      <TableCell className="numeric">{run.counts}</TableCell>
      <TableCell className="table-end-icon">
        <ChevronRight size={16} />
      </TableCell>
    </TableRow>
  );
}

function StatCard({
  icon,
  label,
  tone,
  value,
  supporting,
}: {
  icon: ReactNode;
  label: string;
  tone: 'success' | 'primary' | 'neutral';
  value: string;
  supporting: string;
}) {
  return (
    <article className={`panel stat-card stat-card-${tone}`}>
      <div className="stat-card-head">
        <span className="muted-label">{label}</span>
        <span>{icon}</span>
      </div>
      <h3>{value}</h3>
      <p>{supporting}</p>
    </article>
  );
}
