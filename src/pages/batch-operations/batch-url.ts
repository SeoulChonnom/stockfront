import type { ListFilters } from '@/lib/app-state';
import { buildUrl } from '@/lib/router';

import { BATCH_TYPES } from './filter-copy';

/**
 * URL state helpers for `/ops/batches` (README §7-6 point 5, §9 Interaction
 * Contracts "Batch 행 선택").
 *
 * `from`/`to`/`status`/`page` are already handled generically by
 * `src/lib/app-state.ts`'s `parseListFilters` (unowned by this phase, used
 * as-is) — `BatchFilters` adds `type` (jobType) on top of that shape, since
 * `parseListFilters` is a shared cross-page helper and `jobType` is
 * batch-only (per its own top-of-file note, not touched here). `jobId` (row
 * selection deep link) and `view=detail` (narrow-width drill-in) are also
 * Batch-specific and have no shared parser, so they all live here.
 */

export type BatchFilters = ListFilters & { type: string };

/**
 * Parses the `?type=` query param against the API's `BatchJobType` enum
 * (`NEWS_COLLECTION` | `MARKET_SNAPSHOT`, see `filter-copy.ts`'s
 * `BATCH_TYPES` for why — the design prototype's fixture values don't apply
 * here). An unknown/missing value falls back to `''` ("전체 타입"), the same
 * "invalid input silently ignored" behavior `parseListFilters` uses for
 * `status`.
 */
export function parseJobTypeParam(searchParams: URLSearchParams): string {
  const raw = searchParams.get('type');
  return raw && BATCH_TYPES.includes(raw) ? raw : '';
}

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
    type: filters.type,
    page: filters.page,
    jobId: extra.jobId ?? undefined,
    view: extra.view ?? undefined,
  });
}
