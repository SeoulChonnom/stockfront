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
  archiveMarketQuery: {
    data:
      | Parameters<typeof MarketOverviewRouteContent>[0]['snapshot']
      | undefined;
    error: Error | null;
    isLoading: boolean;
  };
  latestMarketQuery: {
    data:
      | Parameters<typeof MarketOverviewRouteContent>[0]['snapshot']
      | undefined;
    error: Error | null;
    isLoading: boolean;
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
          mode="latest"
          snapshot={latestMarketQuery.data}
          title="Latest Market"
        />
      );
    case 'archive-market':
      return (
        <MarketOverviewRouteContent
          error={archiveMarketQuery.error}
          isLoading={archiveMarketQuery.isLoading}
          mode="archive"
          snapshot={archiveMarketQuery.data}
          title="Archive Market"
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
