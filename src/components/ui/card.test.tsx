import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from '@/components/ui/card';

describe('Card', () => {
  it('applies basic shadcn card classes', () => {
    render(
      <Card data-testid='card' className='px-[18px] py-4'>
        내용
      </Card>
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass(
      'rounded-xl',
      'border',
      'bg-card',
      'text-card-foreground'
    );
    expect(card).toHaveClass('px-[18px]', 'py-4');
  });
});
