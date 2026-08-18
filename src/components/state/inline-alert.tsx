import type { AriaRole, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { type SurfaceTone, TONE_ACCENT, TONE_SURFACE } from './tone-surface';

type AlertTone = SurfaceTone;

export type InlineAlertProps = {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: AriaRole;
  ariaLive?: 'off' | 'polite' | 'assertive';
  className?: string;
};

export function InlineAlert({
  tone,
  title,
  children,
  actions,
  role,
  ariaLive,
  className,
}: InlineAlertProps) {
  const resolvedRole = role ?? (tone === 'danger' ? 'alert' : undefined);
  const isInfo = tone === 'info';

  const content = (
    <>
      {title ? (
        <h3
          className={cn(
            'm-0 mb-1 text-card-heading font-semibold',
            TONE_ACCENT[tone]
          )}
        >
          {title}
        </h3>
      ) : null}
      {children ? (
        <div className='measure-error wrap-anywhere m-0 text-body text-fg-soft'>
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className='mt-3 flex flex-wrap gap-2'>{actions}</div>
      ) : null}
    </>
  );

  return (
    <div
      aria-live={ariaLive}
      className={cn(
        'min-w-0 rounded-[var(--r-md)] border',
        isInfo ? 'flex gap-2.5 py-3 px-4' : 'p-4',
        TONE_SURFACE[tone],
        className
      )}
      role={resolvedRole}
    >
      {isInfo ? (
        <span
          aria-hidden='true'
          className='shrink-0 font-bold text-[color:var(--info)]'
        >
          i
        </span>
      ) : null}
      {isInfo ? <div className='min-w-0'>{content}</div> : content}
    </div>
  );
}
