import { type KeyboardEvent, useRef } from 'react';

import { cn } from '@/lib/utils';
import type { MarketSnapshot } from '@/lib/view-models';

import { marketPanelId, marketTabId } from './market-tab-ids';

/**
 * US/KR 세그먼트 탭. roving tabindex로 활성 탭만 탭 순서에 두고,
 * ←/→/Home/End로 이동한다.
 *
 * 선택 상태는 색상 외에 두 가지 신호를 더 갖는다 — 선택된 탭만 굵게
 * (font-bold vs font-normal), 그리고 하단 인디케이터가 선택된 탭에만
 * 그려진다. 화면을 흑백으로 렌더링해도 활성 탭을 구분할 수 있어야 한다.
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
  // Every tab button is always mounted (only the selected panel is
  // conditionally rendered), so this ref array survives selection changes —
  // moving DOM focus to the newly selected tab does not race a re-render.
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAndFocus(index: number) {
    onSelect(index);
    tabRefs.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = markets.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectAndFocus(selectedIndex === last ? 0 : selectedIndex + 1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectAndFocus(selectedIndex === 0 ? last : selectedIndex - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      selectAndFocus(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      selectAndFocus(last);
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
            // Only the selected panel is mounted, so pointing an unselected
            // tab at a non-existent id would be a dangling ARIA reference.
            aria-controls={selected ? marketPanelId(index) : undefined}
            aria-selected={selected}
            className={cn(
              'min-h-tap min-w-0 border-b-2 border-b-transparent px-4 text-body transition-colors duration-(--dur-fast)',
              selected
                ? 'border-b-[color:var(--primary)] font-bold text-[color:var(--primary)]'
                : 'font-normal text-fg-soft hover:text-fg'
            )}
            id={marketTabId(index)}
            key={marketTabId(index)}
            onClick={() => onSelect(index)}
            onKeyDown={handleKeyDown}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
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
