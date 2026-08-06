import { type RefObject, useEffect, useRef } from 'react';

/**
 * Shared focus-trap/Escape/scroll-lock/return-focus behaviour for Drawer and
 * Dialog (README §5 Drawer, §7-7 Manual Trigger dialog, §15 Accessibility).
 *
 * Contract (identical for both consumers, per the handoff doc):
 * - Tab / Shift+Tab cycle within the container only.
 * - Escape calls `onDismiss`.
 * - Focus moves to `initialFocusRef` (if given) or the first focusable
 *   element inside the container when it opens.
 * - Focus returns to whatever had focus before the container opened, once
 *   it closes (covers both `onDismiss` closes and unmount).
 * - Body scroll is locked while open and restored — never left leaked as
 *   `overflow: hidden` — on close.
 *
 * Overlay-click-to-close and history/URL neutrality are the caller's
 * responsibility (they differ slightly between Drawer and Dialog markup),
 * this hook only owns the keyboard/focus/scroll contract that's identical
 * for both.
 */

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
