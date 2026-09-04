import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AsyncButton } from '@/components/domain/async-button';

describe('AsyncButton', () => {
  it('marks the button busy and disabled while loading, and hides the spinner from a11y tree', () => {
    render(
      <AsyncButton loading type='button'>
        실행
      </AsyncButton>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    const spinner = button.querySelector('svg');
    expect(spinner).toHaveAttribute('aria-hidden', 'true');
    expect(spinner).not.toHaveAttribute('role');
    expect(spinner).not.toHaveAttribute('aria-label');
  });

  it('leaves aria-busy, disabled, and the spinner out when not loading', () => {
    render(<AsyncButton type='button'>실행</AsyncButton>);

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button).not.toBeDisabled();
    expect(button.querySelector('svg')).toBeNull();
  });
});
