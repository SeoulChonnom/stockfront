import {
  ChevronDown,
  CircleUserRound,
  MoonStar,
  SunMedium,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ThemeMode } from '@/lib/app-state';
import { useAuthUserName } from '@/lib/auth-user';
import { useCapabilities } from '@/lib/capabilities';

const ROLE_LABELS: Readonly<Record<'user' | 'admin', string>> = {
  user: 'User',
  admin: 'Admin',
};

/**
 * 헤더 우측의 신원 블록.
 *
 * 이름이 없으면(로그인 전·개발 우회·백엔드가 `name`을 비워 보낸 경우) 그 줄을
 * 지우고 역할만 남긴다 — 자리표시자를 지어내지 않는다(`useAuthUserName` 참고).
 * 그때는 역할이 이 블록의 1차 정보가 되므로 트리거에도 역할이 올라온다.
 *
 * `lg` 아래에서는 트리거가 아바타만 남긴다. 그 폭은 가운데 사이트맵이 목적지
 * 라벨을 펼치는 구간이고, 이름과 라벨이 같은 줄을 두고 다투면 잘리는 쪽은 늘
 * 목적지다. 이름은 `aria-label`과 메뉴 안에 그대로 남는다.
 */
export function ProfileMenu({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  const { role } = useCapabilities();
  const userName = useAuthUserName();
  const roleLabel = ROLE_LABELS[role];
  const initial = userName?.trim().charAt(0) ?? null;
  const themeLabel =
    theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={userName ? `계정 메뉴 · ${userName}` : '계정 메뉴'}
          className='tap-target h-9 max-w-[min(40vw,12rem)] gap-2 rounded-full px-1 lg:pr-2.5'
          size='sm'
          type='button'
          variant='ghost'
        >
          <Avatar className='size-7 border border-primary-line bg-primary-soft'>
            <AvatarFallback className='bg-transparent text-label font-semibold text-primary'>
              {initial ?? (
                <CircleUserRound aria-hidden='true' className='size-4' />
              )}
            </AvatarFallback>
          </Avatar>
          <span className='hidden min-w-0 truncate text-body-sm font-medium lg:inline'>
            {userName ?? roleLabel}
          </span>
          <ChevronDown
            aria-hidden='true'
            className='hidden text-faint lg:block'
            size={14}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-56' sideOffset={8}>
        <DropdownMenuLabel className='flex flex-col gap-0.5'>
          {userName ? (
            <span className='truncate text-body-sm font-semibold text-fg'>
              {userName}
            </span>
          ) : null}
          <span className='truncate text-label font-normal text-faint'>
            {roleLabel}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className='min-h-9 cursor-pointer text-body'
          onSelect={onToggleTheme}
        >
          {theme === 'dark' ? (
            <SunMedium aria-hidden='true' className='text-faint' />
          ) : (
            <MoonStar aria-hidden='true' className='text-faint' />
          )}
          {themeLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
