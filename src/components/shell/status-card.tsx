import { Loader2 } from 'lucide-react';
import type { AriaRole, ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatusCardTone = 'info' | 'danger';

const TONE_BADGE_CLASSES: Readonly<Record<StatusCardTone, string>> = {
  info: 'border-[color:var(--info-line)] bg-[color:var(--info-soft)] text-[color:var(--info)]',
  danger:
    'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)]',
};

export type StatusCardProps = {
  tone: StatusCardTone;
  badge: string;
  title: string;
  titleId?: string;
  description: string;
  role?: AriaRole;
  ariaLive?: 'polite' | 'assertive';
  showSpinner?: boolean;
  actions?: ReactNode;
  fullScreen?: boolean;
};

export function StatusCard({
  tone,
  badge,
  title,
  titleId,
  description,
  role,
  ariaLive,
  showSpinner,
  actions,
  fullScreen = true,
}: StatusCardProps) {
  return (
    <div
      className={cn(
        'flex justify-center px-4 py-10',
        fullScreen && 'min-h-screen items-center bg-[color:var(--bg)]'
      )}
    >
      <Card
        aria-live={ariaLive}
        className='mx-auto w-full max-w-[440px] p-6 text-center'
        role={role}
      >
        <span
          className={cn(
            'mono inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border px-2 py-0.5 text-[12.5px] font-semibold',
            TONE_BADGE_CLASSES[tone]
          )}
        >
          {badge}
        </span>
        <h1
          className={cn(
            'mb-2 font-semibold text-fg',
            fullScreen ? 'mt-3 text-[22px]' : 'mt-[10px] text-[20px]'
          )}
          id={titleId}
          tabIndex={-1}
        >
          {title}
        </h1>
        <p className='wrap-anywhere mb-5 text-[13.5px] text-fg-soft'>
          {description}
        </p>
        {showSpinner ? (
          <Loader2
            aria-hidden='true'
            className='mx-auto mb-5 size-6 animate-[spin_var(--dur-spinner)_linear_infinite] text-[color:var(--info)]'
          />
        ) : null}
        {actions ? (
          <div className='flex flex-wrap justify-center gap-2'>{actions}</div>
        ) : null}
      </Card>
    </div>
  );
}
