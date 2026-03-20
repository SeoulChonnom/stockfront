import {
  CheckCircle2,
  ChevronRight,
  Database,
  Filter,
  Play,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

import { InfoRow } from '../components/ui';
import {
  getRelativeIso,
  getStatusClass,
  getTodayIso,
  normalizeDateParam,
} from '../lib/app-state';
import { buildUrl, navigate } from '../lib/router';
import { batchRuns, type BatchRun } from '../mock-data';

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

  const filtered = useMemo(() => {
    return batchRuns.filter((run) => {
      if (applied.status && run.status !== applied.status) {
        return false;
      }

      return run.businessDate <= applied.from && run.businessDate >= applied.to;
    });
  }, [applied.from, applied.status, applied.to]);

  const selectedRun =
    filtered.find((run) => run.status === 'FAILED') ??
    filtered[0] ??
    batchRuns[0];

  return (
    <BatchOperationsContent
      key={`${applied.from}:${applied.to}:${applied.status}:${applied.page}`}
      applied={applied}
      filtered={filtered}
      selectedRun={selectedRun}
    />
  );
}

function BatchOperationsContent({
  applied,
  filtered,
  selectedRun,
}: {
  applied: {
    from: string;
    to: string;
    status: string;
  };
  filtered: BatchRun[];
  selectedRun: BatchRun;
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
          <h1>Batch Operations</h1>
          <p>
            파이프라인 상태, 실행 시간, 실패 로그를 한 화면에서 확인하는 운영용
            모니터링 보드입니다. 1차 구현에서는 API 없이 목업 데이터와 필터
            상태만 URL query에 반영합니다.
          </p>
        </div>
        <Button type="button" variant="primary">
          <Play size={16} />
          Manual Trigger
        </Button>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Recent Success Rate"
          tone="success"
          value="99.4%"
          supporting="+0.2% vs last 24h"
        />
        <StatCard
          icon={<Timer size={18} />}
          label="Avg Processing Time"
          tone="primary"
          value="14m 22s"
          supporting="Target: < 20m per batch"
        />
        <StatCard
          icon={<Database size={18} />}
          label="Market Sync Quality"
          tone="neutral"
          value="Tier-1"
          supporting="No drift detected in 7 days"
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
                <label htmlFor="ops-status">Status</label>
                <Select
                  onValueChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      status: value === 'all' ? '' : value,
                    }))
                  }
                  value={draft.status || undefined}
                >
                  <SelectTrigger aria-label="Batch status">
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((run) => (
                    <BatchRow key={run.id} run={run} />
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
                  selectedRun.status === 'FAILED' ? 'trend-down' : 'trend-up'
                }
                size={18}
              />
              <h2>Selected Run Detail</h2>
            </div>
            <div className="log-box">{selectedRun.detail}</div>
            <div className="metric-list">
              <InfoRow label="Job ID" value={selectedRun.id} />
              <InfoRow label="Page Version" value="v0.1.0-poc" />
              <InfoRow label="Date" value={selectedRun.businessDate} />
              <InfoRow label="Duration" value={selectedRun.duration} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BatchRow({ run }: { run: BatchRun }) {
  return (
    <TableRow className={run.status === 'FAILED' ? 'row-alert' : ''}>
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
