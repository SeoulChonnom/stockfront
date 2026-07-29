import type { AriaRole, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * InlineAlert — README §8/§12 "PageMessage 대체" 패밀리 중 오류/안내 담당.
 *
 * 항상 영향받는 영역 안에서만 나타나고(전체 화면 대체 금지), danger는
 * `role="alert"`로 즉시 발표된다. 복구 액션(`actions`)을 위한 슬롯을
 * 제공한다 — 오류는 항상 다음 행동(예: "다시 시도")을 가져야 한다(§8).
 * 본문은 `--measure-error`(62ch)로 폭을 제한한다(§6).
 */

export type AlertTone = 'danger' | 'warning' | 'info' | 'success';

const TONE_CLASSES: Readonly<Record<AlertTone, string>> = {
  danger:
    'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] border-l-[color:var(--danger)]',
  warning:
    'border-[color:var(--warning-line)] bg-[color:var(--warning-soft)] border-l-[color:var(--warning)]',
  info: 'border-[color:var(--info-line)] bg-[color:var(--info-soft)] border-l-[color:var(--info)]',
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
  /** 기본값은 tone==='danger'일 때만 'alert'. 호출부가 명시하면 그 값을 우선한다. */
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

  return (
    <div
      aria-live={ariaLive}
      className={cn(
        'min-w-0 rounded-[var(--r-md)] border border-l-4 p-4',
        TONE_CLASSES[tone],
        className
      )}
      role={resolvedRole}
    >
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
        <div className='measure-error wrap-anywhere m-0 text-[13.5px] text-[color:var(--text-soft)]'>
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className='mt-3 flex flex-wrap gap-2'>{actions}</div>
      ) : null}
    </div>
  );
}
