import { type ReactNode, useState } from 'react';

import type { ThemeMode } from '../lib/app-state';

import { AnnounceProvider } from './shell/announce-context';
import { DevUrlStrip } from './shell/dev-url-strip';
import { MobileHeader } from './shell/mobile-header';
import { NavDrawer } from './shell/nav-drawer';
import { getActiveNavContext } from './shell/nav-items';
import { NavRail } from './shell/nav-rail';
import { buildScrollKey } from './shell/scroll-restoration';
import { useOpsFailedCount } from './shell/use-ops-failed-count';

/**
 * App Shell — README §5, §7-1. Replaces the old dual-nav sidebar+topbar
 * (duplicate links, non-functional search, Support/Documentation/System
 * Status/footer "Coming soon" placeholders — all deleted, §5 / the "Won't"
 * list in `docs/design_v2/09-scope-traceability-decisions.md`) with exactly
 * one primary nav rendered by `NavRail` (desktop, ≥1025px) / `NavDrawer`
 * (mobile, ≤1024px via `MobileHeader`'s menu button).
 *
 * Component tree:
 * ```
 * AppShell
 * └─ AnnounceProvider (keyed on pathname — the app's ONE aria-live region, §7-1)
 *    ├─ <a href="#main-content"> skip link
 *    ├─ NavRail            (desktop, hidden ≤1024px — not just visually: see NavList)
 *    ├─ MobileHeader        (mobile, hidden ≥1025px)
 *    ├─ (DEV only) DevUrlStrip
 *    ├─ <main id="main-content" tabIndex={-1}>  ← children (AppPageContent)
 *    └─ NavDrawer           (mobile menu, portal-less — renders null while closed)
 * ```
 *
 * `NavRail`/`NavDrawer` both render through `shell/nav-list.tsx`, the single
 * source of nav items + active-route rules (`shell/nav-items.ts`) — desktop
 * and mobile can never drift from each other.
 *
 * Any screen rendered as `children` can call `useAnnounce()`
 * (`src/components/shell/use-announce.ts`) to publish to the shared live
 * region — see `shell/announce-context.tsx`'s doc comment for the full
 * contract (it clears itself whenever `pathname`/`searchParams` change, so a
 * screen never needs to clear its own announcement on unmount).
 */
export function AppShell({
  children,
  pathname,
  searchParams,
  theme,
  onToggleTheme,
}: {
  children: ReactNode;
  pathname: string;
  searchParams: URLSearchParams;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const failedCount = useOpsFailedCount();
  const search = searchParams.toString();
  const currentRouteKey = buildScrollKey(pathname, search);
  const navContext = getActiveNavContext(pathname, searchParams);

  return (
    <AnnounceProvider pathname={pathname}>
      <div className='min-h-screen'>
        <a
          className='fixed top-[-64px] left-3 z-(--z-skip) rounded-[8px] bg-[color:var(--primary)] px-4 py-2.5 text-[13.5px] font-semibold text-[color:var(--primary-fg)] transition-[top] duration-(--dur) ease-(--ease) focus:top-3'
          href='#main-content'
        >
          본문으로 바로가기
        </a>

        <div className='flex min-w-0'>
          <NavRail
            currentRouteKey={currentRouteKey}
            failedCount={failedCount}
            onToggleTheme={onToggleTheme}
            pathname={pathname}
            searchParams={searchParams}
            theme={theme}
          />

          <div className='flex min-w-0 flex-1 flex-col'>
            <MobileHeader
              groupLabel={navContext.groupLabel}
              isDrawerOpen={isDrawerOpen}
              itemLabel={navContext.itemLabel}
              onOpenMenu={() => setDrawerOpen(true)}
              onToggleTheme={onToggleTheme}
              theme={theme}
            />

            {import.meta.env.DEV ? (
              <DevUrlStrip
                pathname={pathname}
                search={search ? `?${search}` : ''}
              />
            ) : null}

            <main
              className='mx-auto w-full min-w-0 max-w-[1280px] flex-1 px-3 py-5 min-[1025px]:px-8 min-[1025px]:py-8'
              id='main-content'
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
        </div>

        <NavDrawer
          currentRouteKey={currentRouteKey}
          failedCount={failedCount}
          isOpen={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
          pathname={pathname}
          searchParams={searchParams}
        />
      </div>
    </AnnounceProvider>
  );
}
