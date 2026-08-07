import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TableCell, TableHead } from './table';

describe('Table cell padding variants', () => {
  it('applies compact padding to heads and cells while preserving caller overrides', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead data-testid='head' padding='compact'>
              헤더
            </TableHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TableCell className='px-4' data-testid='cell' padding='compact'>
              셀
            </TableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByTestId('head')).toHaveClass('px-3', 'py-[9px]');
    expect(screen.getByTestId('cell')).toHaveClass('px-4', 'py-[9px]');
    expect(screen.getByTestId('cell')).not.toHaveClass('px-3');
  });
});
