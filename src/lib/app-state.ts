import type { MouseEvent } from 'react';

import { navigate } from './router';

export type ThemeMode = 'light' | 'dark';

export type AppRoute =
  | { page: 'latest' }
  | { page: 'archive-market'; businessDate: string }
  | { page: 'archive-search' }
  | { page: 'cluster-detail'; clusterId: string }
  | { page: 'batch-ops' }
  | { page: 'not-found' };

const defaultBusinessDate = '2026-03-17';
const defaultClusterId = 'a8d5d5f8-fec5-4caa-b5ef-91a1c0b5d678';

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
      businessDate:
        pathname.match(/^\/market\/archive\/(\d{4}-\d{2}-\d{2})$/)?.[1] ??
        defaultBusinessDate,
    };
  }

  if (pathname.startsWith('/market/cluster/')) {
    return {
      page: 'cluster-detail',
      clusterId:
        pathname.match(
          /^\/market\/cluster\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/,
        )?.[1] ?? defaultClusterId,
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
