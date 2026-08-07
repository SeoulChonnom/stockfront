import { RefetchBadge, StatusBadge } from '@/components/state';
import { formatKstDateTime, formatRelativeFreshness } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

import { MarketCompareStrip } from './market-compare-strip';

/**
 * 결정 헤더 카드 — README §7-2 item 1. Latest와 Archive Detail이 공유하는
 * 첫 블록. h1은 mode에 따라 다르지만(§7-2 vs §7-3) 나머지 구조는 동일하다.
 */

const NO_HEADLINE_COPY =
  '글로벌 헤드라인이 생성되지 않았습니다. AI 요약 단계가 실패했을 수 있습니다 — 아래 상태와 배치 로그에서 원인을 확인하세요.';

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
  const metadata = snapshot.metadata;
  const hasHeadline = (snapshot.globalHeadline ?? '').trim().length > 0;

  return (
    <section
      aria-labelledby='page-title'
      className='flex flex-col gap-4 rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)] p-5'
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <StatusBadge status={snapshot.status} />
        <span className='text-[12.5px] text-faint'>기준일</span>
        <span className='mono text-[14px] font-semibold'>
          {snapshot.businessDate}
        </span>
        <span aria-hidden='true' className='text-[color:var(--line-strong)]'>
          |
        </span>
        <span className='text-[12.5px] text-faint'>생성</span>
        <span className='mono text-[12.5px] text-fg-soft'>
          {generatedDisplay}
        </span>
        {freshness ? (
          <span className='text-[12.5px] text-fg-soft'>· {freshness} 생성</span>
        ) : null}
        {isRefetching ? <RefetchBadge /> : null}
      </div>

      <div>
        <h1
          className='m-0 mb-2 text-[15px] font-semibold tracking-[0.01em] text-faint'
          id='page-title'
          tabIndex={-1}
        >
          {mode === 'latest'
            ? '최신 시장 브리프'
            : `${snapshot.businessDate} 시장 브리프`}
        </h1>
        <p
          className={cn(
            'm-0 wrap-anywhere text-pretty',
            hasHeadline
              ? 'text-[length:var(--fs-display)] leading-[var(--lh-display)] font-semibold tracking-[var(--ls-display)] text-fg'
              : 'text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-faint'
          )}
        >
          {hasHeadline ? snapshot.globalHeadline : NO_HEADLINE_COPY}
        </p>
      </div>

      <MarketCompareStrip markets={snapshot.markets} />

      <div className='mono flex flex-wrap gap-x-4.5 gap-y-2 border-t border-line pt-3 text-[11.5px] text-faint'>
        {metadata ? (
          <span className='whitespace-nowrap'>
            원문 {metadata.rawNewsCount}건 → 정제 {metadata.processedNewsCount}
            건 → 클러스터 {metadata.clusterCount}건
          </span>
        ) : null}
        <span className='whitespace-nowrap'>
          pageId {snapshot.pageId} · v{snapshot.versionNo}
        </span>
        {metadata?.lastUpdatedAt ? (
          <span className='whitespace-nowrap'>
            마지막 갱신 {metadata.lastUpdatedAt}
          </span>
        ) : null}
      </div>
    </section>
  );
}
