import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootErrorBoundary } from './root-error-boundary';

function ThrowingChild(): never {
  throw new Error('render failed');
}

describe('RootErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an accessible recovery fallback when a child throws during render', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <RootErrorBoundary>
        <ThrowingChild />
      </RootErrorBoundary>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '페이지를 표시할 수 없습니다'
    );
    expect(
      screen.getByRole('button', { name: '다시 시도' })
    ).toBeInTheDocument();
  });

  it('retries rendering its children after the recovery action', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let shouldThrow = true;

    function FlakyChild() {
      if (shouldThrow) {
        throw new Error('render failed');
      }

      return <p>복구된 화면</p>;
    }

    render(
      <RootErrorBoundary>
        <FlakyChild />
      </RootErrorBoundary>
    );

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(screen.getByText('복구된 화면')).toBeInTheDocument();
  });
});
