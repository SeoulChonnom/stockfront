import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './card';

describe('Card', () => {
  it('exposes the inset padding variant and lets caller classes override it', () => {
    const { rerender } = render(
      <Card data-testid='card' padding='inset'>
        내용
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('px-[18px]', 'py-4');

    rerender(
      <Card className='px-4' data-testid='card' padding='inset'>
        내용
      </Card>
    );

    expect(card).toHaveClass('px-4', 'py-4');
    expect(card).not.toHaveClass('px-[18px]');
  });
});
