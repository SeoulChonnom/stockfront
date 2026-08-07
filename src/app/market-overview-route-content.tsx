import { parseRoute } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import { useArchiveMarketPage, useLatestMarketPage } from '@/lib/query-hooks';
import { useUrlState } from '@/lib/router';
import { ArchiveNotFoundState } from '../pages/market-overview/archive-not-found-state';
import { buildFetchErrorPresentation } from '../pages/market-overview/error-presentation';
import { MarketOverviewErrorPanel } from '../pages/market-overview/market-overview-error-panel';
import { MarketOverviewSkeleton } from '../pages/market-overview/market-overview-skeleton';
import { MarketOverviewPage } from '../pages/market-overview-page';

/** Owns latest/archive queries and dispatches loading, scoped errors, 404, or ready content. */
export function MarketOverviewRouteContent({
  authResolved,
}: {
  authResolved: boolean;
}) {
  const url = useUrlState();
  const route = parseRoute(url.pathname, url.searchParams);
  const capabilities = useCapabilities();
  const canViewOps = capabilities.can('ops.view');
  const mode: 'latest' | 'archive' =
    route.page === 'archive-market' ? 'archive' : 'latest';
  const businessDateFromRoute =
    route.page === 'archive-market' ? route.businessDate : null;

  const latestQuery = useLatestMarketPage(authResolved && mode === 'latest');
  const archiveQuery = useArchiveMarketPage(
    route.page === 'archive-market'
      ? { businessDate: route.businessDate, pageId: route.pageId }
      : { businessDate: '', pageId: null },
    authResolved && mode === 'archive'
  );
  const {
    data: snapshot,
    error,
    isLoading,
    isFetching: isRefetching,
    refetch,
  } = mode === 'latest' ? latestQuery : archiveQuery;
  // Keep the retry callback void-returning for the panel contract.
  const onRetry = () => void refetch();

  if (isLoading) {
    return <MarketOverviewSkeleton mode={mode} />;
  }

  if (error) {
    const presentation = buildFetchErrorPresentation(error);

    if (
      mode === 'archive' &&
      presentation.isNotFound &&
      businessDateFromRoute
    ) {
      return (
        <ArchiveNotFoundState
          businessDate={businessDateFromRoute}
          searchParams={url.searchParams}
        />
      );
    }

    return (
      <MarketOverviewErrorPanel
        canViewOps={canViewOps}
        onRetry={onRetry}
        presentation={presentation}
      />
    );
  }

  if (!snapshot) {
    return (
      <MarketOverviewErrorPanel
        canViewOps={canViewOps}
        onRetry={onRetry}
        presentation={{
          code: 'NO_DATA',
          title: '표시할 데이터가 없습니다',
          message: '시장 브리프 데이터를 불러오지 못했습니다.',
          actionLabel: '다시 시도',
          isNotFound: false,
          actionKind: 'retry',
        }}
      />
    );
  }

  return (
    <MarketOverviewPage
      isRefetching={isRefetching}
      mode={mode}
      snapshot={snapshot}
    />
  );
}
