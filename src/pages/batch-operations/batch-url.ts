import type { ListFilters } from '@/lib/app-state';
import { buildUrl } from '@/lib/router';

import { BATCH_TYPES } from './filter-copy';

export type BatchFilters = Pick<
  ListFilters,
  'from' | 'to' | 'status' | 'page'
> & { type: string };

/** Invalid or missing values fall back to the unfiltered type. */
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
  /** `'detail'` drills in on narrow widths. */
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
