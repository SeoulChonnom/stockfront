import type { ReactNode } from 'react';
import { AnnounceProvider } from '@/components/shell/announce-context';
import { DevUrlStrip } from '@/components/shell/dev-url-strip';
import { buildScrollKey } from '@/components/shell/scroll-restoration';
import { SiteHeader } from '@/components/shell/site-header';
import { useOpsFailedCount } from '@/components/shell/use-ops-failed-count';
import type { ThemeMode } from '@/lib/app-state';

/** 공통 셸: 상단 고정 헤더 하나와 앱 전체가 공유하는 라이브 리전 하나. */
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
  const failedCount = useOpsFailedCount();
  const search = searchParams.toString();
  const currentRouteKey = buildScrollKey(pathname, search);

  return (
    <AnnounceProvider pathname={pathname}>
      <div className='flex min-h-screen min-w-0 flex-col'>
        <a
          className='fixed top-[-64px] left-3 z-(--z-skip) rounded-[8px] bg-primary px-4 py-2.5 text-body font-semibold text-primary-foreground transition-[top] duration-(--dur) ease-(--ease) focus:top-3'
          href='#main-content'
        >
          본문으로 바로가기
        </a>

        <SiteHeader
          currentRouteKey={currentRouteKey}
          failedCount={failedCount}
          onToggleTheme={onToggleTheme}
          pathname={pathname}
          searchParams={searchParams}
          theme={theme}
        />

        {import.meta.env.DEV ? (
          <DevUrlStrip
            pathname={pathname}
            search={search ? `?${search}` : ''}
          />
        ) : null}

        {/* Main uses equal responsive padding on all sides and a flex
            column gap between route-level sections. */}
        <main
          className='mx-auto flex w-full min-w-0 max-w-[1280px] flex-1 flex-col gap-(--gap) p-(--pad)'
          id='main-content'
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </AnnounceProvider>
  );
}
