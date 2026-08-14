import { RefetchBadge, StatusBadge } from '@/components/state';
import { noHeadlineCopy } from '@/lib/audience-copy';
import { useCapabilities } from '@/lib/capabilities';
import { formatKstDateTime, formatRelativeFreshness } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

import { KeyPointsBlock } from './key-points-block';

/**
 * 결정 헤더 카드. Latest와 Archive Detail이 공유하는 첫 블록. h1은 mode에
 * 따라 다르지만 나머지 구조는 동일하다.
 */

export type DecisionHeaderCardProps = {
  snapshot: MarketSnapshot;
  mode: 'latest' | 'archive';
  isRefetching?: boolean;
  now?: Date;
};

export function DecisionHeaderCard({
  snapshot,
  mode,
  isRefetching = false,
  now,
}: DecisionHeaderCardProps) {
  // `generatedAtIso`/`metadata` are optional on `MarketSnapshot` purely so
  // hand-written test fixtures predating their restoration keep compiling
  // (see `view-models.ts`) — `mapDailyPageToSnapshot` always sets them, so
  // the `??` fallbacks below only matter for such fixtures, never for real
  // API data.
  const generatedDisplay =
    formatKstDateTime(snapshot.generatedAtIso) ?? snapshot.generatedAt;
  const freshness = formatRelativeFreshness(snapshot.generatedAtIso, now);
  const hasHeadline = (snapshot.globalHeadline ?? '').trim().length > 0;
  const { can } = useCapabilities();
  const audience = { canViewOps: can('ops.view') };

  return (
    <section
      aria-labelledby='page-title'
      className='flex flex-col gap-4 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-5'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <StatusBadge status={snapshot.status} />
        <span className='text-body-sm text-faint'>기준일</span>
        <span className='mono text-[14px] font-semibold'>
          {snapshot.businessDate}
        </span>
        <span aria-hidden='true' className='text-[color:var(--line-strong)]'>
          |
        </span>
        <span className='text-body-sm text-faint'>생성</span>
        <span className='mono text-body-sm text-fg-soft'>
          {generatedDisplay}
        </span>
        {freshness ? (
          <span className='text-body-sm text-fg-soft'>· {freshness} 생성</span>
        ) : null}
        {isRefetching ? <RefetchBadge /> : null}
      </div>

      <div>
        <p className='m-0 mb-2 text-body-sm font-semibold tracking-[0.01em] text-faint'>
          {mode === 'latest'
            ? '최신 시장 브리프'
            : `${snapshot.businessDate} 시장 브리프`}
        </p>
        <h1
          className={cn(
            'm-0 wrap-anywhere text-pretty',
            hasHeadline
              ? 'text-[length:var(--fs-display)] leading-[var(--lh-display)] font-semibold tracking-[var(--ls-display)] text-fg'
              : 'text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-faint'
          )}
          id='page-title'
          tabIndex={-1}
        >
          {hasHeadline ? snapshot.globalHeadline : noHeadlineCopy(audience)}
        </h1>
      </div>

      <KeyPointsBlock keyPoints={snapshot.keyPoints} />
    </section>
  );
}
