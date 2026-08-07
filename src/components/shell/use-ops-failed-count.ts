import {
  QueryClient,
  QueryClientContext,
  useQuery,
} from '@tanstack/react-query';
import { useContext } from 'react';

import { getBatchJobs } from '@/lib/api/batch';
import { useCapabilities } from '@/lib/capabilities';
import { getRelativeIso, getTodayIso } from '@/lib/kst-date';

const FAILED_COUNT_QUERY_KEY = 'failed-count';
const FALLBACK_QUERY_CLIENT = new QueryClient();

type FailedCountParams = {
  fromDate: string;
  toDate: string;
  page: 1;
  size: 1;
};

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

function buildFailedCountParams(now: Date): FailedCountParams {
  return {
    fromDate: getRelativeIso(6, now),
    toDate: getTodayIso(now),
    page: 1,
    size: 1,
  };
}

/**
 * Reads the seven-day failed-job summary used by the 운영 nav badge. The
 * query is scoped to operators and intentionally uses a single summary row;
 * malformed responses are treated as failures so an initial bad response
 * cannot render a misleading count while a later refetch can retain its last
 * successful value through React Query.
 */
export function useOpsFailedCount(): number | null {
  const queryClient = useContext(QueryClientContext);
  const { can } = useCapabilities();
  const params = buildFailedCountParams(new Date());
  const isEnabled = queryClient !== undefined && can('ops.view');

  const query = useQuery(
    {
      queryKey: ['batch-jobs', FAILED_COUNT_QUERY_KEY, params],
      queryFn: async ({ signal }) => {
        const response = await getBatchJobs(params, signal);
        const failedCount = readFailedCount(response);

        if (failedCount === null) {
          throw new Error('Batch summary did not contain a valid failed count');
        }

        return failedCount;
      },
      enabled: isEnabled,
      retry: false,
    },
    // App tests render the shell without the root provider. Supplying one
    // stable disabled fallback keeps hook order valid and avoids a second
    // request while preserving the provider's normal query client boundary.
    queryClient ?? FALLBACK_QUERY_CLIENT
  );

  return query.data ?? null;
}
