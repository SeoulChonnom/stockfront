import { useSyncExternalStore } from 'react';

export type UrlState = {
  pathname: string;
  searchParams: URLSearchParams;
};

let lastHref = '';
let lastSnapshot: UrlState | null = null;

function getSnapshot(): UrlState {
  const href = `${window.location.pathname}${window.location.search}`;

  if (lastSnapshot && lastHref === href) {
    return lastSnapshot;
  }

  lastHref = href;
  lastSnapshot = {
    pathname: window.location.pathname,
    searchParams: new URLSearchParams(window.location.search),
  };

  return lastSnapshot;
}

function dispatchRouteChange() {
  window.dispatchEvent(new Event('routechange'));
}

export function navigate(
  to: string,
  options: {
    replace?: boolean;
  } = {},
) {
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](null, '', to);
  dispatchRouteChange();
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => onStoreChange();

  window.addEventListener('popstate', handleChange);
  window.addEventListener('routechange', handleChange);

  return () => {
    window.removeEventListener('popstate', handleChange);
    window.removeEventListener('routechange', handleChange);
  };
}

export function useUrlState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function buildUrl(
  pathname: string,
  query: Record<string, string | number | null | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return;
    }

    params.set(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
