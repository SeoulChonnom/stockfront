import { TriangleAlert } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import { InfoRow } from '../../components/ui';
import type { BatchRun } from '../../lib/view-models';

export function BatchRunDetailPanel({
  selectedRun,
}: {
  selectedRun: BatchRun | null;
}) {
  return (
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
  );
}
