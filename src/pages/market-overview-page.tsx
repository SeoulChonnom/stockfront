import { useEffect } from 'react';
import {
  buildScrollKey,
  getScrollPosition,
} from '@/components/shell/scroll-restoration';
import { markArrival } from '@/lib/arrival-mark';
import { useCapabilities } from '@/lib/capabilities';
import { buildUrl, navigate, useUrlState } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

import { ArchiveModeBand } from './market-overview/archive-mode-band';
import { DecisionHeaderCard } from './market-overview/decision-header-card';
import { EmptyMarketsPanel } from './market-overview/empty-markets-panel';
import { MarketCompareBand } from './market-overview/market-compare-band';
import { orderMarketsForDisplay } from './market-overview/market-display-order';
import { MarketSection } from './market-overview/market-section';
import {
  marketHeadingId,
  marketSectionId,
} from './market-overview/market-section-ids';
import {
  type ClusterOriginQuery,
  extractFilterQuery,
} from './market-overview/navigation';
import { PageDataDetails } from './market-overview/page-data-details';
import { PartialBanner } from './market-overview/partial-banner';
import type { AdjacentNavigationState } from './market-overview/use-adjacent-navigation';

/**
 * `market` 쿼리에서 선택된 시장 인덱스를 읽는다. `marketType`(대소문자
 * 무시)과 먼저 매칭하고, `marketType`이 null인 시장을 위해 `buildMarketParam`이
 * 쓰는 배열 위치 폴백도 함께 받는다. 두 함수는 같은 값 집합을 다뤄야 한다 —
 * 읽기만 위치 폴백을 모르면 그런 시장은 새로고침 때 조용히 첫 탭으로 돌아간다.
 * 값이 없거나 어느 쪽으로도 매칭되지 않으면 배열의 첫 시장(0)이다.
 */
function resolveSelectedMarketIndex(
  markets: MarketSnapshot['markets'],
  searchParams: URLSearchParams
): number {
  const marketParam = searchParams.get('market');

  if (!marketParam) {
    return 0;
  }

  const byMarketType = markets.findIndex(
    (market) => market.marketType?.toLowerCase() === marketParam.toLowerCase()
  );

  if (byMarketType !== -1) {
    return byMarketType;
  }

  const byPosition = markets.findIndex(
    (market, index) => !market.marketType && String(index) === marketParam
  );

  return byPosition === -1 ? 0 : byPosition;
}

/** 위 reader가 되돌려 읽을 수 있는 형태로만 `market` 값을 만든다. */
function buildMarketParam(
  market: MarketSnapshot['markets'][number],
  index: number
): string {
  return market.marketType ? market.marketType.toLowerCase() : String(index);
}

/**
 * Latest (`/market/latest`)와 Archive Detail
 * (`/market/archive/:businessDate`)이 공유하는 단일 컴포넌트.
 * "본문은 Latest와 동일 컴포넌트를 재사용한다" — Archive Detail은 이 위에
 * `ArchiveModeBand`를 얹고 `mode='archive'`로 h1/원점 쿼리만 바꾼다.
 *
 * URL 상태(현재 search params, pathname)는 이 컴포넌트가 직접
 * `useUrlState()`로 읽는다 — 아카이브 필터 복귀 쿼리와 스크롤 복원 키 양쪽에
 * 필요하기 때문이다.
 */
export type MarketOverviewPageProps = {
  mode: 'latest' | 'archive';
  snapshot: MarketSnapshot;
  isRefetching?: boolean;
  /** 테스트에서 freshness("N시간 전 생성")를 고정하기 위한 주입 지점. */
  now?: Date;
};

