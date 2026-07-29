import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { useDismissable } from './use-dismissable';

/**
 * Drawer — README §5 (mobile nav drawer) + §15. `role="dialog"
 * aria-modal="true"`, slides from the left, `width: min(84vw, 300px)`,
 * `--sh3`, `overscroll-behavior: contain`. Focus trap / Escape / overlay
 * click / body scroll lock / return-focus-to-trigger come from the shared
 * `useDismissable` hook (identical contract to Dialog).
 *
 * Must not touch history/URL — this component never calls `navigate`, so
 * browser Back is never intercepted by opening/closing it (§5).
 */

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
    <div
      className='fixed inset-0 z-(--z-drawer-overlay) bg-[rgba(8,17,31,.55)]'
      onClick={onClose}
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal='true'
        className={cn(
          'fixed inset-y-0 left-0 z-(--z-drawer) flex w-[min(84vw,300px)] flex-col overflow-y-auto bg-[color:var(--surface)] shadow-(--sh3) [overscroll-behavior:contain]',
          'animate-[drawer-slide-in_200ms_var(--ease)]',
          className
        )}
        onClick={(event) => event.stopPropagation()}
        ref={containerRef}
        role='dialog'
      >
        {children}
      </div>
    </div>
  );
}
