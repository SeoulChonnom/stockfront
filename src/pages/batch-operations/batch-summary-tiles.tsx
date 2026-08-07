import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { formatDurationKo } from './format-batch';

type TileTone = 'danger' | 'warning' | 'neutral';

const TILE_BAR_CLASSES: Readonly<Record<TileTone, string>> = {
  danger: 'border-l-[3px] border-l-[color:var(--danger)]',
  warning: 'border-l-[3px] border-l-[color:var(--warning)]',
  neutral: '',
};

const TILE_NUMBER_CLASSES: Readonly<Record<TileTone, string>> = {
  danger: 'text-[color:var(--danger)]',
  warning: 'text-[color:var(--warning)]',
  neutral: 'text-fg',
};

function SummaryTile({
  label,
  value,
  supporting,
  tone,
}: {
  label: string;
  value: number;
  supporting: string;
  tone: TileTone;
}) {
  return (
    <Card
      className={cn(
        // Keep tile spacing independent from its status tone.
        'min-w-0 px-4 py-3.5',
        TILE_BAR_CLASSES[tone]
      )}
    >
      <p className='m-0 text-label font-semibold tracking-[0.07em] text-faint uppercase'>
        {label}
      </p>
      <p
        className={cn(
          'mono m-0 text-[26px] font-semibold',
          TILE_NUMBER_CLASSES[tone]
        )}
      >
        {value}
      </p>
      <p className='wrap-anywhere m-0 text-[12px] text-fg-soft'>{supporting}</p>
    </Card>
  );
}

export function BatchSummaryTiles({
  failedCount,
  partialCount,
  successCount,
  avgDurationSeconds,
}: {
  failedCount: number;
  partialCount: number;
  successCount: number;
  avgDurationSeconds: number | null;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Biome suggests <fieldset>, but these are read-only status tiles, not grouped form controls
    <div
      aria-label='배치 실행 요약'
      className='grid min-w-0 grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1181px]:grid-cols-3'
      role='group'
    >
      <SummaryTile
        label='실패'
        supporting='스냅샷 미생성 · 재실행 필요'
        tone='danger'
        value={failedCount}
      />
      <SummaryTile
        label='부분 실패'
        supporting='일부 지수·요약 누락'
        tone='warning'
        value={partialCount}
      />
      <SummaryTile
        label='성공'
        supporting={`평균 소요 ${formatDurationKo(avgDurationSeconds)}`}
        tone='neutral'
        value={successCount}
      />
    </div>
  );
}
