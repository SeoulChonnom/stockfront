import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { formatDurationKo } from './format-batch';

type TileTone = 'danger' | 'warning' | 'neutral';

/**
 * 타일은 색 막대를 달지 않는다.
 *
 * 예전에는 실패·부분 실패 타일 왼쪽에 3px 색 막대가 있었다. 그런데 바로
 * 아래 숫자가 이미 같은 색이라 막대는 같은 말을 두 번 하고 있었고, 성공
 * 타일에는 막대가 없어 세 타일이 서로 다른 골격을 갖고 있었다. 같은 화면의
 * 주의 배너에서도 굵은 좌측 막대를 걷어냈으므로
 * (`src/components/state/tone-surface.ts`), 여기만 남기면 한 화면 안에서
 * 관용구가 갈린다. 톤은 숫자 색이 그대로 전한다.
 */
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
    <Card className='min-w-0 px-2 py-2 min-[641px]:px-4 min-[641px]:py-3.5'>
      <p className='m-0 text-label font-semibold tracking-caps text-faint uppercase'>
        {label}
      </p>
      <p
        className={cn(
          'tnum m-0 text-h1 font-semibold',
          TILE_NUMBER_CLASSES[tone]
        )}
      >
        {value}
      </p>
      <p className='wrap-anywhere m-0 text-body-sm text-fg-soft min-[641px]:text-label'>
        {supporting}
      </p>
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
      className='grid min-w-0 grid-cols-3 gap-2 min-[641px]:grid-cols-2 min-[641px]:gap-3 min-[1181px]:grid-cols-3'
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
