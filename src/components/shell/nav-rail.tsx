import { CircleUserRound } from 'lucide-react';
import type { ThemeMode } from '@/lib/app-state';
import { useCapabilities } from '@/lib/capabilities';

import { DevRoleSimulator } from './dev-role-simulator';
import { NavList } from './nav-list';

const ROLE_LABELS: Readonly<Record<'user' | 'admin', string>> = {
  user: 'User',
  admin: 'Admin',
};

const THEME_LABELS: Readonly<Record<ThemeMode, string>> = {
  dark: '라이트 테마로 전환',
  light: '다크 테마로 전환',
};

/**
 * Desktop left rail — README §5. `≥1025px`: 248px, `position: sticky; top:0;
 * height:100vh`, 1px right border, `--surface` background. Hidden entirely
 * (not just visually) below 1025px via the `hidden min-[1025px]:flex`
 * pair — `NavDrawer` is the mobile equivalent.
 */
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
  const { role } = useCapabilities();

  return (
    <aside className='sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[color:var(--line)] bg-[color:var(--surface)] min-[1025px]:flex'>
      <div className='px-5 pt-6 pb-4'>
        {/* C5: design wordmark color is `--text`, not `--primary`. */}
        <p className='m-0 text-[19px] font-bold tracking-[-0.02em] text-[color:var(--text)] [font-family:var(--font-display)]'>
          Market Brief
        </p>
        {/* B1 (parity cycle 2): design rail has a subtitle under the wordmark. */}
        <p className='m-0 text-[12px] text-[color:var(--text-faint)]'>
          일간 시장 브리프 · 운영 콘솔
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

      <div className='flex flex-col gap-2 border-t border-[color:var(--line)] p-3'>
        <div className='flex items-center gap-2.5 px-1'>
          <span className='flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[color:var(--primary-line)] bg-[color:var(--primary-soft)] text-[color:var(--primary)]'>
            <CircleUserRound aria-hidden='true' size={16} />
          </span>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-[12.5px] font-semibold text-[color:var(--text)]'>
              ops.analyst
            </p>
            <p className='truncate text-[11px] text-[color:var(--text-faint)]'>
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        {/* C6: design's rail footer is a full-width outline "다크 테마로
            전환" text button, not a small circular icon button. */}
        <button
          className='flex min-h-9 items-center gap-2 rounded-[var(--r-md)] border border-[color:var(--line)] bg-transparent px-2.5 text-left text-[12.5px] text-[color:var(--text-soft)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text)]'
          onClick={onToggleTheme}
          type='button'
        >
          {THEME_LABELS[theme]}
        </button>

        {import.meta.env.DEV ? <DevRoleSimulator /> : null}
      </div>
    </aside>
  );
}
