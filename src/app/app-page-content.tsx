import type { AppRoute } from '../lib/app-state';
import { ArchiveSearchPage } from '../pages/archive-search-page';
import { BatchOperationsPage } from '../pages/batch-operations-page';
import { ClusterDetailPage } from '../pages/cluster-detail-page';
import { NotFoundPage } from '../pages/not-found-page';

import { MarketOverviewRouteContent } from './market-overview-route-content';

export function AppPageContent({
  archiveMarketQuery,
  latestMarketQuery,
  route,
  searchParams,
}: {
  /**
   * §8/§9: `isFetching`와 `refetch`가 이 경계를 넘어야 "이전 내용을 유지한 채
   * `갱신 중` 배지" 와 `다시 시도` 계약이 성립한다. 예전에는 error/isLoading/
   * data 만 넘겨서, 화면이 재시도를 `window.location.reload()`로 대신할 수밖에
   * 없었다(전체 페이지 새로고침 = 스크롤·포커스·필터 전부 소실).
   * 둘 다 optional — App.tsx 밖의 테스트가 만든 mock query 객체는 이 필드를
   * 갖고 있지 않다.
   */
  archiveMarketQuery: {
    data:
      | Parameters<typeof MarketOverviewRouteContent>[0]['snapshot']
      | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching?: boolean;
    refetch?: () => void;
  };
  latestMarketQuery: {
    data:
      | Parameters<typeof MarketOverviewRouteContent>[0]['snapshot']
      | undefined;
    error: Error | null;
    isLoading: boolean;
    isFetching?: boolean;
    refetch?: () => void;
  };
  route: AppRoute;
  searchParams: URLSearchParams;
}) {
  switch (route.page) {
    case 'latest':
      return (
        <MarketOverviewRouteContent
          error={latestMarketQuery.error}
          isLoading={latestMarketQuery.isLoading}
          isRefetching={latestMarketQuery.isFetching ?? false}
          mode='latest'
          onRetry={latestMarketQuery.refetch}
          snapshot={latestMarketQuery.data}
          title='Latest Market'
        />
      );
    case 'archive-market':
      return (
        <MarketOverviewRouteContent
          error={archiveMarketQuery.error}
          isLoading={archiveMarketQuery.isLoading}
          isRefetching={archiveMarketQuery.isFetching ?? false}
          mode='archive'
          onRetry={archiveMarketQuery.refetch}
          snapshot={archiveMarketQuery.data}
          title='Archive Market'
        />
      );
    case 'archive-search':
      return <ArchiveSearchPage searchParams={searchParams} />;
    case 'cluster-detail':
      return <ClusterDetailPage clusterId={route.clusterId} />;
    case 'batch-ops':
      return <BatchOperationsPage searchParams={searchParams} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
