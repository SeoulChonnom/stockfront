import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogBox } from './log-box';

describe('LogBox', () => {
  it('does not render a toggle for short content', () => {
    render(<LogBox content='short log line' />);
    expect(
      screen.queryByRole('button', { name: /전체 .*자 보기/ })
    ).not.toBeInTheDocument();
  });

  it('renders a "전체 N,NNN자 보기" toggle with aria-expanded=false for long content, then true after clicking', async () => {
    const user = userEvent.setup();
    const content = 'x'.repeat(4079);
    render(<LogBox content={content} />);

    const toggle = screen.getByRole('button', {
      name: '전체 4,079자 보기',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('truncates by default and shows the full content is not yet present', () => {
    const content = 'y'.repeat(4079);
    render(<LogBox content={content} />);

    expect(screen.queryByText(content)).not.toBeInTheDocument();
  });

  it('never overflows horizontally: pre has pre-wrap + anywhere wrapping classes', () => {
    const content = 'a'.repeat(4000);
    const { container } = render(<LogBox content={content} />);
    const pre = container.querySelector('pre');

    expect(pre).toHaveClass('whitespace-pre-wrap');
    expect(pre?.className).toContain('overflow-wrap:anywhere');
  });

  describe('복사', () => {
    const originalClipboard = navigator.clipboard as Clipboard | undefined;

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    });

    it('shows a "복사했습니다" confirmation after a successful copy, without throwing', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });

      render(<LogBox content='copy me' />);

      const copyButton = screen.getByRole('button', { name: '복사' });
      await user.click(copyButton);

      expect(writeText).toHaveBeenCalledWith('copy me');
      expect(
        await screen.findByRole('button', { name: '복사했습니다' })
      ).toBeInTheDocument();
    });
  });
});
