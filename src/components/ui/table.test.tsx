import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

describe('Table', () => {
  it('applies basic shadcn table classes', () => {
    render(
      <Table data-testid='table'>
        <TableHeader>
          <TableRow>
            <TableHead data-testid='head'>헤더</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell data-testid='cell'>셀</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    expect(screen.getByTestId('table')).toHaveClass(
      'w-full',
      'caption-bottom',
      'text-sm'
    );
    expect(screen.getByTestId('head')).toHaveClass('h-10', 'px-2', 'text-left');
    expect(screen.getByTestId('cell')).toHaveClass('p-2', 'align-middle');
  });
});
