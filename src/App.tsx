import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { AppPageContent } from './app/app-page-content';
import { getPageMeta } from './app/page-meta';
import { AppShell } from './components/app-shell';
import { parseRoute, type ThemeMode } from './lib/app-state';
import {
  bootstrapAuth,
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './lib/auth-bootstrap';
import { useArchiveMarketPage, useLatestMarketPage } from './lib/query-hooks';
import { navigate, useUrlState } from './lib/router';

function isAuthResolved(status: ReturnType<typeof getAuthBootstrapState>['status']) {
  return status === 'authenticated' || status === 'bypassed';
}

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname);
  const authBootstrapState = useSyncExternalStore(
    subscribeToAuthBootstrap,
    getAuthBootstrapState,
    getAuthBootstrapState
  );
  const authResolved = isAuthResolved(authBootstrapState.status);
  const latestMarketQuery = useLatestMarketPage(
    authResolved && route.page === 'latest'
  );
  const archiveMarketQuery = useArchiveMarketPage(
    route.page === 'archive-market' ? route.businessDate : '',
    authResolved && route.page === 'archive-market'
  );
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!authResolved || url.pathname !== '/') {
      return;
    }

    if (url.pathname === '/') {
      navigate('/market/latest', { replace: true });
    }
  }, [authResolved, url.pathname]);

  const pageMeta = useMemo(() => getPageMeta(route), [route]);

  useEffect(() => {
    document.title = pageMeta.title;
  }, [pageMeta.title]);

  useEffect(() => {
    if (!authResolved) {
      return;
    }

    const focusTarget =
      document.getElementById('page-title') ??
      document.getElementById('main-content');

    focusTarget?.focus();
  }, [authResolved, url.pathname, url.searchParams]);

  if (!authResolved) {
    return null;
  }

  return (
    <AppShell
      onToggleTheme={() =>
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
      }
      pathname={url.pathname}
      placeholder={pageMeta.topSearchPlaceholder}
      theme={theme}
    >
      <AppPageContent
        archiveMarketQuery={archiveMarketQuery}
        latestMarketQuery={latestMarketQuery}
        route={route}
        searchParams={url.searchParams}
      />
    </AppShell>
  );
}

export default App;
