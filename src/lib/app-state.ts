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

export function formatDateDots(value: string) {
  return value.replaceAll('-', '. ');
}

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

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getRelativeIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
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

  return {
    from: normalizeDateParam(searchParams.get('from'), defaults.from),
    to: normalizeDateParam(searchParams.get('to'), defaults.to),
    status: normalizeStatusParam(
      searchParams.get('status'),
      options.allowedStatuses
    ),
    page: normalizePageParam(searchParams.get('page'), defaults.page),
  };
}

export function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'ready' || normalized === 'success') {
    return 'status-chip status-chip-success';
  }

  if (normalized === 'partial') {
    return 'status-chip status-chip-partial';
  }

  return 'status-chip status-chip-failed';
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
