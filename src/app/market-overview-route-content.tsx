import { parseRoute } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';
import { useUrlState } from '@/lib/router';
import type { MarketSnapshot } from '@/lib/view-models';
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
 * Prop shape (`error`/`isLoading`/`mode`/`snapshot`/`title`) is fixed by
 * `app-page-content.tsx` (a different agent's file, out of scope here) —
 * `isRefetching` is added as optional so this stays call-compatible today
 * and just starts working once that file is updated to pass it (see the
 * report for the current gap: no `isFetching`/`refetch` crosses that
 * boundary yet).
 *
 * `businessDate`/current filter query for Archive Detail are derived here
 * via `useUrlState()` + `parseRoute()` rather than threaded through as new
 * props — both are already exported, read-only APIs this agent is allowed
 * to consume, and deriving them here means a failed fetch (snapshot
 * `undefined`) still has a real `businessDate` to show on the 404 screen.
 */
export function MarketOverviewRouteContent({
  error,
  isLoading,
  mode,
  snapshot,
  title,
  isRefetching = false,
  onRetry,
}: {
  error: Error | null;
  isLoading: boolean;
  mode: 'latest' | 'archive';
  snapshot: MarketSnapshot | undefined;
  title: string;
  isRefetching?: boolean;
  /** React Query의 refetch. §9 Retry 계약 — 전체 새로고침 대신 해당 쿼리만 다시 부른다. */
  onRetry?: () => void;
}) {
  // `app-page-content.tsx` (out of this agent's scope) still passes a
  // placeholder English `title` ('Latest Market'/'Archive Market') left over
  // from the pre-rebuild props contract. It's accepted for call-site
  // compatibility but deliberately never rendered — the new design's h1/kicker
  // copy is exact Korean text derived from `mode`/`businessDate` instead
  // (README §7-2/§7-3), so this placeholder must not leak into the UI.
  void title;
  const url = useUrlState();
  const route = parseRoute(url.pathname, url.searchParams);
  const capabilities = useCapabilities();
  const canViewOps = capabilities.can('ops.view');
  const businessDateFromRoute =
    route.page === 'archive-market' ? route.businessDate : null;

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
