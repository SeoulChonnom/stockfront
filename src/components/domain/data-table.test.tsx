import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/domain/data-table';

describe('data-table', () => {
  it('TableHead/TableCell 기본값은 whitespace-normal이다', () => {
    render(
      <Table>
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

    expect(screen.getByTestId('head')).toHaveClass('whitespace-normal');
    expect(screen.getByTestId('cell')).toHaveClass('whitespace-normal');
  });

  it('호출부가 whitespace-nowrap을 주면 기본 whitespace-normal을 이긴다', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className='whitespace-nowrap' data-testid='cell'>
              셀
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );

    const cell = screen.getByTestId('cell');
    expect(cell).toHaveClass('whitespace-nowrap');
    expect(cell).not.toHaveClass('whitespace-normal');
  });
});
