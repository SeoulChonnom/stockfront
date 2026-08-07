import type { AriaRole, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AlertTone = 'danger' | 'warning' | 'info' | 'success';

const TONE_CLASSES: Readonly<Record<AlertTone, string>> = {
  danger:
    'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] border-l-[color:var(--danger)]',
  warning:
    'border-[color:var(--warning-line)] bg-[color:var(--warning-soft)] border-l-[color:var(--warning)]',
  info: 'border-[color:var(--info-line)] bg-[color:var(--info-soft)]',
  success:
    'border-[color:var(--success-line)] bg-[color:var(--success-soft)] border-l-[color:var(--success)]',
};

const TONE_TITLE_CLASSES: Readonly<Record<AlertTone, string>> = {
  danger: 'text-[color:var(--danger)]',
  warning: 'text-[color:var(--warning)]',
  info: 'text-[color:var(--info)]',
  success: 'text-[color:var(--success)]',
};

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
            'm-0 mb-1 text-[15px] font-semibold',
            TONE_TITLE_CLASSES[tone]
          )}
        >
          {title}
        </h3>
      ) : null}
      {children ? (
        <div className='measure-error wrap-anywhere m-0 text-[13.5px] text-fg-soft'>
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
        isInfo ? 'flex gap-2.5 py-3 px-4' : 'border-l-4 p-4',
        TONE_CLASSES[tone],
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
