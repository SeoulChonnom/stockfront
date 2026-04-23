import { useEffect, useMemo, useState } from 'react';

import { AppPageContent } from './app/app-page-content';
import { getPageMeta } from './app/page-meta';
import { AppShell } from './components/app-shell';
import { parseRoute, type ThemeMode } from './lib/app-state';
import { useArchiveMarketPage, useLatestMarketPage } from './lib/query-hooks';
import { navigate, useUrlState } from './lib/router';

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname);
  const latestMarketQuery = useLatestMarketPage(route.page === 'latest');
  const archiveMarketQuery = useArchiveMarketPage(
    route.page === 'archive-market' ? route.businessDate : '',
    route.page === 'archive-market'
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
    if (url.pathname === '/') {
      navigate('/market/latest', { replace: true });
    }
  }, [url.pathname]);

  const pageMeta = useMemo(() => getPageMeta(route), [route]);

  useEffect(() => {
    document.title = pageMeta.title;
  }, [pageMeta.title]);

  useEffect(() => {
    const focusTarget =
      document.getElementById('page-title') ??
      document.getElementById('main-content');

    focusTarget?.focus();
  }, [url.pathname, url.searchParams]);

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
