import { useEffect, useMemo, useState } from 'react';

import { AppShell } from './components/app-shell';
import { PageMessage } from './components/ui';
import { parseRoute, type ThemeMode } from './lib/app-state';
import {
  useArchiveMarketPage,
  useLatestMarketPage,
} from './lib/query-hooks';
import { navigate, useUrlState } from './lib/router';
import { ArchiveSearchPage } from './pages/archive-search-page';
import { BatchOperationsPage } from './pages/batch-operations-page';
import { ClusterDetailPage } from './pages/cluster-detail-page';
import { MarketOverviewPage } from './pages/market-overview-page';
import { NotFoundPage } from './pages/not-found-page';

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname);
  const latestMarketQuery = useLatestMarketPage(route.page === 'latest');
  const archiveMarketQuery = useArchiveMarketPage(
    route.page === 'archive-market' ? route.businessDate : '',
    route.page === 'archive-market',
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
      {route.page === 'latest' && (
        <MarketOverviewContent
          error={latestMarketQuery.error}
          isLoading={latestMarketQuery.isLoading}
          mode="latest"
          snapshot={latestMarketQuery.data}
          title="Latest Market"
        />
      )}
      {route.page === 'archive-market' && (
        <MarketOverviewContent
          error={archiveMarketQuery.error}
          isLoading={archiveMarketQuery.isLoading}
          mode="archive"
          snapshot={archiveMarketQuery.data}
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

function MarketOverviewContent({
  error,
  isLoading,
  mode,
  snapshot,
  title,
}: {
  error: Error | null;
  isLoading: boolean;
  mode: 'latest' | 'archive';
  snapshot: Parameters<typeof MarketOverviewPage>[0]['snapshot'] | undefined;
  title: string;
}) {
  if (isLoading) {
    return (
      <PageMessage
        description="시장 요약 데이터를 불러오는 중입니다."
        title="Loading Market Data"
      />
    );
  }

  if (error) {
    return (
      <PageMessage
        description={error.message}
        title="Market Data Unavailable"
      />
    );
  }

  if (!snapshot) {
    return (
      <PageMessage
        description="표시할 시장 요약 데이터가 없습니다."
        title="No Market Data"
      />
    );
  }

  return <MarketOverviewPage mode={mode} snapshot={snapshot} title={title} />;
}

export default App;
