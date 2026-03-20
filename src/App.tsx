import { useEffect, useMemo, useState } from 'react';

import { AppShell } from './components/app-shell';
import { parseRoute, type ThemeMode } from './lib/app-state';
import { navigate, useUrlState } from './lib/router';
import { archiveMarketSnapshots, latestMarketSnapshot } from './mock-data';
import { ArchiveSearchPage } from './pages/archive-search-page';
import { BatchOperationsPage } from './pages/batch-operations-page';
import { ClusterDetailPage } from './pages/cluster-detail-page';
import { MarketOverviewPage } from './pages/market-overview-page';
import { NotFoundPage } from './pages/not-found-page';

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname);
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

  const pageMeta = useMemo(() => {
    switch (route.page) {
      case 'latest':
        return {
          title: 'Market Daily Brief - Latest Market',
          topSearchPlaceholder: 'Search market briefs',
        };
      case 'archive-market':
        return {
          title: `Market Daily Brief - Archive ${route.businessDate}`,
          topSearchPlaceholder: 'Search archived summaries',
        };
      case 'archive-search':
        return {
          title: 'Market Daily Brief - Archive Search',
          topSearchPlaceholder: 'Search archive records',
        };
      case 'cluster-detail':
        return {
          title: 'Market Daily Brief - News Cluster Detail',
          topSearchPlaceholder: 'Search related clusters',
        };
      case 'batch-ops':
        return {
          title: 'Market Daily Brief - Batch Operations',
          topSearchPlaceholder: 'Search operations',
        };
      default:
        return {
          title: 'Market Daily Brief',
          topSearchPlaceholder: 'Search',
        };
    }
  }, [route]);

  useEffect(() => {
    document.title = pageMeta.title;
  }, [pageMeta.title]);

  return (
    <AppShell
      onToggleTheme={() =>
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
      }
      pathname={url.pathname}
      placeholder={pageMeta.topSearchPlaceholder}
      theme={theme}
    >
      {route.page === 'latest' && (
        <MarketOverviewPage
          mode="latest"
          snapshot={latestMarketSnapshot}
          title="Latest Market"
        />
      )}
      {route.page === 'archive-market' && (
        <MarketOverviewPage
          mode="archive"
          snapshot={
            archiveMarketSnapshots[route.businessDate] ??
            archiveMarketSnapshots[latestMarketSnapshot.businessDate]
          }
          title="Archive Market"
        />
      )}
      {route.page === 'archive-search' && (
        <ArchiveSearchPage searchParams={url.searchParams} />
      )}
      {route.page === 'cluster-detail' && (
        <ClusterDetailPage clusterId={route.clusterId} />
      )}
      {route.page === 'batch-ops' && (
        <BatchOperationsPage searchParams={url.searchParams} />
      )}
      {route.page === 'not-found' && <NotFoundPage />}
    </AppShell>
  );
}

export default App;
