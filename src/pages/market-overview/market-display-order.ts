import type { MarketSnapshot } from '@/lib/view-models';

/**
 * 시장 섹션의 화면 표시 순서. 한국이 먼저 온다
 * (PRODUCT.md "화면 표시 순서는 한국이 항상 먼저 온다").
 *
 * API의 `markets[]`는 계속 `[US, KR]` 순서로 오고 백엔드는 바뀌지 않는다 —
 * 재정렬은 여기서만 일어난다. 그래서 각 항목은 원래 배열 인덱스를 함께
 * 들고 다닌다: `?market=`의 위치 폴백과 섹션 id가 이 값을 쓰기 때문에,
 * 표시 위치로 바꿔 넣으면 새로고침 때 다른 시장이 열린다.
 *
 * `index-order.ts`의 `orderIndices()`와 같은 규약을 따른다 — 목록에 없는
 * `marketType`은 원래 순서 그대로 뒤에 붙이고, 어떤 경우에도 시장을
 * 제외하지 않는다.
 */

export type DisplayMarket = {
  market: MarketSnapshot['markets'][number];
  /** `markets[]`에서의 원래 위치. 표시 위치가 아니다. */
  index: number;
};

const DISPLAY_RANK: Record<string, number> = {
  KR: 0,
  US: 1,
};

const UNRANKED = Number.MAX_SAFE_INTEGER;

export function orderMarketsForDisplay(
  markets: MarketSnapshot['markets']
): DisplayMarket[] {
  return markets
    .map((market, index) => ({ market, index }))
    .sort((left, right) => {
      const leftRank =
        DISPLAY_RANK[left.market.marketType?.toUpperCase() ?? ''] ?? UNRANKED;
      const rightRank =
        DISPLAY_RANK[right.market.marketType?.toUpperCase() ?? ''] ?? UNRANKED;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.index - right.index;
    });
}