export function MarketOverviewPage({
  mode,
  snapshot,
  isRefetching = false,
  now,
}: MarketOverviewPageProps) {
  const url = useUrlState();
  const capabilities = useCapabilities();
  const canViewOps = capabilities.can('ops.view');
  const currentSearch = url.searchParams.toString();
  // B-5: this screen already has a loaded daily-page response, so its
  // `navigation` is reused directly instead of calling the standalone
  // `GET /pages/navigation` endpoint a second time for the same date
  // (A-6 "어느 경로를 쓸 것인가"). Never `'loading'`/`'error'` here — the
  // snapshot itself already resolved successfully.
  const navigation: AdjacentNavigationState = {
    status: 'ready',
    previousBusinessDate: snapshot.navigation.previousBusinessDate,
    nextBusinessDate: snapshot.navigation.nextBusinessDate,
  };

  const filterQuery =
    mode === 'archive' ? extractFilterQuery(url.searchParams) : null;
  const originQuery: ClusterOriginQuery = {
    origin: mode === 'archive' ? snapshot.businessDate : 'latest',
    ...(filterQuery ?? {}),
  };

  const selectedIndex = resolveSelectedMarketIndex(
    snapshot.markets,
    url.searchParams
  );
  const displayMarkets = orderMarketsForDisplay(snapshot.markets);
  const hasMarketParam = url.searchParams.has('market');
  const routeKey = buildScrollKey(url.pathname, currentSearch);

  function handleSelectMarket(index: number) {
    navigate(
      buildUrl(url.pathname, {
        ...Object.fromEntries(url.searchParams),
        market: buildMarketParam(snapshot.markets[index], index),
      })
    );
  }

  /**
   * `?market=`은 "그 시장만 보이기"가 아니라 "그 시장으로 이동"이다. 탭이
   * 하던 일을 앵커가 이어받았다.
   *
   * 두 가지를 피해야 한다.
   *
   * 1. `App.tsx`도 같은 `routeKey`(pathname+search) 변경에 반응해
   *    저장된 스크롤 위치(없으면 0)로 이동시킨다. 자식 이펙트가 부모보다
   *    먼저 실행되므로 여기서 동기적으로 스크롤하면 그 직후 덮어써진다.
   *    한 프레임 미뤄 마지막에 착지시킨다.
   * 2. 저장된 위치가 있다는 건 방문자가 이미 있던 자리로 돌아온다는 뜻이다
   *    (클러스터 상세에서 뒤로가기). 그럴 땐 앵커가 아니라 복원이 이긴다.
   */
  useEffect(() => {
    if (!hasMarketParam || getScrollPosition(routeKey) !== undefined) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(marketSectionId(selectedIndex));
      const heading = document.getElementById(marketHeadingId(selectedIndex));

      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 스크롤은 위에서 이미 했으므로 포커스가 다시 스크롤하지 않게 막는다.
      heading?.focus({ preventScroll: true });
      // 마우스로 온 사람에게는 포커스 링이 뜨지 않는다 — 표시가 없으면
      // 화면이 굴러간 뒤 어디를 보라는 신호가 하나도 없다.
      markArrival(section);
    });

    return () => cancelAnimationFrame(frame);
  }, [hasMarketParam, routeKey, selectedIndex]);

  return (
    <div className='flex flex-col gap-[var(--gap)]'>
      {mode === 'archive' ? (
        <ArchiveModeBand
          businessDate={snapshot.businessDate}
          filterQuery={filterQuery}
          navigation={navigation}
          pageId={snapshot.pageId}
          versionNo={snapshot.versionNo}
        />
      ) : null}

      <DecisionHeaderCard
        isRefetching={isRefetching}
        mode={mode}
        now={now}
        snapshot={snapshot}
      />

      <PartialBanner canViewOps={canViewOps} snapshot={snapshot} />

      {snapshot.markets.length === 0 ? (
        <EmptyMarketsPanel canViewOps={canViewOps} status={snapshot.status} />
      ) : (
        <>
          <MarketCompareBand
            markets={displayMarkets}
            onSelectMarket={handleSelectMarket}
          />
          {displayMarkets.map(({ market, index }) => (
            <MarketSection
              canViewOps={canViewOps}
              currentPathname={url.pathname}
              currentSearch={currentSearch}
              index={index}
              key={index}
              market={market}
              originQuery={originQuery}
            />
          ))}
        </>
      )}

      <PageDataDetails snapshot={snapshot} />
    </div>
  );
}
