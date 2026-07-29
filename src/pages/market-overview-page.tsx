import { useCapabilities } from '@/lib/capabilities';
import { useUrlState } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';

import { ArchiveModeBand } from './market-overview/archive-mode-band';
import {
  getTodayBusinessDateKst,
  shiftBusinessDate,
} from './market-overview/date-utils';
import { DecisionHeaderCard } from './market-overview/decision-header-card';
import { EmptyMarketsPanel } from './market-overview/empty-markets-panel';
import { MarketSection } from './market-overview/market-section';
import {
  type ClusterOriginQuery,
  extractFilterQuery,
} from './market-overview/navigation';
import { PartialBanner } from './market-overview/partial-banner';

/**
 * Latest (`/market/latest`, README §7-2)와 Archive Detail
 * (`/market/archive/:businessDate`, §7-3)이 공유하는 단일 컴포넌트.
 * "본문은 Latest와 동일 컴포넌트를 재사용한다" — Archive Detail은 이 위에
 * `ArchiveModeBand`를 얹고 `mode='archive'`로 h1/원점 쿼리만 바꾼다.
 *
 * URL 상태(현재 search params, pathname)는 이 컴포넌트가 직접
 * `useUrlState()`로 읽는다 — 아카이브 필터 복귀 쿼리(§7-2 item 3: "coming
 * from archive")와 스크롤 복원 키(§9) 양쪽에 필요하기 때문이다.
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

  const filterQuery =
    mode === 'archive' ? extractFilterQuery(url.searchParams) : null;
  const originQuery: ClusterOriginQuery = {
    origin: mode === 'archive' ? snapshot.businessDate : 'latest',
    ...(filterQuery ?? {}),
  };

  return (
    <div className='flex flex-col gap-4 sm:gap-5'>
      {mode === 'archive' ? (
        <ArchiveModeBand
          businessDate={snapshot.businessDate}
          filterQuery={filterQuery}
          nextDate={shiftBusinessDate(snapshot.businessDate, 1)}
          nextDisabled={
            shiftBusinessDate(snapshot.businessDate, 1) >
            getTodayBusinessDateKst(now)
          }
          pageId={snapshot.pageId}
          prevDate={shiftBusinessDate(snapshot.businessDate, -1)}
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
        snapshot.markets.map((market, index) => (
          <MarketSection
            currentPathname={url.pathname}
            currentSearch={currentSearch}
            index={index}
            key={`${market.label}-${index}`}
            market={market}
            originQuery={originQuery}
          />
        ))
      )}
    </div>
  );
}
