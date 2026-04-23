import { CheckCircle2, Database, Play, Timer } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

import type { BatchSummaryView } from '../../lib/view-models';

export function BatchOperationsSummary({
  isPending,
  onTrigger,
  summary,
}: {
  isPending: boolean;
  onTrigger: () => void;
  summary: BatchSummaryView | null;
}) {
  return (
    <>
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
          disabled={isPending}
          onClick={onTrigger}
          type="button"
          variant="primary"
        >
          <Play size={16} />
          {isPending ? 'Triggering...' : 'Manual Trigger'}
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
    </>
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
