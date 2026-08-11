import type { MouseEvent } from 'react';

import {
  buildScrollKey,
  saveScrollPosition,
} from '@/components/shell/scroll-restoration';
import { buildUrl, navigate } from '@/lib/router';

/**
 * Filter query fields an Archive Search result row attaches when it opens an
 * Archive Detail page (`?pageId=&from=&to=&status=&page=`).
 * Kept as a distinct type from `pageId` (identity, not a filter) because only
 * these four round-trip further into a Cluster Detail navigation.
 */
export type FilterQueryParams = {
  from?: string;
  to?: string;
  status?: string;
  page?: number;
};

/**
 * Reads `from`/`to`/`status`/`page` off the current URL. Returns `null` when
 * none are present — the caller (Archive Detail) uses that `null` to decide
 * whether "검색 결과로 돌아가기" should render at all: only URLs carrying
 * archive-search filter state came from a result list.
 */
export function extractFilterQuery(
  searchParams: URLSearchParams
): FilterQueryParams | null {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const status = searchParams.get('status');
  const pageRaw = searchParams.get('page');
  const page =
    pageRaw && /^\d+$/.test(pageRaw) && Number(pageRaw) > 0
      ? Number(pageRaw)
      : undefined;

  if (!from && !to && !status && page === undefined) {
    return null;
  }

  return {
    from: from ?? undefined,
    to: to ?? undefined,
    status: status ?? undefined,
    page,
  };
}

export function buildArchiveSearchHref(filterQuery: FilterQueryParams) {
  return buildUrl('/market/archive/search', { ...filterQuery });
}

export type ClusterOriginQuery = {
  /** `'latest'` or the archive `businessDate` this issue was opened from. */
  origin: string;
} & FilterQueryParams;

export function buildClusterHref(
  clusterId: string,
  origin: ClusterOriginQuery
) {
  return buildUrl(`/market/cluster/${clusterId}`, { ...origin });
}

/**
 * Like `createNavigateHandler`, this saves the current scroll position
 * immediately before navigating so browser Back can restore the exact offset.
 * The generic helper remains in `app-state.ts`; this variant stays local to
 * the market navigation call sites.
 */
export function createScrollSavingNavigateHandler(
  to: string,
  currentPathname: string,
  currentSearch: string
) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    saveScrollPosition(buildScrollKey(currentPathname, currentSearch));
    navigate(to);
  };
}
