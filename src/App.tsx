import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { AppPageContent } from './app/app-page-content';
import { getPageMeta } from './app/page-meta';
import { AppShell } from './components/app-shell';
import {
  buildScrollKey,
  getScrollPosition,
} from './components/shell/scroll-restoration';
import {
  StatusCard,
  type StatusCardTone,
} from './components/shell/status-card';
import { Button } from './components/ui/button';
import { parseRoute, type ThemeMode } from './lib/app-state';
import type { Audience } from './lib/audience-copy';
import { errorCodeCopy } from './lib/audience-copy';
import {
  bootstrapAuth,
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './lib/auth-bootstrap';
import { useCapabilities } from './lib/capabilities';
import { navigate, useUrlState } from './lib/router';
import {
  applyTheme,
  getStoredTheme,
  setTheme as persistTheme,
  resolveInitialTheme,
  subscribeToSystemTheme,
} from './lib/theme';

type AuthBootstrapStatus = ReturnType<typeof getAuthBootstrapState>['status'];

type AuthStatusCardConfig = {
  tone: StatusCardTone;
  badge: string | null;
  title: string;
  description: string;
  role: 'status' | 'alert';
  ariaLive: 'polite' | 'assertive';
  showSpinner: boolean;
};

function isAuthResolved(status: AuthBootstrapStatus) {
  return status === 'authenticated' || status === 'bypassed';
}

/**
 * Product-approved not-found copy; do not paraphrase. `redirecting`/
 * `checking` badges are already plain Korean status phrases, not English
 * error codes, so only the `failed` branch routes through `errorCodeCopy`.
 */
function getAuthBootstrapMessage(
  status: AuthBootstrapStatus,
  audience: Audience
): AuthStatusCardConfig {
  if (status === 'failed') {
    return {
      tone: 'danger',
      badge: errorCodeCopy(audience, '401 · AUTH_BOOTSTRAP_FAILED'),
      title: '로그인 상태를 확인할 수 없습니다',
      description:
        '잠시 후 다시 시도하거나 로그인 페이지에서 다시 접속해 주세요. 인증이 끝나면 마지막으로 보던 화면으로 돌아옵니다.',
      role: 'alert',
      ariaLive: 'assertive',
      showSpinner: false,
    };
  }

  if (status === 'redirecting') {
    return {
      tone: 'info',
      badge: '로그인으로 이동',
      title: '로그인 페이지로 이동 중입니다',
      description: '자동으로 이동하지 않으면 새로고침 후 다시 시도해 주세요.',
      role: 'status',
      ariaLive: 'polite',
      showSpinner: true,
    };
  }

  return {
    tone: 'info',
    badge: '인증 확인 중',
    title: '로그인 상태를 확인하고 있습니다',
    description: '잠시만 기다려 주세요. 인증이 끝나면 최신 브리프가 열립니다.',
    role: 'status',
    ariaLive: 'polite',
    showSpinner: true,
  };
}

function App() {
  const url = useUrlState();
  const route = parseRoute(url.pathname, url.searchParams);
  const search = url.searchParams.toString();
  // Scroll restoration includes pathname and search; focus below intentionally does not.
  const routeKey = buildScrollKey(url.pathname, search);
  const authBootstrapState = useSyncExternalStore(
    subscribeToAuthBootstrap,
    getAuthBootstrapState,
    getAuthBootstrapState
  );
  const authResolved = isAuthResolved(authBootstrapState.status);
  const capabilities = useCapabilities();
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    resolveInitialTheme()
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Keep following the OS theme until the user stores an explicit choice.
    return subscribeToSystemTheme((systemTheme) => {
      if (getStoredTheme() !== null) {
        return;
      }

      setThemeState(systemTheme);
    });
  }, []);

  useEffect(() => {
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!authResolved || url.pathname !== '/') {
      return;
    }

    navigate('/market/latest', { replace: true });
  }, [authResolved, url.pathname]);

  const pageMeta = useMemo(() => getPageMeta(route), [route]);

  useEffect(() => {
    document.title = pageMeta.title;
  }, [pageMeta.title]);

  // Focus only on pathname changes. Including search would steal focus from page-owned
  // targets during filter, pagination, validation, or row-selection updates.
  const focusedPathnameRef = useRef<string | null>(null);
  const focusedFallbackRef = useRef(false);

  // Observe #main-content because a late query result can mount the heading without rerunning App.
  useEffect(() => {
    if (!authResolved) {
      return;
    }

    if (focusedPathnameRef.current !== url.pathname) {
      focusedFallbackRef.current = false;
    }

    if (focusedPathnameRef.current === url.pathname) {
      return;
    }

    const mainContent = document.getElementById('main-content');
    let observer: MutationObserver | null = null;

    const settleFocus = () => {
      const heading = mainContent?.querySelector<HTMLElement>('#page-title');

      if (!heading) {
        // Park focus on the main landmark until the loading heading mounts.
        if (!focusedFallbackRef.current) {
          focusedFallbackRef.current = true;
          mainContent?.focus({ preventScroll: true });
        }

        return false;
      }

      // Do not pull focus back from a user who continued tabbing while the heading loaded.
      const active = document.activeElement;
      const focusIsUnclaimed =
        active === null ||
        active === document.body ||
        active.id === 'main-content';

      focusedPathnameRef.current = url.pathname;

      if (!focusedFallbackRef.current || focusIsUnclaimed) {
        heading.focus({ preventScroll: true });
      }

      observer?.disconnect();
      return true;
    };

    if (
      !settleFocus() &&
      mainContent &&
      typeof MutationObserver !== 'undefined'
    ) {
      observer = new MutationObserver(() => {
        settleFocus();
      });
      observer.observe(mainContent, { childList: true, subtree: true });
    }

    return () => observer?.disconnect();
  }, [authResolved, url.pathname]);

  // Scroll restoration is independent from pathname-only focus ownership.
  useEffect(() => {
    if (!authResolved) {
      return;
    }

    window.scrollTo(0, getScrollPosition(routeKey) ?? 0);
  }, [authResolved, routeKey]);

  if (!authResolved) {
    const message = getAuthBootstrapMessage(authBootstrapState.status, {
      canViewOps: capabilities.can('ops.view'),
    });

    return (
      <StatusCard
        actions={
          authBootstrapState.status === 'failed' ? (
            <Button onClick={() => window.location.reload()} type='button'>
              다시 시도
            </Button>
          ) : undefined
        }
        ariaLive={message.ariaLive}
        badge={message.badge}
        description={message.description}
        role={message.role}
        showSpinner={message.showSpinner}
        title={message.title}
        tone={message.tone}
      />
    );
  }

  return (
    <AppShell
      onToggleTheme={() =>
        setThemeState((current) => {
          const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
          persistTheme(next);
          return next;
        })
      }
      pathname={url.pathname}
      searchParams={url.searchParams}
      theme={theme}
    >
      <AppPageContent
        authResolved={authResolved}
        route={route}
        searchParams={url.searchParams}
      />
    </AppShell>
  );
}

export default App;
