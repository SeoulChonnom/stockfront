import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 시장 비교 스트립 — README §7-2 결정 헤더 카드의 일부. 2열 그리드(≤1024px
 * 1열). 대표 지수는 시장의 첫 번째 지수(README/디자인 레퍼런스 모두
 * `indices[0]`를 "대표"로 취급 — `docs/design_v2/handoff_v2/Market Brief
 * v2.dc.html`의 `compare` 계산 참고).
 *
 * The market-type code is already mapped by the view model and is shown on
 * each comparison tile.
 */

function scrollToMarketSection(targetId: string) {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const headingId = target.getAttribute('aria-labelledby');
  const heading = headingId ? document.getElementById(headingId) : null;
  heading?.focus({ preventScroll: true });

  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }
}

export function MarketCompareStrip({
  markets,
}: {
  markets: MarketSnapshot['markets'];
}) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
      {/* Position *is* the identity — `index` also builds the
          `mk-section-{index}` anchor this tile scrolls to, so it has to match
          the section list's ordering. */}
      {markets.map((market, index) => (
        <MarketCompareTile
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see above
          key={`${market.label}-${index}`}
          market={market}
          targetId={`mk-section-${index}`}
        />
      ))}
    </div>
  );
}

function MarketCompareTile({
  market,
  targetId,
}: {
  market: MarketSnapshot['markets'][number];
  targetId: string;
}) {
  const lead = market.indices[0];

  return (
    <div className='flex min-w-0 flex-col gap-2 rounded-[var(--r-md)] border border-[color:var(--line)] bg-[color:var(--surface-2)] p-3.5'>
      <div className='flex min-w-0 items-center gap-2'>
        {/* Show the market scope before its name as plain text. */}
        {market.marketType ? (
          <span className='shrink-0 text-[11px] font-bold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'>
            {market.marketType}
          </span>
        ) : null}
        <span className='min-w-0 truncate text-[13.5px] font-semibold text-[color:var(--text)]'>
          {market.label}
        </span>
        <Button
          className='ml-auto min-h-8 shrink-0 px-2.5 text-[12px]'
          onClick={() => scrollToMarketSection(targetId)}
          size='sm'
          type='button'
          variant='ghost'
        >
          섹션 이동
        </Button>
      </div>
      <div className='flex flex-wrap items-baseline gap-2.5'>
        <span className='text-[12.5px] text-[color:var(--text-faint)]'>
          {lead ? lead.label : '지수 없음'}
        </span>
        <span className='mono text-[21px] font-semibold'>
          {lead ? lead.value : '-'}
        </span>
        {lead ? (
          <span
            className={cn(
              'mono text-[14px] font-semibold',
              lead.direction === 'up'
                ? 'text-[color:var(--up)]'
                : lead.direction === 'down'
                  ? 'text-[color:var(--down)]'
                  : 'text-[color:var(--text-faint)]'
            )}
          >
            {lead.change} ({lead.changeRate})
          </span>
        ) : null}
      </div>
      <p className='wrap-anywhere m-0 text-[13px] text-[color:var(--text-soft)]'>
        {market.summaryTitle || '요약 미생성'}
      </p>
      <div className='mono text-[11.5px] text-[color:var(--text-faint)]'>
        지수 {market.indices.length}종 · 이슈 {market.clusters.length}건
      </div>
    </div>
  );
}
