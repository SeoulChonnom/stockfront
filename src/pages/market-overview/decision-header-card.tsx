import { RefetchBadge, StatusBadge } from '@/components/state';
import { noHeadlineCopy } from '@/lib/audience-copy';
import { useCapabilities } from '@/lib/capabilities';
import { formatKstDateTime, formatRelativeFreshness } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

import { KeyPointsBlock } from './key-points-block';

/**
 * `<h1>` 자리에는 성격이 다른 세 가지가 온다: 그날의 헤드라인(표제),
 * "브리프가 없습니다"(화면의 이름), 그리고 헤드라인만 빠졌을 때의 안내
 * 문장이다. 안내 문장을 표제 크기로 키우면 읽는 사람이 그걸 그날의
 * 헤드라인으로 착각한다.
 */
function pageTitleClass(
  hasHeadline: boolean,
  hasMarketSections: boolean
): string {
  if (hasHeadline) {
    return 'text-display font-semibold text-fg';
  }

  return hasMarketSections
    ? 'text-lead text-faint'
    : 'text-h1 font-semibold text-fg-soft';
}

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

  /**
   * 배지는 배치 상태가 아니라 **이 페이지가 실제로 담고 있는 것**에서 나온다.
   *
   * `status: 'ready'`인데 `markets`가 비어 있는 스냅샷이 실제로 온다
   * (`emptyMarkets`). 그때 배치 상태를 그대로 그리면 초록 "준비 완료"
   * 배지가 시장 데이터가 하나도 없는 화면 맨 위에 붙는다 — 화면에서 가장
   * 먼저 읽히는 요소가 화면 내용과 정반대를 말하는 셈이다.
   *
   * PRODUCT.md는 정상 스냅샷이 항상 두 시장을 담는다고 규정하므로 이 조합은
   * 원래 오면 안 되는 값이다. 그래도 오면 화면은 사실을 말해야 한다.
   */
  const hasMarketSections = snapshot.markets.length > 0;
  const displayStatus =
    snapshot.status === 'ready' && !hasMarketSections
      ? 'partial'
      : snapshot.status;

  return (
    <section
      aria-labelledby='page-title'
      className='flex flex-col gap-4 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-5'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <StatusBadge status={displayStatus} />
        <span className='text-body-sm text-faint'>기준일</span>
        <span className='tnum text-body font-semibold'>
          {snapshot.businessDate}
        </span>
        <span aria-hidden='true' className='text-[color:var(--line-strong)]'>
          |
        </span>
        <span className='text-body-sm text-faint'>생성</span>
        <span className='tnum text-body-sm text-fg-soft'>
          {generatedDisplay}
        </span>
        {freshness ? (
          <span className='text-body-sm text-fg-soft'>· {freshness} 생성</span>
        ) : null}
        {isRefetching ? <RefetchBadge /> : null}
      </div>

      <div>
        <p className='m-0 mb-2 text-body-sm font-semibold text-faint'>
          {mode === 'latest'
            ? '최신 시장 브리프'
            : `${snapshot.businessDate} 시장 브리프`}
        </p>
        <h1
          className={cn(
            'm-0 wrap-anywhere text-pretty',
            pageTitleClass(hasHeadline, hasMarketSections)
          )}
          id='page-title'
          tabIndex={-1}
        >
          {hasHeadline
            ? snapshot.globalHeadline
            : noHeadlineCopy(audience, { hasMarketSections })}
        </h1>
      </div>

      <KeyPointsBlock keyPoints={snapshot.keyPoints} />
    </section>
  );
}
