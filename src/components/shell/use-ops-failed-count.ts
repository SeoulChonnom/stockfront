import { QueryClientContext } from '@tanstack/react-query';
import { useCallback, useContext, useSyncExternalStore } from 'react';

import type { BatchJobListResponse } from '@/lib/api/types';

/**
 * Feeds the 배치 운영 nav item's failed-count pill (README §5) WITHOUT ever
 * firing a batch-jobs request itself.
 *
 * README's constraint: "if fetching it would mean firing a batch request on
 * every screen for every user, do NOT do that — render the badge only when
 * the data is already in the React Query cache." So this hook never calls
 * `useQuery`/`useBatchJobs` — it only reads whatever `['batch-jobs', ...]`
 * result(s) already exist in the TanStack Query cache (i.e. an Operator has
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

    // BUG FIX (§16 acceptance suite, `e2e/routing.spec.ts`): TanStack Query's
    // cache stores the RAW `queryFn` result (`BatchJobListResponse`, i.e.
    // `{items, pagination, summary}` — see `src/lib/api/batch.ts`'s
    // `getBatchJobs`), never the post-`select` shape. `useBatchJobs`'s
    // `select: enrichBatchJobsView` (`query-hooks.ts`) only transforms the
    // value at the point a component reads it through `useQuery()` — it is
    // never written back into `query.state.data`. Reading
    // `query.state.data as BatchJobsView` and then `.rows.filter(...)` here
    // was therefore always reading `.rows` off a raw response that only ever
    // has `.items`, throwing `TypeError: Cannot read properties of undefined
    // (reading 'filter')` inside this hook's `useSyncExternalStore` selector
    // the moment ANY `batch-jobs` query resolved — which crashed the whole
    // render tree (this hook runs unconditionally in `AppShell`, for every
    // route) as soon as a user opened `/ops/batches` once. Fixed by reading
    // the RAW response shape directly and using its own pre-computed
    // `summary.failedCount` instead of re-deriving it from a `rows` field
    // that was never actually there.
    let newest: { updatedAt: number; data: BatchJobListResponse } | null = null;

    for (const query of queries) {
      const data = query.state.data as BatchJobListResponse | undefined;

      if (!data) {
        continue;
      }

      if (!newest || query.state.dataUpdatedAt > newest.updatedAt) {
        newest = { updatedAt: query.state.dataUpdatedAt, data };
      }
    }

    if (!newest) {
      return null;
    }

    return newest.data.summary.failedCount;
  }, [queryClient]);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
