import { useCapabilities } from '@/lib/capabilities';
import { buildUrl, navigate, useUrlState } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

import { ArchiveModeBand } from './market-overview/archive-mode-band';
import { DecisionHeaderCard } from './market-overview/decision-header-card';
import { EmptyMarketsPanel } from './market-overview/empty-markets-panel';
import { MarketSection } from './market-overview/market-section';
import { MarketTabs } from './market-overview/market-tabs';
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

  function handleSelectMarket(index: number) {
    navigate(
      buildUrl(url.pathname, {
        ...Object.fromEntries(url.searchParams),
        market: buildMarketParam(snapshot.markets[index], index),
      })
    );
  }

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
          <MarketTabs
            markets={snapshot.markets}
            onSelect={handleSelectMarket}
            selectedIndex={selectedIndex}
          />
          <MarketSection
            canViewOps={canViewOps}
            currentPathname={url.pathname}
            currentSearch={currentSearch}
            index={selectedIndex}
            market={snapshot.markets[selectedIndex]}
            originQuery={originQuery}
          />
        </>
      )}

      <PageDataDetails snapshot={snapshot} />
    </div>
  );
}
