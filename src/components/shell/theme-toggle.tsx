import { MoonStar, SunMedium } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ThemeMode } from '@/lib/app-state';
import { cn } from '@/lib/utils';

export function ThemeToggleButton({
  theme,
  onToggle,
  className,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className={cn('shrink-0', className)}
      onClick={onToggle}
      size='icon'
      type='button'
      variant='ghost'
    >
      {theme === 'dark' ? (
        <SunMedium aria-hidden='true' size={18} />
      ) : (
        <MoonStar aria-hidden='true' size={18} />
      )}
    </Button>
  );
}
