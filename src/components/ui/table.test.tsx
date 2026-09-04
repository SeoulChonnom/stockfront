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

  // 회귀 A: shadcn 기본 `Table`은 자체 `overflow-x-auto` 컨테이너 div로
  // 감싼다. 이 레포는 그 스크롤 뷰포트를 `TableScrollWrapper`가 단독으로
  // 소유해야 하므로, `Table`은 맨 `<table>`만 렌더링해야 한다. 컨테이너가
  // 되살아나면 `TableScrollWrapper`의 측정이 항상 "스크롤 불가"로
  // 고정되어 키보드 접근성과 엣지 페이드가 죽는다.
  it('table 엘리먼트를 최상위로 렌더링하고 별도 스크롤 컨테이너로 감싸지 않는다', () => {
    render(<Table data-testid='table' />);

    const table = screen.getByTestId('table');
    expect(table.tagName).toBe('TABLE');
    expect(table.parentElement?.dataset.slot).not.toBe('table-container');
    expect(
      document.querySelector('[data-slot="table-container"]')
    ).not.toBeInTheDocument();
  });

  // 회귀 B: shadcn 기본 `TableCell`/`TableHead`에는 `whitespace-nowrap`이
  // 박혀 있어서, 호출부가 `tailwind-merge`로 줄바꿈을 되돌리려 해도 이기지
  // 못한다. 이 레포의 기본값에는 nowrap이 없어야 하며, nowrap이 필요한
  // 열은 호출부가 명시적으로 단다.
  it('TableCell/TableHead는 기본으로 whitespace-nowrap을 갖지 않는다', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead data-testid='head'>헤더</TableHead>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TableCell data-testid='cell'>셀</TableCell>
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByTestId('head')).not.toHaveClass('whitespace-nowrap');
    expect(screen.getByTestId('cell')).not.toHaveClass('whitespace-nowrap');
  });

  // 회귀 C: 선택 행은 `--primary-soft` 배경 + 좌측 `--primary` 바로,
  // 실패(danger) 톤 행은 좌측 `--danger` 바로 표시되어야 한다. 선택된
  // 행에서는 danger 바가 primary 바에 가려야 한다(원본의
  // `!selected && tone === 'danger'`와 동일한 우선순위).
  describe('TableRow', () => {
    it('data-state="selected"에 primary 배경/좌측 바 클래스를 적용한다', () => {
      render(
        <table>
          <tbody>
            <TableRow data-state='selected' data-testid='row' />
          </tbody>
        </table>
      );

      expect(screen.getByTestId('row')).toHaveClass(
        'data-[state=selected]:bg-[color:var(--primary-soft)]',
        'data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)]'
      );
    });

    it('data-tone="danger"에 좌측 danger 바 클래스를 적용한다', () => {
      render(
        <table>
          <tbody>
            <TableRow data-testid='row' data-tone='danger' />
          </tbody>
        </table>
      );

      expect(screen.getByTestId('row')).toHaveClass(
        'not-data-[state=selected]:data-[tone=danger]:shadow-[inset_3px_0_0_var(--danger)]'
      );
    });
  });
});
