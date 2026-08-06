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

/**
 * Mobile nav drawer — README §5. Opened by `MobileHeader`'s menu button.
 * Built on the shared `Drawer` primitive (`src/components/ui/drawer.tsx`),
 * which already owns the focus trap / Escape / overlay-click / scroll-lock /
 * return-focus contract and never touches history — opening/closing this
 * never hijacks browser Back (§5 explicit requirement).
 *
 * Items get the 48px mobile touch target (`min-h-12`) vs the rail's 40px.
 */
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
      <div className='flex items-center justify-between border-b border-[color:var(--line)] px-4 py-4'>
        <div className='min-w-0'>
          <p
            className='truncate text-[15px] font-bold tracking-[-0.02em] text-[color:var(--text)]'
            id={DRAWER_TITLE_ID}
          >
            Market Brief
          </p>
          <p className='truncate text-[11.5px] text-[color:var(--text-faint)]'>
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
