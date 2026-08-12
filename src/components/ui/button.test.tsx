import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('keeps the small size at the 44px touch minimum', () => {
    render(
      <Button size='sm' type='button'>
        이슈 상세
      </Button>
    );

    expect(screen.getByRole('button')).toHaveClass('min-h-tap');
  });

  it('keeps the default size at the 44px touch minimum', () => {
    render(<Button type='button'>실행</Button>);

    expect(screen.getByRole('button')).toHaveClass('min-h-tap');
  });
});
