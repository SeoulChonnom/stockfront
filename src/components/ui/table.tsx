import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

/**
 * Table — README §11/§12: 표는 `min-width` + 래퍼 `overflow-x:auto`로
 * scoped scroll만 허용한다(문서 전체 가로 스크롤은 금지). 컬럼이
 * 접히는 폭에서는 `display:none`으로 값을 완전히 버리는 대신 우선순위
 * 셀의 보조 줄로 노출해야 한다(§11 "같은 값을 우선순위 행의 보조 줄로
 * 노출한다. display:none으로 정보를 버리지 않는다") — `TableCollapsibleCell`/
 * `TablePriorityCell`이 그 계약을 구현한다.
 */

export function TableScrollWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>{children}</div>
  );
}

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** 표가 접히기 시작하는 최소 폭. 항상 `TableScrollWrapper`와 함께 써야 문서 스크롤이 새지 않는다. */
  minWidth?: number | string;
}

export function Table({ className, minWidth, style, ...props }: TableProps) {
  return (
    <table
      // 13px, no explicit leading — inherits the content root's 1.6
      // line-height (parity cycle A4/A10: 13px/1.6 → 20.8px, matching the
      // design). Tailwind's `text-sm` was 14px/20px (fixed 1.43 leading),
      // not the design's 13px/20.8px.
      className={cn('w-full caption-bottom text-[13px]', className)}
      style={{ ...style, minWidth }}
      {...props}
    />
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        '[&_tr]:border-b [&_tr]:border-[color:var(--line)]',
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** 선택된 행 — README §7-6 "선택 = background:--primary-soft + inset 3px 0 0 --primary". */
  selected?: boolean;
  /** FAILED 등 강조가 필요한 행 — "inset 3px 0 0 --danger". `selected`가 우선한다. */
  tone?: 'danger';
}

export function TableRow({
  className,
  selected,
  tone,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={cn(
        'min-w-0 border-b border-[color:var(--line)] hover:bg-[color:var(--surface-2)]',
        selected &&
          'bg-[color:var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)] hover:bg-[color:var(--primary-soft)]',
        !selected &&
          tone === 'danger' &&
          'shadow-[inset_3px_0_0_var(--danger)]',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-12 px-0 text-left align-middle text-[0.74rem] uppercase tracking-[0.16em] text-[color:var(--text-faint)] font-semibold',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('min-w-0 px-0 py-[18px] align-middle', className)}
      {...props}
    />
  );
}
