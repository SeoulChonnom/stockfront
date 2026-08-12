import { DirectionIndicator, directionTextClass } from '@/components/state';
import { cn } from '@/lib/utils';
import type { MarketIndex } from '@/lib/view-models';

import { orderIndices } from './index-order';

const NO_VALUE = '-';

/**
 * 모바일 대표 지수. 가로 스크롤 없이 세로로 쌓이는 카드이며,
 * 데스크톱 표와 같은 지수 구성을 유지한다(생략 없음).
 */
export function MarketIndexCards({ indices }: { indices: MarketIndex[] }) {
  return (
    <ul className='m-0 flex list-none flex-col gap-2 p-[18px]'>
      {orderIndices(indices).map((item, position) => (
        <li
          className='min-w-0 rounded-[var(--r-md)] border border-line bg-[color:var(--surface-2)] p-3'
          // biome-ignore lint/suspicious/noArrayIndexKey: code is nullable and label isn't guaranteed unique — see market-index-table.tsx
          key={`${item.code ?? item.label}-${position}`}
        >
          <div className='text-body font-semibold text-fg'>{item.label}</div>
          {item.value === NO_VALUE ? (
            <div className='text-body-sm text-faint'>데이터 없음</div>
          ) : (
            <>
              <div className='mono text-[length:var(--fs-h2)] font-semibold'>
                {item.value}
              </div>
              <div
                className={cn(
                  'mono flex flex-wrap items-center gap-2 text-body',
                  directionTextClass(item.direction)
                )}
              >
                <DirectionIndicator direction={item.direction} />
                <span>{item.change}</span>
                <span>{item.changeRate}</span>
              </div>
              {item.high === NO_VALUE && item.low === NO_VALUE ? null : (
                <div className='mono text-body-sm text-faint'>
                  고가 {item.high} · 저가 {item.low}
                </div>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
