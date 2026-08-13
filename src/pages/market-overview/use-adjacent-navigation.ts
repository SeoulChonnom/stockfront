import { useNavigation } from '@/lib/query-hooks';

/**
 * Adjacent-business-day state for `ArchiveModeBand` (B-5).
 *
 * `'loading'`/`'error'` are distinct from a `'ready'` state carrying `null`
 * neighbours: a `null` date means "no such neighbour exists" (disable just
 * that one button, per A-6's field-existence rule), while loading/error
 * means "we don't know yet" (disable BOTH buttons — never fall back to a
 * stale or guessed date).
 */
export type AdjacentNavigationState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      previousBusinessDate: string | null;
      nextBusinessDate: string | null;
    };

/**
 * Calls the standalone `GET /pages/navigation` endpoint (B-5). Only for
 * screens that do NOT already have a loaded daily-page response — the
 * no-page-for-that-date routes (`market-overview-route-shell.tsx`,
 * `archive-not-found-state.tsx`). A screen that already has a snapshot must
 * build this state directly from `snapshot.navigation` instead of calling
 * this hook (`market-overview-page.tsx`) — otherwise the same lookup fires
 * twice for the same date (A-6 "어느 경로를 쓸 것인가").
 */
export function useAdjacentNavigation(
  businessDate: string,
  enabled = true
): AdjacentNavigationState {
  const { data, status } = useNavigation(businessDate, enabled);

  if (status === 'success' && data) {
    return {
      status: 'ready',
      previousBusinessDate: data.previousBusinessDate,
      nextBusinessDate: data.nextBusinessDate,
    };
  }

  if (status === 'error') {
    return { status: 'error' };
  }

  return { status: 'loading' };
}
