import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

import { marketPanelId, marketTabId } from './market-tab-ids';

/**
 * US/KR 세그먼트 탭. roving tabindex로 활성 탭만 탭 순서에 두고,
 * ←/→/Home/End로 이동한다. 색상만으로 선택 상태를 표현하지 않기 위해
 * 굵기와 하단 인디케이터를 함께 쓴다.
 */
export function MarketTabs({
  markets,
  selectedIndex,
  onSelect,
}: {
  markets: MarketSnapshot['markets'];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = markets.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onSelect(selectedIndex === last ? 0 : selectedIndex + 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onSelect(selectedIndex === 0 ? last : selectedIndex - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      onSelect(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      onSelect(last);
    }
  }

  return (
    <div
      aria-label='시장 선택'
      className='flex min-w-0 gap-1 border-b border-line'
      role='tablist'
    >
      {markets.map((market, index) => {
        const selected = index === selectedIndex;

        return (
          <button
            aria-controls={marketPanelId(index)}
            aria-selected={selected}
            className={cn(
              'min-h-tap min-w-0 border-b-2 px-4 text-body font-semibold transition-colors duration-(--dur-fast)',
              selected
                ? 'border-b-[color:var(--primary)] text-[color:var(--primary)]'
                : 'border-b-transparent text-fg-soft hover:text-fg'
            )}
            id={marketTabId(index)}
            key={marketTabId(index)}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
            role='tab'
            tabIndex={selected ? 0 : -1}
            type='button'
          >
            {market.marketType ? (
              <span className='mono me-1.5 text-label'>
                {market.marketType}
              </span>
            ) : null}
            {market.label}
          </button>
        );
      })}
    </div>
  );
}
