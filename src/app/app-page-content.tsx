import type { AppRoute } from '../lib/app-state';
import { ArchiveSearchPage } from '../pages/archive-search-page';
import { BatchOperationsPage } from '../pages/batch-operations-page';
import { ClusterDetailPage } from '../pages/cluster-detail-page';
import { NotFoundPage } from '../pages/not-found-page';

import { MarketOverviewRouteContent } from './market-overview-route-content';

export function AppPageContent({
  authResolved,
  route,
  searchParams,
}: {
  authResolved: boolean;
  route: AppRoute;
  searchParams: URLSearchParams;
}) {
  switch (route.page) {
    case 'latest':
    case 'archive-market':
      return <MarketOverviewRouteContent authResolved={authResolved} />;
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
