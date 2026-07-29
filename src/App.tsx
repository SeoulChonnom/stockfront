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
import {
  bootstrapAuth,
  getAuthBootstrapState,
  subscribeToAuthBootstrap,
} from './lib/auth-bootstrap';
import { useArchiveMarketPage, useLatestMarketPage } from './lib/query-hooks';
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
  badge: string;
  title: string;
  description: string;
  role: 'status' | 'alert';
  ariaLive: 'polite' | 'assertive';
  showSpinner: boolean;
};

function isAuthResolved(status: AuthBootstrapStatus) {
  return status === 'authenticated' || status === 'bypassed';
}

/** Copy is FINAL per README §7-8 — do not paraphrase. */
function getAuthBootstrapMessage(
  status: AuthBootstrapStatus
): AuthStatusCardConfig {
  if (status === 'failed') {
    return {
      tone: 'danger',
      badge: '401 · AUTH_BOOTSTRAP_FAILED',
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
  // §7-1: the route-change effect key must include BOTH pathname and search
  // (previously `pageFocusKey` here was `url.pathname` alone — a query-only
  // change like `?page=2` never re-focused/re-scrolled).
  const routeKey = buildScrollKey(url.pathname, search);
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
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    resolveInitialTheme()
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // README §6: "테마 선택은 localStorage에 저장하고 없으면
    // prefers-color-scheme을 따른다." — that fallback should stay live: if
    // the user never made an explicit choice, an OS-level scheme change
    // should keep updating the app, not just the initial resolve.
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

  // §9 focus contract — the shell's half:
  //
  // "primary route (pathname change) → focus #page-title" is the ONLY
  // transition this effect owns. It deliberately depends on `url.pathname`
  // alone, NOT on `routeKey`/search. Query-only transitions on the same
  // pathname (Archive 필터 적용, Archive pagination, 필터 검증 실패, Batch
  // `jobId` 행 선택, …) must NOT refocus `#page-title` — the owning page
  // moves focus to its own target (results heading / first invalid field /
  // detail heading) instead. This matters because `App.tsx` is the parent:
  // its effects commit after the page's own effects in the same commit, so
  // if this effect fired on every search change too, it would always win
  // and steal focus back from whatever the page just tried to do. Keying on
  // pathname only means this effect simply never runs for those
  // transitions, so there's nothing to steal.
  //
  // Page owners: use `useFocusOnChange` (`components/shell/use-focus-on-change.ts`)
  // to implement your own query-driven focus target — see that file's doc
  // comment for the contract and `archive-search-page.tsx`'s
  // `resultsHeadingRef` for the pattern it formalizes.
  // Route-focus bookkeeping (see the effect below).
  const focusedPathnameRef = useRef<string | null>(null);
  const focusedFallbackRef = useRef(false);

  // Why this is not a plain `[authResolved, url.pathname]` effect:
  // on a cold navigation the route's query is still loading when the effect
  // first commits, so the page renders a skeleton and then swaps in the real
  // subtree once data arrives. That swap remounts the `<h1 id="page-title">`,
  // silently dropping focus back to <body> — so §16-7
  // (`document.activeElement === #page-title`) failed on essentially every
  // navigation that wasn't served from cache. Instead we mark the route as
  // "focus pending" on pathname change and settle it on whichever render
  // first actually has the heading in the DOM.
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

    const heading = document.getElementById('page-title');

    if (heading) {
      // Heading was there on arrival: focus it unconditionally. The active
      // element at this moment is whatever the user activated to navigate
      // (a nav link, a table row button) — moving off it to the new page's
      // title is exactly the §9 contract.
      //
      // But if we already had to PARK on #main-content and wait for a late
      // heading, the user may have tabbed onward in the meantime (the skip
      // link is the very first stop). Yanking focus out from under them
      // mid-interaction is worse than never moving it, so in that case only
      // take focus back if nobody has claimed it.
      const active = document.activeElement;
      const focusIsUnclaimed =
        active === null ||
        active === document.body ||
        active.id === 'main-content';

      focusedPathnameRef.current = url.pathname;

      if (!focusedFallbackRef.current || focusIsUnclaimed) {
        heading.focus({ preventScroll: true });
      }

      return;
    }

    // Heading not rendered yet (loading state). Park focus on the main
    // landmark once so keyboard users aren't stranded at <body>, and stay
    // "pending" so the heading still wins as soon as it mounts.
    if (!focusedFallbackRef.current) {
      focusedFallbackRef.current = true;
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  });

  // Scroll restoration stays keyed on pathname+search (routeKey): §9 still
  // wants a scroll change (to top, or restored) for several query-only
  // transitions (Archive filter apply/pagination scroll results to top) —
  // that's an orthogonal contract from focus ownership above and keeps
  // working the same way for both pathname and query-only changes.
  useEffect(() => {
    if (!authResolved) {
      return;
    }

    window.scrollTo(0, getScrollPosition(routeKey) ?? 0);
  }, [authResolved, routeKey]);

  if (!authResolved) {
    const message = getAuthBootstrapMessage(authBootstrapState.status);

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
        archiveMarketQuery={archiveMarketQuery}
        latestMarketQuery={latestMarketQuery}
        route={route}
        searchParams={url.searchParams}
      />
    </AppShell>
  );
}

export default App;
