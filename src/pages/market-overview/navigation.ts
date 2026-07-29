import type { MouseEvent } from 'react';

import {
  buildScrollKey,
  saveScrollPosition,
} from '@/components/shell/scroll-restoration';
import { buildUrl, navigate } from '@/lib/router';

/**
 * Filter query fields an Archive Search result row attaches when it opens an
 * Archive Detail page (`?pageId=&from=&to=&status=&page=`, README §7-4/§9).
 * Kept as a distinct type from `pageId` (identity, not a filter) because only
 * these four round-trip further into a Cluster Detail navigation (§7-2 point
 * 3: "plus filter query when coming from archive").
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
 * whether "검색 결과로 돌아가기" should render at all (README §7-3: "진입 시
 * 필터 쿼리가 있을 때만").
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
 * Same contract as `createNavigateHandler` (`src/lib/app-state.ts`) plus a
 * scroll-position save immediately before navigating — required whenever a
 * screen this agent owns navigates somewhere that later needs to restore
 * this exact scroll offset on Back (README §9: "스크롤 복원은 `navigate`
 * 직전에 현재 URL 키로 `window.scrollY`를 저장"). `app-state.ts` itself is out
 * of this agent's file-ownership scope, so this variant lives alongside the
 * other Phase 6 navigation helpers instead of being added there.
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
