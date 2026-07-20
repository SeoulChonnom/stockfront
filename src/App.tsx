import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { AppPageContent } from './app/app-page-content';
import { getPageMeta } from './app/page-meta';
import { AppShell } from './components/app-shell';
import { PageMessage } from './components/ui';
import { parseRoute, type ThemeMode } from './lib/app-state';
import {
  bootstrapAuth,
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './lib/auth-bootstrap';
import { useArchiveMarketPage, useLatestMarketPage } from './lib/query-hooks';
import { navigate, useUrlState } from './lib/router';

function isAuthResolved(
  status: ReturnType<typeof getAuthBootstrapState>['status']
) {
  return status === 'authenticated' || status === 'bypassed';
}

function getAuthBootstrapMessage(
  status: ReturnType<typeof getAuthBootstrapState>['status']
) {
  if (status === 'failed') {
    return {
      title: '로그인 상태를 확인할 수 없습니다',
      description:
        '잠시 후 다시 시도하거나 로그인 페이지에서 다시 접속해 주세요.',
      role: 'alert' as const,
      ariaLive: 'assertive' as const,
    };
  }

  if (status === 'redirecting') {
    return {
      title: '로그인 페이지로 이동 중입니다',
      description: '자동으로 이동하지 않으면 새로고침 후 다시 시도해 주세요.',
      role: 'status' as const,
      ariaLive: 'polite' as const,
    };
  }

  return {
    title: '로그인 상태를 확인하고 있습니다',
    description: '잠시만 기다려 주세요.',
    role: 'status' as const,
    ariaLive: 'polite' as const,
  };
}

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname, url.searchParams);
  const pageFocusKey = url.pathname;
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
    route.page === 'archive-market'
      ? { businessDate: route.businessDate, pageId: route.pageId }
      : { businessDate: '', pageId: null },
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
    if (!authResolved || pageFocusKey.length === 0) {
      return;
    }

    const focusTarget =
      document.getElementById('page-title') ??
      document.getElementById('main-content');

    focusTarget?.focus();
  }, [authResolved, pageFocusKey]);

  if (!authResolved) {
    const authBootstrapMessage = getAuthBootstrapMessage(
      authBootstrapState.status
    );

    return (
      <main id='main-content' tabIndex={-1}>
        <PageMessage {...authBootstrapMessage} />
      </main>
    );
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
