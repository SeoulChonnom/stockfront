import { QueryClientContext } from '@tanstack/react-query';
import { useCallback, useContext, useSyncExternalStore } from 'react';

function readFailedCount(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || !('summary' in data)) {
    return null;
  }

  const summary = data.summary;

  if (
    typeof summary !== 'object' ||
    summary === null ||
    !('failedCount' in summary)
  ) {
    return null;
  }

  const failedCount = summary.failedCount;

  return typeof failedCount === 'number' &&
    Number.isSafeInteger(failedCount) &&
    failedCount >= 0
    ? failedCount
    : null;
}

/**
 * Feeds the 배치 운영 nav item's failed-count pill (README §5) WITHOUT ever
 * firing a batch-jobs request itself.
 *
 * README's constraint: "if fetching it would mean firing a batch request on
 * every screen for every user, do NOT do that — render the badge only when
 * the data is already in the React Query cache." So this hook never calls
 * `useQuery`/`useBatchJobs` — it only reads whatever `['batch-jobs', ...]`
 * result(s) already exist in the TanStack Query cache (i.e. an admin has
 * opened `/ops/batches` at least once this session) via
 * `queryClient.getQueryCache()`, and re-derives the FAILED count from the
 * most recently updated match whenever the cache changes.
 *
 * Trade-off this makes on purpose (documented, not hidden): the count only
 * reflects whichever page/filter happens to be cached, not a true global
 * failed-job count across every page. A live global count would need either
 * a dedicated summary endpoint or an always-on query — precisely what this
 * hook is designed to avoid. See the Phase 4 report for the same note.
 *
 * Uses `QueryClientContext` directly (rather than `useQueryClient()`, which
 * throws without a provider) so a screen rendered without a
 * `QueryClientProvider` in the tree (e.g. `App.test.tsx`, which mocks
 * `src/lib/query-hooks` wholesale and never wraps a provider) degrades to
 * "no badge" instead of crashing.
 */
export function useOpsFailedCount(): number | null {
  const queryClient = useContext(QueryClientContext);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!queryClient) {
        return () => {};
      }

      return queryClient.getQueryCache().subscribe(onStoreChange);
    },
    [queryClient]
  );

  const getSnapshot = useCallback((): number | null => {
    if (!queryClient) {
      return null;
    }

    const queries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['batch-jobs'] });

    // TanStack Query stores the RAW queryFn result, not the post-select view
    // model. Treat that cache as untrusted: a partial or malformed entry must
    // not take down AppShell, which reads this hook on every route.
    let newest: { updatedAt: number; failedCount: number } | null = null;

    for (const query of queries) {
      const failedCount = readFailedCount(query.state.data);

      if (failedCount === null) {
        continue;
      }

      if (!newest || query.state.dataUpdatedAt > newest.updatedAt) {
        newest = { updatedAt: query.state.dataUpdatedAt, failedCount };
      }
    }

    return newest?.failedCount ?? null;
  }, [queryClient]);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
