import type { ReactNode, RefObject } from 'react';

import { cn } from '@/lib/utils';

import { useDismissable } from './use-dismissable';

/** Modal primitive; focus and scroll behavior come from useDismissable. */

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
      {/* A real button keeps overlay-click-to-close keyboard-operable. */}
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
