import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('uses small size class', () => {
    render(
      <Button size='sm' type='button'>
        이슈 상세
      </Button>
    );

    expect(screen.getByRole('button')).toHaveClass('h-8');
  });

  it('uses default size class', () => {
    render(<Button type='button'>실행</Button>);

    expect(screen.getByRole('button')).toHaveClass('h-9');
  });
});
