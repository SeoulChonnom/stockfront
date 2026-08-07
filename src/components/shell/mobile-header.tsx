import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ThemeMode } from '@/lib/app-state';

import { ThemeToggleButton } from './theme-toggle';

export function MobileHeader({
  groupLabel,
  itemLabel,
  isDrawerOpen,
  onOpenMenu,
  theme,
  onToggleTheme,
}: {
  groupLabel: string;
  itemLabel: string;
  isDrawerOpen: boolean;
  onOpenMenu: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header className='sticky top-0 z-(--z-sticky) flex h-16 items-center gap-3 border-b border-[color:var(--line)] bg-[color:var(--surface)] px-3 min-[1025px]:hidden'>
      <Button
        aria-expanded={isDrawerOpen}
        aria-label='주요 메뉴 열기'
        onClick={onOpenMenu}
        size='icon'
        type='button'
        variant='ghost'
      >
        <Menu aria-hidden='true' size={20} />
      </Button>

      <div className='min-w-0 flex-1'>
        <p className='truncate text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--text-faint)]'>
          {groupLabel}
        </p>
        <p className='truncate text-[14px] font-semibold text-[color:var(--text)]'>
          {itemLabel}
        </p>
      </div>

      <ThemeToggleButton onToggle={onToggleTheme} theme={theme} />
    </header>
  );
}
