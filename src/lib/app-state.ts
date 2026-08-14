import type { MouseEvent } from 'react';

import type { MarketTypeResponse, ThemeNodeResponse } from './api/types';
import { getRelativeIso, getTodayIso, isValidIsoDate } from './kst-date';
import { navigate } from './router';

export type ThemeMode = 'light' | 'dark';

export type ListFilters = {
  from: string;
  to: string;
  status: string;
  market: MarketTypeResponse | '';
  themes: string[];
  q: string;
  page: number;
};

const MAX_ARCHIVE_THEME_SELECTIONS = 10;

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

  return isValidIsoDate(value) ? value : fallback;
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

function normalizeMarketParam(value: string | null): MarketTypeResponse | '' {
  return value === 'US' || value === 'KR' ? value : '';
}

function normalizeThemeCodes(values: readonly string[]): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length > 0) {
      unique.add(normalized);
    }

    if (unique.size === MAX_ARCHIVE_THEME_SELECTIONS) {
      break;
    }
  }

  return [...unique];
}

function parseThemeParams(searchParams: URLSearchParams): string[] {
  return normalizeThemeCodes(searchParams.getAll('theme'));
}

export function pruneThemeCodesToCatalog(
  themes: readonly string[],
  catalog: readonly ThemeNodeResponse[]
): string[] {
  const activeCodes = new Set<string>();
  const visit = (nodes: readonly ThemeNodeResponse[]) => {
    for (const node of nodes) {
      activeCodes.add(node.code);
      visit(node.children);
    }
  };

  visit(catalog);
  return normalizeThemeCodes(themes).filter((theme) => activeCodes.has(theme));
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
    market: normalizeMarketParam(searchParams.get('market')),
    themes: parseThemeParams(searchParams),
    q: searchParams.get('q') ?? '',
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

    if (!businessDate || !isValidIsoDate(businessDate)) {
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
