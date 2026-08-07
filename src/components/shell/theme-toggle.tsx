import { MoonStar, SunMedium } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ThemeMode } from '@/lib/app-state';
import { cn } from '@/lib/utils';

export function ThemeToggleButton({
  theme,
  onToggle,
  className,
  showLabel = false,
}: {
  theme: ThemeMode;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}) {
  const label = theme === 'dark' ? '라이트 테마로 전환' : '다크 테마로 전환';

  return (
    <Button
      aria-label={label}
      className={cn(
        'shrink-0',
        showLabel && 'min-h-9 w-full justify-start px-2.5 text-body-sm',
        className
      )}
      onClick={onToggle}
      size={showLabel ? 'sm' : 'icon'}
      type='button'
      variant='ghost'
    >
      {showLabel ? (
        label
      ) : theme === 'dark' ? (
        <SunMedium aria-hidden='true' size={18} />
      ) : (
        <MoonStar aria-hidden='true' size={18} />
      )}
    </Button>
  );
}
