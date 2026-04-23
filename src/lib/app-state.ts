import type { MouseEvent } from 'react';

import { navigate } from './router';

export type ThemeMode = 'light' | 'dark';

export type ListFilters = {
  from: string;
  to: string;
  status: string;
  page: number;
};

export type AppRoute =
  | { page: 'latest' }
  | { page: 'archive-market'; businessDate: string }
  | { page: 'archive-search' }
  | { page: 'cluster-detail'; clusterId: string }
  | { page: 'batch-ops' }
  | { page: 'not-found' };

const defaultBusinessDate = '2026-03-17';
const defaultClusterId = 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678';
const archiveMarketRoutePattern = /^\/market\/archive\/(\d{4}-\d{2}-\d{2})$/;
const clusterDetailRoutePattern =
  /^\/market\/cluster\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

function matchRouteParam(pathname: string, pattern: RegExp, fallback: string) {
  return pathname.match(pattern)?.[1] ?? fallback;
}

export function formatDateDots(value: string) {
  return value.replaceAll('-', '. ');
}

export function normalizeDateParam(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function getRelativeIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function parseListFilters(searchParams: URLSearchParams): ListFilters {
  const defaults = {
    from: getTodayIso(),
    to: getRelativeIso(14),
    status: '',
    page: 1,
  };

  return {
    from: normalizeDateParam(searchParams.get('from'), defaults.from),
    to: normalizeDateParam(searchParams.get('to'), defaults.to),
    status: searchParams.get('status') ?? defaults.status,
    page: Number(searchParams.get('page') ?? defaults.page) || 1,
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

export function parseRoute(pathname: string): AppRoute {
  if (pathname === '/' || pathname === '/market/latest') {
    return { page: 'latest' };
  }

  if (pathname === '/market/archive/search') {
    return { page: 'archive-search' };
  }

  if (pathname.startsWith('/market/archive/')) {
    return {
      page: 'archive-market',
      businessDate: matchRouteParam(
        pathname,
        archiveMarketRoutePattern,
        defaultBusinessDate
      ),
    };
  }

  if (pathname.startsWith('/market/cluster/')) {
    return {
      page: 'cluster-detail',
      clusterId: matchRouteParam(
        pathname,
        clusterDetailRoutePattern,
        defaultClusterId
      ),
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
