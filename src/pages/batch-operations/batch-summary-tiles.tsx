import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { formatDurationKo } from './format-batch';

/**
 * README §7-6 point 4: 3 tiles in FAILURE-FIRST order (실패 → 부분 실패 →
 * 성공), 3-col grid that collapses to 2-col at ≤1180px. "실패가 0이어도
 * 화면 전체를 위험색으로 물들이지 않는다 — 강조는 좌측 바와 숫자 색까지만"
 * — so only the 실패/부분 실패 tiles get a tone-colored left bar + number,
 * never a tone-colored background or page-wide wash.
 */

type TileTone = 'danger' | 'warning' | 'neutral';

const TILE_BAR_CLASSES: Readonly<Record<TileTone, string>> = {
  danger: 'shadow-[inset_3px_0_0_var(--danger)]',
  warning: 'shadow-[inset_3px_0_0_var(--warning)]',
  neutral: '',
};

const TILE_NUMBER_CLASSES: Readonly<Record<TileTone, string>> = {
  danger: 'text-[color:var(--danger)]',
  warning: 'text-[color:var(--warning)]',
  neutral: 'text-[color:var(--text)]',
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
        // U4 (parity cycle 5): design's tile padding is 14px top/bottom,
        // 16px left/right — not a uniform `p-4` (16px all sides).
        'min-w-0 px-4 py-3.5',
        TILE_BAR_CLASSES[tone]
      )}
    >
      <p className='m-0 text-[11px] font-semibold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'>
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
      <p className='wrap-anywhere m-0 text-[12px] text-[color:var(--text-soft)]'>
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
      // Found via the corrected `summary-tiles` probe (cycle 2, section 0):
      // `max-[1180px]:grid-cols-2` applied at EVERY width ≤1180px, including
      // mobile, so this never actually collapsed to the design's 1-column
      // mobile layout (design steps 3→2 at 1180px, 2→1 at 640px). Rewritten
      // mobile-first with non-overlapping min-width ranges so there's no
      // ambiguity about which rule wins at a given width.
      className='grid min-w-0 grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1181px]:grid-cols-3'
      role='group'
    >
      {/* D9: supporting copy matches the design's exact wording. */}
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
