import type { ListFilters } from '@/lib/app-state';
import { buildUrl } from '@/lib/router';

/**
 * URL state helpers for `/ops/batches` (README §7-6 point 5, §9 Interaction
 * Contracts "Batch 행 선택").
 *
 * `from`/`to`/`status`/`page` are already handled generically by
 * `src/lib/app-state.ts`'s `parseListFilters` (unowned by this phase, used
 * as-is) — `BatchFilters` is just that shape under this page's own name.
 * `jobId` (row selection deep link) and `view=detail` (narrow-width
 * drill-in) are Batch-specific and have no shared parser, so they live here.
 */

export type BatchFilters = ListFilters;

export function parseJobIdParam(searchParams: URLSearchParams): number | null {
  const raw = searchParams.get('jobId');

  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isDetailViewParam(searchParams: URLSearchParams): boolean {
  return searchParams.get('view') === 'detail';
}

export type BatchUrlExtra = {
  jobId?: number | null;
  /** `'detail'` to drill in on narrow widths, `null`/omitted to show the list. */
  view?: 'detail' | null;
};

export function buildBatchOperationsUrl(
  filters: BatchFilters,
  extra: BatchUrlExtra = {}
): string {
  return buildUrl('/ops/batches', {
    from: filters.from,
    to: filters.to,
    status: filters.status,
    page: filters.page,
    jobId: extra.jobId ?? undefined,
    view: extra.view ?? undefined,
  });
}
