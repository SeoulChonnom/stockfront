import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useDismissable } from './use-dismissable';

/** Drawer primitive; it must not mutate history or URL when opened/closed. */

export type DrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  className?: string;
};

export function Drawer({
  isOpen,
  onClose,
  children,
  labelledBy,
  className,
}: DrawerProps) {
  const { containerRef } = useDismissable<HTMLDivElement>({
    isOpen,
    onDismiss: onClose,
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className='fixed inset-0 z-(--z-drawer-overlay)'>
      {/* Real button keeps overlay dismissal keyboard-operable. */}
      <button
        aria-hidden='true'
        className='absolute inset-0 animate-[overlay-fade-in_160ms_var(--ease)] bg-[rgba(8,17,31,.55)]'
        data-dismiss-overlay=''
        onClick={onClose}
        tabIndex={-1}
        type='button'
      />
      <div
        aria-labelledby={labelledBy}
        aria-modal='true'
        className={cn(
          'fixed inset-y-0 left-0 z-(--z-drawer) flex w-[min(84vw,300px)] flex-col overflow-y-auto bg-[color:var(--surface)] shadow-(--sh3) [overscroll-behavior:contain]',
          'animate-[drawer-slide-in_200ms_var(--ease)]',
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
