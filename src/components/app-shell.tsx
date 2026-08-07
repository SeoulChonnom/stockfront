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

/** Shared shell: desktop rail/mobile drawer and one app-wide live region. */
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
          className='fixed top-[-64px] left-3 z-(--z-skip) rounded-[8px] bg-[color:var(--primary)] px-4 py-2.5 text-body font-semibold text-[color:var(--primary-fg)] transition-[top] duration-(--dur) ease-(--ease) focus:top-3'
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

            {/* B1/B2: design's <main> pads all 4 sides equally with
                `var(--pad)` (32/20/14 across breakpoints, already declared
                in base.css) and is `flex; flex-direction:column;
                gap:var(--gap)` — not the previous 20px/12px asymmetric
                block padding. */}
            <main
              className='mx-auto flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-(--gap) p-(--pad)'
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
