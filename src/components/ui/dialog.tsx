import type { ReactNode, RefObject } from 'react';

import { cn } from '@/lib/utils';

import { useDismissable } from './use-dismissable';

/**
 * Dialog — README §7-7 Manual Trigger + §15. `role="dialog" aria-modal="true"
 * aria-labelledby`, `width: min(520px, 94vw)`, `max-height: 88vh`, `--sh3`,
 * overlay `rgba(8,17,31,.55)`. Same focus-trap/Escape/overlay-click/
 * return-focus/scroll-lock contract as Drawer (shared `useDismissable`).
 *
 * This is the primitive. §7-7's idle→pending→success/error lifecycle
 * (content that *replaces itself* so duplicate submit is structurally
 * impossible) is the caller's concern — Dialog only owns the modal shell,
 * not what's inside it, so Phase 6's Trigger dialog can swap its children
 * per state without this component knowing anything about Trigger.
 */

export type DialogProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
};

export function Dialog({
  isOpen,
  onClose,
  children,
  labelledBy,
  initialFocusRef,
  className,
}: DialogProps) {
  const { containerRef } = useDismissable<HTMLDivElement>({
    isOpen,
    onDismiss: onClose,
    initialFocusRef,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-(--z-dialog-overlay) flex items-center justify-center p-4'>
      {/* The backdrop is a real <button> rather than a click-handling <div>:
          overlay-click-to-close is then keyboard-operable by construction
          (Escape via `useDismissable` remains the primary path). `tabIndex={-1}`
          keeps it out of the tab order so it never becomes a confusing focus
          stop next to the trapped panel. Being a sibling of the panel — not its
          parent — also removes the need for a `stopPropagation` click handler
          on the panel itself. */}
      <button
        aria-hidden='true'
        className='absolute inset-0 bg-[rgba(8,17,31,.55)]'
        data-dismiss-overlay=''
        onClick={onClose}
        tabIndex={-1}
        type='button'
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal='true'
        className={cn(
          'relative z-(--z-dialog) flex max-h-[88vh] w-[min(520px,94vw)] flex-col overflow-y-auto rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-(--sh3)',
          className
        )}
        ref={containerRef}
        role='dialog'
      >
        {children}
      </div>
    </div>
  );
}
