import { NavList } from '@/components/shell/nav-list';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthUserName } from '@/lib/auth-user';
import { useCapabilities } from '@/lib/capabilities';

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
  const userName = useAuthUserName();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side='left'
        className='p-0 flex flex-col gap-0 w-80'
        onCloseAutoFocus={(event) => {
          const trigger = document.querySelector<HTMLElement>(
            'button[aria-label="주요 메뉴 열기"]'
          );
          if (trigger) {
            event.preventDefault();
            trigger.focus();
          }
        }}
      >
        <SheetHeader className='text-left border-b border-border px-4 py-4 space-y-1'>
          <SheetTitle className='truncate text-h2 font-bold text-foreground'>
            Market Brief
          </SheetTitle>
          <SheetDescription className='truncate text-sm text-muted-foreground'>
            {userName
              ? `${ROLE_LABELS[role]} · ${userName}`
              : ROLE_LABELS[role]}
          </SheetDescription>
        </SheetHeader>

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
      </SheetContent>
    </Sheet>
  );
}
