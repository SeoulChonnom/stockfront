import type { MouseEvent } from 'react';
import { DevRoleSimulator } from '@/components/shell/dev-role-simulator';
import { ProfileMenu } from '@/components/shell/profile-menu';
import { saveScrollPosition } from '@/components/shell/scroll-restoration';
import { SitemapNav } from '@/components/shell/sitemap-nav';
import { createNavigateHandler, type ThemeMode } from '@/lib/app-state';
import { withBasePath } from '@/lib/router';

const HOME_HREF = '/market/latest';

/**
 * 상단 고정 헤더. 좌측 사이트 명 · 중앙 사이트맵 버튼 그룹 · 우측 신원.
 *
 * 세 칸 그리드를 쓰는 이유는 양옆 폭이 서로 다르기 때문이다 — `justify-between`
 * 으로는 사이트 명 길이나 사용자 이름 길이에 따라 중앙 버튼이 좌우로 흔들린다.
 * `1fr auto 1fr`은 가운데를 뷰포트 정중앙에 못 박는다.
 *
 * 좁은 화면에서만 `auto 1fr auto`로 바꾼다. 양쪽 `1fr`은 폭이 같아야 하는데,
 * 390px에서는 그 규칙이 사이트 명을 "Market B…"로 잘라 놓는다 — 오른쪽 칸에
 * 아바타밖에 없어 남는 폭이 있는데도 그렇다. 정중앙 정렬은 포기해도 되는
 * 것이고, 제품 이름이 잘리는 건 아니다.
 */
export function SiteHeader({
  pathname,
  searchParams,
  currentRouteKey,
  failedCount,
  theme,
  onToggleTheme,
}: {
  pathname: string;
  searchParams: URLSearchParams;
  currentRouteKey: string;
  failedCount: number | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  function handleHomeClick(event: MouseEvent<HTMLAnchorElement>) {
    saveScrollPosition(currentRouteKey);
    createNavigateHandler(HOME_HREF)(event);
  }

  return (
    <header className='sticky top-0 z-(--z-sticky) border-b border-line bg-card'>
      <div className='mx-auto grid h-(--header-height) w-full max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-2 px-(--pad) sm:grid-cols-[1fr_auto_1fr]'>
        {/* 워드마크는 동작색이 아니라 전경색에 둔다. 옆의 사이트맵이 이 줄에서
            유일한 동작색 자리가 된다. */}
        <a
          className='min-w-0 truncate rounded-[6px] text-lead font-bold text-fg transition-colors duration-(--dur-fast) ease-(--ease) hover:text-primary'
          href={withBasePath(HOME_HREF)}
          onClick={handleHomeClick}
        >
          Market Brief
        </a>

        <SitemapNav
          className='justify-self-center'
          currentRouteKey={currentRouteKey}
          failedCount={failedCount}
          pathname={pathname}
          searchParams={searchParams}
        />

        <div className='flex min-w-0 items-center justify-end gap-2'>
          {import.meta.env.DEV ? (
            <div className='hidden lg:block'>
              <DevRoleSimulator />
            </div>
          ) : null}
          <ProfileMenu onToggleTheme={onToggleTheme} theme={theme} />
        </div>
      </div>
    </header>
  );
}
