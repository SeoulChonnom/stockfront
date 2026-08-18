import { DirectionIndicator, directionTextClass } from '@/components/state';
import { cn } from '@/lib/utils';
import type { MarketIndex } from '@/lib/view-models';

import { orderIndices } from './index-order';
import type { DisplayMarket } from './market-display-order';
import { marketHeadingId } from './market-section-ids';

/**
 * 판단층. 아래 시장 섹션들을 읽기 전에 "오늘 두 시장이 어느 쪽으로
 * 움직였나"만 한 화면에서 끝내기 위한 압축 밴드다
 * (PRODUCT.md의 "10~20초 안에 두 시장의 핵심 파악").
 *
 * 대시보드 위젯이 아니다 — 차트도, 스파크라인도, 추세도 없고 오늘 숫자와
 * 방향뿐이다. sticky도 아니다: 아래 검증층을 읽는 동안 판단층이 따라다닐
 * 이유가 없다.
 *
 * 등락은 **맨 숫자 + ▲▼ + 부호**로만 표시하고 색면(배경/테두리)을 쓰지
 * 않는다. 이 앱에서 상태(성공/부분/실패)는 테두리와 단어가 있는 배지이고
 * 방향은 맨 숫자다. `--up`이 `--danger`와 같은 빨강 계열이라 두 의미를
 * 갈라놓는 것이 색이 아니라 이 표기 구분이므로, 밴드에서 등락을 배지처럼
 * 그리면 그 구분이 무너진다 (PRODUCT.md "방향과 상태는 색이 아니라 표기
 * 방식으로 가른다").
 */

/** 한 행에 노출할 지수 개수. 나머지는 아래 시장 섹션의 대표 지수 표에서 본다. */
const BAND_INDEX_LIMIT = 4;

export type MarketCompareBandProps = {
  markets: DisplayMarket[];
  onSelectMarket: (index: number) => void;
};

export function MarketCompareBand({
  markets,
  onSelectMarket,
}: MarketCompareBandProps) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby='market-compare-band-title'
      className='flex min-w-0 flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)]'
    >
      <h2
        className='m-0 border-b border-line px-[18px] py-3 text-h2 font-semibold'
        id='market-compare-band-title'
      >
        두 시장 한눈에
      </h2>
      <ul className='m-0 flex list-none flex-col p-0'>
        {markets.map(({ market, index }) => (
          <li
            className='min-w-0 border-b border-line last:border-b-0'
            key={index}
          >
            <BandRow
              index={index}
              market={market}
              onSelect={() => onSelectMarket(index)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BandRow({
  market,
  index,
  onSelect,
}: {
  market: DisplayMarket['market'];
  index: number;
  onSelect: () => void;
}) {
  const indices = orderIndices(market.indices).slice(0, BAND_INDEX_LIMIT);

  return (
    <button
      // 이 행은 아래 해당 시장 섹션으로 가는 이동 수단이다. 제목을 다시
      // 읽히지 않도록 섹션 제목 id로 이름을 빌려 온다.
      aria-describedby={marketHeadingId(index)}
      className='flex w-full min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-3 text-left transition-colors duration-(--dur-fast) hover:bg-[color:var(--surface-2)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus)]'
      onClick={onSelect}
      type='button'
    >
      <span className='flex min-w-0 shrink-0 items-center gap-2'>
        {market.marketType ? (
          <span className='tnum rounded-[var(--r-sm)] border border-[color:var(--line-strong)] px-1.75 py-0.5 text-label font-semibold tracking-caps text-fg-soft'>
            {market.marketType}
          </span>
        ) : null}
        <span className='text-body font-semibold text-fg'>{market.label}</span>
      </span>
      {indices.length > 0 ? (
        <span className='flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5'>
          {indices.map((item) => (
            <IndexReading item={item} key={item.code ?? item.label} />
          ))}
        </span>
      ) : (
        // 결손을 숨기지 않는다 — 행 자체가 사라지면 한 시장이 통째로
        // 빠졌는지 지수만 빠졌는지 구분할 수 없다.
        <span className='text-body-sm text-faint'>지수 없음</span>
      )}
    </button>
  );
}

function IndexReading({ item }: { item: MarketIndex }) {
  return (
    <span className='flex min-w-0 items-baseline gap-1.5'>
      <span className='wrap-anywhere text-body-sm text-fg-soft'>
        {item.label}
      </span>
      <span
        className={cn(
          'tnum flex items-center gap-1 text-body font-semibold',
          directionTextClass(item.direction)
        )}
      >
        <DirectionIndicator direction={item.direction} />
        {item.changeRate}
      </span>
    </span>
  );
}
