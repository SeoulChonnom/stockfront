import { useSyncExternalStore } from 'react';

type UrlState = {
  pathname: string;
  searchParams: URLSearchParams;
};

const ROUTE_CHANGE_EVENT = 'routechange';

const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

function stripBasePath(pathname: string): string {
  if (BASE_PATH.length === 0) {
    return pathname;
  }

  if (pathname === BASE_PATH) {
    return '/';
  }

  if (pathname.startsWith(`${BASE_PATH}/`)) {
    return pathname.slice(BASE_PATH.length);
  }

  return pathname;
}

export function withBasePath(pathname: string): string {
  if (BASE_PATH.length === 0) {
    return pathname;
  }

  return pathname === '/' ? BASE_PATH : `${BASE_PATH}${pathname}`;
}

let lastHref = '';
let lastSnapshot: UrlState | null = null;

function createUrlState({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}): UrlState {
  return {
    pathname,
    searchParams: new URLSearchParams(search),
  };
}

function getCurrentHref({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}) {
  return `${pathname}${search}`;
}

function getSnapshot(): UrlState {
  const pathname = stripBasePath(window.location.pathname);
  const href = getCurrentHref({ pathname, search: window.location.search });

  if (lastSnapshot && lastHref === href) {
    return lastSnapshot;
  }

  lastHref = href;
  lastSnapshot = createUrlState({ pathname, search: window.location.search });

  return lastSnapshot;
}

function getServerSnapshot(): UrlState {
  return createUrlState({ pathname: '/', search: '' });
}

function dispatchRouteChange() {
  window.dispatchEvent(new Event(ROUTE_CHANGE_EVENT));
}

export function navigate(
  to: string,
  options: {
    replace?: boolean;
  } = {}
) {
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', withBasePath(to));
  dispatchRouteChange();
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();

  window.addEventListener('popstate', handleChange);
  window.addEventListener(ROUTE_CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener('popstate', handleChange);
    window.removeEventListener(ROUTE_CHANGE_EVENT, handleChange);
  };
}

export function useUrlState() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function buildSearchParams(
  query: Record<string, string | number | null | undefined>
) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

export function buildUrl(
  pathname: string,
  query: Record<string, string | number | null | undefined>
) {
  const params = buildSearchParams(query);
  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
