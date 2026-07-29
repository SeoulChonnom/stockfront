import { type ReactNode, type RefObject, useId } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
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
    <div
      className='fixed inset-0 z-(--z-dialog-overlay) flex items-center justify-center bg-[rgba(8,17,31,.55)] p-4'
      onClick={onClose}
    >
      <div
        aria-labelledby={labelledBy}
        aria-modal='true'
        className={cn(
          'z-(--z-dialog) flex max-h-[88vh] w-[min(520px,94vw)] flex-col overflow-y-auto rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-(--sh3)',
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

export type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmLoading?: boolean;
};

/** Generic yes/no confirmation built on `Dialog`. Not the Trigger dialog — see file comment above. */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger,
  confirmLoading,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Dialog isOpen={isOpen} labelledBy={titleId} onClose={onClose}>
      <h2
        className='m-0 mb-2 text-[17px] font-semibold text-[color:var(--text)]'
        id={titleId}
      >
        {title}
      </h2>
      {description ? (
        <p className='wrap-anywhere m-0 mb-4 text-[13.5px] text-[color:var(--text-soft)]'>
          {description}
        </p>
      ) : null}
      <div className='mt-2 flex justify-end gap-2'>
        <Button onClick={onClose} type='button' variant='ghost'>
          {cancelLabel}
        </Button>
        <Button
          loading={confirmLoading}
          onClick={onConfirm}
          type='button'
          variant={danger ? 'danger' : 'primary'}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
