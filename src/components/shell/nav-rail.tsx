import { CircleUserRound } from 'lucide-react';
import type { ThemeMode } from '@/lib/app-state';
import { serviceTagline } from '@/lib/audience-copy';
import { useAuthUserName } from '@/lib/auth-user';
import { useCapabilities } from '@/lib/capabilities';

import { DevRoleSimulator } from './dev-role-simulator';
import { NavList } from './nav-list';
import { ThemeToggleButton } from './theme-toggle';

const ROLE_LABELS: Readonly<Record<'user' | 'admin', string>> = {
  user: 'User',
  admin: 'Admin',
};

export function NavRail({
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
  const { can, role } = useCapabilities();
  const userName = useAuthUserName();

  return (
    <aside className='sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-[color:var(--surface)] min-[1025px]:flex'>
      <div className='px-5 pt-6 pb-4'>
        {/* Keep the wordmark on the foreground token rather than the primary accent. */}
        <p className='m-0 text-h2 font-bold text-fg'>Market Brief</p>
        {/* Keep secondary context visible beneath the rail wordmark. */}
        <p className='m-0 text-label text-faint'>
          {serviceTagline({ canViewOps: can('ops.view') })}
        </p>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-3 pb-4'>
        <NavList
          currentRouteKey={currentRouteKey}
          failedCount={failedCount}
          itemMinHeightClass='min-h-10'
          pathname={pathname}
          searchParams={searchParams}
        />
      </div>

      <div className='flex flex-col gap-2 border-t border-line p-3'>
        <div className='flex items-center gap-2.5 px-1'>
          <span className='flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[color:var(--primary-line)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]'>
            <CircleUserRound aria-hidden='true' size={16} />
          </span>
          {/* 이름이 없으면 그 줄을 지우고 역할만 남긴다 — 자리표시자를
              지어내지 않는다(`useAuthUserName` 참고). 그때 역할이 이 블록의
              1차 정보가 되므로 무게도 함께 올라간다. */}
          <div className='min-w-0 flex-1'>
            {userName ? (
              <>
                <p className='truncate text-body-sm font-semibold text-fg'>
                  {userName}
                </p>
                <p className='truncate text-label text-faint'>
                  {ROLE_LABELS[role]}
                </p>
              </>
            ) : (
              <p className='truncate text-body-sm font-semibold text-fg'>
                {ROLE_LABELS[role]}
              </p>
            )}
          </div>
          <ThemeToggleButton onToggle={onToggleTheme} theme={theme} />
        </div>
        {import.meta.env.DEV ? <DevRoleSimulator /> : null}
      </div>
    </aside>
  );
}
