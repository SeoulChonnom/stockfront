import { lazy, Suspense } from 'react';

import { useCapabilities } from '@/lib/capabilities';

import type { AppRoute } from '../lib/app-state';

import { MarketOverviewRouteContent } from './market-overview-route-content';
import { RouteChunkFallback } from './route-chunk-fallback';
import {
  loadArchiveSearchPage,
  loadBatchOperationsPage,
  loadClusterDetailPage,
  loadNotFoundPage,
} from './route-chunks';
import { useRoutePrefetch } from './use-route-prefetch';

/**
 * 라우트 단위 코드 분할.
 *
 * 분할 전에는 전 화면이 단일 청크(125KB gzip) 하나였고, slow 3G + 6x CPU에서
 * 그 청크의 다운로드·파싱에만 3.2초가 걸려 FCP가 3.9초였다. 무엇보다
 * `ops.view` 권한이 없는 일반 사용자가 평생 열 수 없는 배치 운영 화면까지
 * 내려받고 있었다 — 권한 경계와 번들 경계가 어긋나 있었다.
 *
 * 최신/날짜별 브리프(`MarketOverviewRouteContent`)만 정적 import로 남긴다.
 * `/`가 `/market/latest`로 정규화되는 기본 착지 지점이라, 이걸 지연 로드하면
 * 가장 흔한 경로에 왕복이 하나 더 붙어 오히려 느려진다. 나머지 넷은 그
 * 화면으로 이동한 사람만 값을 치른다.
 */
const ArchiveSearchPage = lazy(() =>
  loadArchiveSearchPage().then((m) => ({ default: m.ArchiveSearchPage }))
);
const ClusterDetailPage = lazy(() =>
  loadClusterDetailPage().then((m) => ({ default: m.ClusterDetailPage }))
);
const BatchOperationsPage = lazy(() =>
  loadBatchOperationsPage().then((m) => ({ default: m.BatchOperationsPage }))
);
const NotFoundPage = lazy(() =>
  loadNotFoundPage().then((m) => ({ default: m.NotFoundPage }))
);

export function AppPageContent({
  authResolved,
  route,
  searchParams,
}: {
  authResolved: boolean;
  route: AppRoute;
  searchParams: URLSearchParams;
}) {
  const { can } = useCapabilities();
  useRoutePrefetch(route, can('ops.view'));

  switch (route.page) {
    case 'latest':
    case 'archive-market':
      return <MarketOverviewRouteContent authResolved={authResolved} />;
    case 'archive-search':
      return (
        <Suspense fallback={<RouteChunkFallback />}>
          <ArchiveSearchPage searchParams={searchParams} />
        </Suspense>
      );
    case 'cluster-detail':
      return (
        <Suspense fallback={<RouteChunkFallback />}>
          <ClusterDetailPage clusterId={route.clusterId} />
        </Suspense>
      );
    case 'batch-ops':
      return (
        <Suspense fallback={<RouteChunkFallback />}>
          <BatchOperationsPage searchParams={searchParams} />
        </Suspense>
      );
    case 'not-found':
      return (
        <Suspense fallback={<RouteChunkFallback />}>
          <NotFoundPage />
        </Suspense>
      );
  }
}
