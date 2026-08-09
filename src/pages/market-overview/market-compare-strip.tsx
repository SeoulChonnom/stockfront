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
    <div className='grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2'>
      {/* Position *is* the identity — `index` also builds the
          `mk-section-{index}` anchor this tile scrolls to, so it has to match
          the section list's ordering. */}
      {markets.map((market, index) => (
        <MarketCompareTile
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the identity — see above
          key={`${market.label}-${index}`}
          market={market}
        />
      ))}
    </div>
  );
}

export function MarketSectionNavigation({
  markets,
}: {
  markets: MarketSnapshot['markets'];
}) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label='시장 섹션 탐색'
      className='sticky top-0 z-(--z-sticky) min-w-0 max-w-full border-y border-line bg-[color:var(--surface)] shadow-(--sh2) min-[1025px]:rounded-[var(--r-md)] max-[1024px]:top-(--topbar-height) max-[1024px]:pb-[env(safe-area-inset-bottom)]'
    >
      <div
        className='flex h-(--section-nav-height) min-w-0 max-w-full items-center gap-2 overflow-x-auto px-2 [scrollbar-width:none]'
        data-section-nav-scroll
      >
        <span className='shrink-0 text-label font-semibold tracking-[0.06em] text-faint'>
          시장 섹션
        </span>
        {markets.map((market, index) => {
          const targetId = `mk-section-${index}`;

          return (
            <Button
              aria-controls={targetId}
              aria-label={`${market.label} 섹션 이동`}
              className='shrink-0 px-2.5 text-body-sm'
              key={targetId}
              onClick={() => scrollToMarketSection(targetId)}
              size='sm'
              type='button'
              variant='ghost'
            >
              섹션 이동
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

function MarketCompareTile({
  market,
}: {
  market: MarketSnapshot['markets'][number];
}) {
  const lead = market.indices[0];

  return (
    <div className='flex min-w-0 flex-col gap-2 rounded-[var(--r-md)] border border-line bg-[color:var(--surface-2)] p-3.5'>
      <div className='flex min-w-0 items-center gap-2'>
        {/* Show the market scope before its name as plain text. */}
        {market.marketType ? (
          <span className='shrink-0 text-label font-bold tracking-[0.07em] text-faint uppercase'>
            {market.marketType}
          </span>
        ) : null}
        <span className='min-w-0 truncate text-body font-semibold text-fg'>
          {market.label}
        </span>
      </div>
      <div className='flex flex-wrap items-baseline gap-2.5'>
        <span className='text-body-sm text-faint'>
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
                  : 'text-faint'
            )}
          >
            {lead.change} ({lead.changeRate})
          </span>
        ) : null}
      </div>
      <p className='wrap-anywhere m-0 text-[13px] text-fg-soft'>
        {market.summaryTitle || '요약 미생성'}
      </p>
      <div className='mono text-caption text-faint'>
        지수 {market.indices.length}종 · 이슈 {market.clusters.length}건
      </div>
    </div>
  );
}
