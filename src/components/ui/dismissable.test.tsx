import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Dialog } from './dialog';
import { Drawer } from './drawer';

/**
 * Behaviour-level tests for the shared focus-trap/Escape/overlay-click/
 * return-focus contract (README §5 Drawer, §7-7 Dialog, §15). Both
 * components share `useDismissable`, so the same scenarios are asserted for
 * each rather than testing the hook in isolation.
 */

function DrawerHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)} type='button'>
        메뉴 열기
      </button>
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <a href='/first'>첫 링크</a>
        <a href='/second'>둘째 링크</a>
      </Drawer>
    </div>
  );
}

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)} type='button'>
        실행 열기
      </button>
      <Dialog
        isOpen={isOpen}
        labelledBy='dialog-title'
        onClose={() => setIsOpen(false)}
      >
        <h2 id='dialog-title'>실행</h2>
        <button type='button'>취소</button>
        <button type='button'>실행</button>
      </Dialog>
    </div>
  );
}

describe.each([
  ['Drawer', DrawerHarness, '메뉴 열기', '첫 링크', '둘째 링크'],
  ['Dialog', DialogHarness, '실행 열기', '취소', '실행'],
] as const)(
  '%s dismissable contract',
  (_name, Harness, triggerName, firstName, lastName) => {
    it('focuses the first focusable element on open', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: triggerName }));

      expect(
        screen.getByRole(firstName.includes('링크') ? 'link' : 'button', {
          name: firstName,
        })
      ).toHaveFocus();
    });

    it('Tab cycles forward from the last focusable element back to the first', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: triggerName }));
      const last = screen.getByRole(
        lastName.includes('링크') ? 'link' : 'button',
        {
          name: lastName,
        }
      );
      last.focus();

      await user.tab();

      expect(
        screen.getByRole(firstName.includes('링크') ? 'link' : 'button', {
          name: firstName,
        })
      ).toHaveFocus();
    });

    it('Shift+Tab cycles backward from the first focusable element to the last', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: triggerName }));

      await user.tab({ shift: true });

      expect(
        screen.getByRole(lastName.includes('링크') ? 'link' : 'button', {
          name: lastName,
        })
      ).toHaveFocus();
    });

    it('Escape closes and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      const trigger = screen.getByRole('button', { name: triggerName });
      await user.click(trigger);
      expect(
        screen.getByRole(firstName.includes('링크') ? 'link' : 'button', {
          name: firstName,
        })
      ).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(
        screen.queryByRole(firstName.includes('링크') ? 'link' : 'button', {
          name: firstName,
        })
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('overlay click closes and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      const { container } = render(<Harness />);

      const trigger = screen.getByRole('button', { name: triggerName });
      await user.click(trigger);

      const overlay = container.querySelector('[data-dismiss-overlay]');
      expect(overlay).toBeTruthy();
      if (overlay) {
        await user.click(overlay);
      }

      expect(
        screen.queryByRole(firstName.includes('링크') ? 'link' : 'button', {
          name: firstName,
        })
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('does not leak document.body scroll lock after closing', async () => {
      const user = userEvent.setup();
      render(<Harness />);

      await user.click(screen.getByRole('button', { name: triggerName }));
      expect(document.body.style.overflow).toBe('hidden');

      await user.keyboard('{Escape}');

      expect(document.body.style.overflow).not.toBe('hidden');
    });
  }
);
