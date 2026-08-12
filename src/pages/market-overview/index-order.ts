import type { MarketIndex } from '@/lib/view-models';

/**
 * 대표 지수 표시 순서. 아래 목록에 없는 코드는 백엔드가 준 순서 그대로
 * 뒤에 붙인다. 어떤 경우에도 지수를 제외하지 않는다.
 */
const RANK: Record<string, number> = {
  '^DJI': 0,
  '^GSPC': 1,
  '^IXIC': 2,
  KS11: 0,
  KQ11: 1,
};

const UNRANKED = Number.MAX_SAFE_INTEGER;

export function orderIndices(indices: MarketIndex[]): MarketIndex[] {
  return indices
    .map((item, position) => ({ item, position }))
    .sort((left, right) => {
      const leftRank = RANK[left.item.code ?? ''] ?? UNRANKED;
      const rightRank = RANK[right.item.code ?? ''] ?? UNRANKED;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.position - right.position;
    })
    .map((entry) => entry.item);
}
