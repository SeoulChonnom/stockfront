import { X } from 'lucide-react';
import { NavList } from '@/components/shell/nav-list';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
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
    <Sheet onOpenChange={(open) => !open && onClose()} open={isOpen}>
      <SheetContent
        className='flex w-80 flex-col gap-0 p-0'
        onCloseAutoFocus={(event) => {
          const trigger = document.querySelector<HTMLElement>(
            'button[aria-label="주요 메뉴 열기"]'
          );
          if (trigger) {
            event.preventDefault();
            trigger.focus();
          }
        }}
        side='left'
        /* 닫기 버튼은 `SheetContent`의 기본값(children 뒤, 영문 "Close")을 쓰지
           않는다. 이 앱은 전부 한국어이고, 드로어를 열었을 때 Radix가 첫 번째
           포커스 가능 요소를 잡으므로 닫기 버튼이 헤더 안 — NavList보다 앞 —
           에 있어야 한다. `e2e/a11y.spec.ts`가 이 순서를 검증한다. */
        showCloseButton={false}
      >
        <SheetHeader className='flex-row items-center justify-between gap-2 border-b border-border px-4 py-4 text-left'>
          <div className='min-w-0'>
            <SheetTitle className='truncate text-h2 font-bold text-foreground'>
              Market Brief
            </SheetTitle>
            {/* 이름이 없으면 역할만 남긴다 — `useAuthUserName` 참고. */}
            <SheetDescription className='truncate text-body-sm text-muted-foreground'>
              {userName
                ? `${ROLE_LABELS[role]} · ${userName}`
                : ROLE_LABELS[role]}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              aria-label='메뉴 닫기'
              size='icon'
              type='button'
              variant='ghost'
            >
              <X aria-hidden='true' size={18} />
            </Button>
          </SheetClose>
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
