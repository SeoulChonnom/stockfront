import type { MouseEvent } from 'react';

import { navigate } from './router';

export type ThemeMode = 'light' | 'dark';

export type ListFilters = {
  from: string;
  to: string;
  status: string;
  page: number;
};

type ParseListFiltersOptions = {
  allowedStatuses?: string[];
};

export type AppRoute =
  | { page: 'latest' }
  | { page: 'archive-market'; businessDate: string; pageId: number | null }
  | { page: 'archive-search' }
  | { page: 'cluster-detail'; clusterId: string }
  | { page: 'batch-ops' }
  | { page: 'not-found' };

const archiveMarketRoutePattern = /^\/market\/archive\/(\d{4}-\d{2}-\d{2})$/;
const clusterDetailRoutePattern =
  /^\/market\/cluster\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

function normalizeDateParam(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizePositiveIntegerParam(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePageParam(value: string | null, fallback: number) {
  return normalizePositiveIntegerParam(value) ?? fallback;
}

function normalizeStatusParam(
  value: string | null,
  allowedStatuses?: string[]
) {
  if (!value) {
    return '';
  }

  if (!allowedStatuses) {
    return value;
  }

  return allowedStatuses.includes(value) ? value : '';
}

// D6 (parity cycle 2): this product is KST-only, but `new Date().toISOString()`
// reads the UTC calendar date. Between 00:00 and 09:00 KST that is still
// YESTERDAY in UTC, so the old implementation shifted every default
// from/to range one day earlier for roughly a third of the day, every day —
// a real user-facing bug, not just a parity mismatch. Shifting the instant
// by the fixed +9h KST offset before reading its UTC calendar fields yields
// the correct KST wall-clock date regardless of the host runtime's own
// timezone (same technique `formatters.ts`'s `parseKstAwareDate` uses, just
// applied to "now" instead of a parsed timestamp).
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getKstNow(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

function getTodayIso() {
  return getKstNow().toISOString().slice(0, 10);
}

function getRelativeIso(days: number) {
  const date = getKstNow();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function parseListFilters(
  searchParams: URLSearchParams,
  options: ParseListFiltersOptions = {}
): ListFilters {
  const defaults = {
    from: getRelativeIso(14),
    to: getTodayIso(),
    status: '',
    page: 1,
  };

  const from = normalizeDateParam(searchParams.get('from'), defaults.from);
  const to = normalizeDateParam(searchParams.get('to'), defaults.to);

  return {
    from: from <= to ? from : to,
    to: from <= to ? to : from,
    status: normalizeStatusParam(
      searchParams.get('status'),
      options.allowedStatuses
    ),
    page: normalizePageParam(searchParams.get('page'), defaults.page),
  };
}

export function parseRoute(
  pathname: string,
  searchParams = new URLSearchParams()
): AppRoute {
  if (pathname === '/' || pathname === '/market/latest') {
    return { page: 'latest' };
  }

  if (pathname === '/market/archive/search') {
    return { page: 'archive-search' };
  }

  if (pathname.startsWith('/market/archive/')) {
    const businessDate = pathname.match(archiveMarketRoutePattern)?.[1];

    if (!businessDate) {
      return { page: 'not-found' };
    }

    return {
      page: 'archive-market',
      businessDate,
      pageId: normalizePositiveIntegerParam(searchParams.get('pageId')),
    };
  }

  if (pathname.startsWith('/market/cluster/')) {
    const clusterId = pathname.match(clusterDetailRoutePattern)?.[1];

    if (!clusterId) {
      return { page: 'not-found' };
    }

    return {
      page: 'cluster-detail',
      clusterId,
    };
  }

  if (pathname === '/ops/batches') {
    return { page: 'batch-ops' };
  }

  return { page: 'not-found' };
}

export function createNavigateHandler(to: string) {
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
    navigate(to);
  };
}
