import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { useCapabilities } from '@/lib/capabilities';

import { NavList } from './nav-list';

const DRAWER_TITLE_ID = 'nav-drawer-title';

const ROLE_LABELS: Readonly<Record<'user' | 'admin', string>> = {
  user: 'User',
  admin: 'Admin',
};

/** Drawer owns focus/scroll behavior and must not intercept browser history. */
export function NavDrawer({
  isOpen,
  onClose,
  pathname,
  searchParams,
  currentRouteKey,
  failedCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  pathname: string;
  searchParams: URLSearchParams;
  currentRouteKey: string;
  failedCount: number | null;
}) {
  const { role } = useCapabilities();

  return (
    <Drawer isOpen={isOpen} labelledBy={DRAWER_TITLE_ID} onClose={onClose}>
      <div className='flex items-center justify-between border-b border-line px-4 py-4'>
        <div className='min-w-0'>
          <p
            className='truncate text-[15px] font-bold tracking-[-0.02em] text-fg'
            id={DRAWER_TITLE_ID}
          >
            Market Brief
          </p>
          <p className='truncate text-[11.5px] text-faint'>
            {ROLE_LABELS[role]} · ops.analyst
          </p>
        </div>
        <Button
          aria-label='메뉴 닫기'
          onClick={onClose}
          size='icon'
          type='button'
          variant='ghost'
        >
          <X aria-hidden='true' size={18} />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto p-3'>
        <NavList
          currentRouteKey={currentRouteKey}
          failedCount={failedCount}
          itemMinHeightClass='min-h-12'
          onNavigate={onClose}
          pathname={pathname}
          searchParams={searchParams}
        />
      </div>
    </Drawer>
  );
}
