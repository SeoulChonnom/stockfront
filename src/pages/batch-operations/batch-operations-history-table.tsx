import { ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getStatusClass } from '../../lib/app-state';
import type { BatchRun } from '../../lib/view-models';
import { BatchOperationsFilters } from './batch-operations-filters';

export function BatchOperationsHistoryTable({
  filtered,
  initialFilters,
  onApplyFilters,
  onSelectJob,
  selectedJobId,
}: {
  filtered: BatchRun[];
  initialFilters: {
    from: string;
    to: string;
    status: string;
  };
  onApplyFilters: (filters: {
    from: string;
    to: string;
    status: string;
  }) => void;
  onSelectJob: (jobId: number) => void;
  selectedJobId: number | null;
}) {
  return (
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

        <BatchOperationsFilters
          initialFilters={initialFilters}
          onApply={onApplyFilters}
        />

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
        <Button
          aria-label={`Select batch job ${run.id}`}
          onClick={() => onSelect(run.id)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronRight size={16} />
        </Button>
      </TableCell>
    </TableRow>
  );
}
