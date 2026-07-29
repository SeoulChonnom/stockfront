import { Loader2 } from 'lucide-react';
import type { AriaRole, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * StatusCard — README §7-8 Auth Bootstrap · 404. "셸 없이 중앙 정렬 카드
 * (max-width 440px): tone 배지 + h1 + 설명 + (loading·redirecting) spinner +
 * 액션."
 *
 * Shared by `App.tsx`'s three auth-bootstrap states (rendered before the
 * shell exists at all — `fullScreen`, the default) and `not-found-page.tsx`'s
 * 404 (rendered inside `AppShell`'s `<main>`, so `fullScreen={false}` so it
 * doesn't fight the shell for viewport height).
 */

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
  /** Full-viewport centering for the shell-less auth screens. `false` for 404, which renders inside `<main>`. */
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
      <div
        aria-live={ariaLive}
        className='mx-auto w-full max-w-[440px] rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 text-center'
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
          className='mt-3 mb-2 text-[22px] font-semibold text-[color:var(--text)]'
          id={titleId}
          tabIndex={-1}
        >
          {title}
        </h1>
        <p className='wrap-anywhere mb-5 text-[13.5px] text-[color:var(--text-soft)]'>
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
      </div>
    </div>
  );
}
