import { useEffect } from 'react';
import {
  loadArchiveSearchPage,
  loadBatchOperationsPage,
  loadClusterDetailPage,
} from '@/app/route-chunks';
import type { AppRoute } from '@/lib/app-state';

/**
 * Prefetch only routes linked from the current screen, including ops routes
 * only when permitted. Navigation retries any ignored prefetch failure.
 */

type IdleHandle = { cancel: () => void };

/** Start after the first paint, but within the idle timeout. */
const IDLE_TIMEOUT_MS = 300;

function whenIdle(run: () => void): IdleHandle {
  if (typeof window === 'undefined') {
    return { cancel: () => undefined };
  }

  let inner: IdleHandle | null = null;
  let cancelled = false;

  const frame = window.requestAnimationFrame(() => {
    if (cancelled) {
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
      inner = { cancel: () => window.cancelIdleCallback?.(id) };
      return;
    }

    // Safari fallback.
    const id = window.setTimeout(run, IDLE_TIMEOUT_MS);
    inner = { cancel: () => window.clearTimeout(id) };
  });

  return {
    cancel: () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      inner?.cancel();
    },
  };
}

export function useRoutePrefetch(route: AppRoute, canViewOps: boolean): void {
  const page = route.page;
  const onBrief = page === 'latest' || page === 'archive-market';

  useEffect(() => {
    const targets: Array<() => Promise<unknown>> = [];

    if (onBrief) {
      targets.push(loadClusterDetailPage, loadArchiveSearchPage);
    }

    if (page === 'archive-search') {
      targets.push(loadClusterDetailPage);
    }

    if (canViewOps) {
      targets.push(loadBatchOperationsPage);
    }

    if (targets.length === 0) {
      return;
    }

    const handle = whenIdle(() => {
      for (const load of targets) {
        load().catch(() => undefined);
      }
    });

    return () => handle.cancel();
  }, [onBrief, page, canViewOps]);
}
