import { type RefObject, useEffect, useRef } from 'react';

/** Shared focus trap, Escape dismissal, scroll lock/restore, and return-focus for modal primitives. */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  );
}

export type UseDismissableOptions = {
  isOpen: boolean;
  onDismiss: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  lockScroll?: boolean;
};

export function useDismissable<T extends HTMLElement>({
  isOpen,
  onDismiss,
  initialFocusRef,
  lockScroll = true,
}: UseDismissableOptions) {
  const containerRef = useRef<T>(null);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = containerRef.current;
    const triggerElement = document.activeElement as HTMLElement | null;

    if (!container) {
      return;
    }
    const activeContainer = container;

    function focusInitialTarget() {
      const initialTarget =
        (initialFocusRef?.current &&
        activeContainer.contains(initialFocusRef.current)
          ? initialFocusRef.current
          : undefined) ??
        getFocusableElements(activeContainer)[0] ??
        activeContainer;
      initialTarget.focus();
    }

    focusInitialTarget();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismissRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements(activeContainer);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!activeContainer.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    const observer =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(() => {
            const active = document.activeElement;
            if (!active || !activeContainer.contains(active)) {
              focusInitialTarget();
            }
          });
    observer?.observe(activeContainer, { childList: true, subtree: true });

    const previousOverflow = document.body.style.overflow;
    if (lockScroll) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      observer?.disconnect();
      if (lockScroll) {
        document.body.style.overflow = previousOverflow;
      }
      triggerElement?.focus();
    };
  }, [isOpen, initialFocusRef, lockScroll]);

  return { containerRef };
}
