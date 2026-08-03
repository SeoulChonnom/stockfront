import { parseRoute } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import { useArchiveMarketPage, useLatestMarketPage } from '@/lib/query-hooks';
import { useUrlState } from '@/lib/router';
import { ArchiveNotFoundState } from '../pages/market-overview/archive-not-found-state';
import { buildFetchErrorPresentation } from '../pages/market-overview/error-presentation';
import { MarketOverviewErrorPanel } from '../pages/market-overview/market-overview-error-panel';
import { MarketOverviewSkeleton } from '../pages/market-overview/market-overview-skeleton';
import { MarketOverviewPage } from '../pages/market-overview-page';

/**
 * Dispatches Latest/Archive Detail between loading skeleton, scoped error
 * (FAILED/5xx/401/429/offline/malformed, README §8), Archive-only 404
 * (§13 D-05) and the ready `MarketOverviewPage`.
 *
 * Owns the market-page queries itself (relocated from App.tsx): both
 * `useLatestMarketPage` and `useArchiveMarketPage` are called unconditionally
 * on every render, gated via each hook's own `enabled` flag — this preserves
 * the original `enabled: authResolved && route.page === ...` pattern, just
 * moved to the component that actually consumes the result, so the data only
 * flows one way and no query-shaped prop needs to cross the App → page
 * boundary at all.
 *
 * `mode`/`businessDate`/current filter query are derived here via
 * `useUrlState()` + `parseRoute()` rather than threaded through as props —
 * both are already exported, read-only APIs, and deriving them here means a
 * failed fetch (snapshot `undefined`) still has a real `businessDate` to show
 * on the 404 screen.
 */
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
  // `refetch` returns a Promise; the panel's `onRetry` wants a void-returning
  // handler (§9 Retry contract), so wrap rather than pass it through raw.
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
