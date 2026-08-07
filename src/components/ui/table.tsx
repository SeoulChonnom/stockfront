import { cva, type VariantProps } from 'class-variance-authority';
import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

const tableCellPaddingVariants = cva('', {
  variants: {
    padding: {
      compact: 'py-[9px] px-3',
    },
  },
});

type TableCellPaddingProps = VariantProps<typeof tableCellPaddingVariants>;

/** Tables keep a minimum width inside a scoped horizontal-scroll wrapper. */

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
  minWidth?: number | string;
}

export function Table({ className, minWidth, style, ...props }: TableProps) {
  return (
    <table
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
  return <thead className={className} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
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
        'min-w-0 hover:bg-[color:var(--surface-2)]',
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

export interface TableHeadProps
  extends ThHTMLAttributes<HTMLTableCellElement>,
    TableCellPaddingProps {}

export function TableHead({ className, padding, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        'h-12 border-b border-line px-0 text-left align-middle text-label uppercase tracking-[0.06em] text-faint font-semibold',
        tableCellPaddingVariants({ padding }),
        className
      )}
      {...props}
    />
  );
}

export interface TableCellProps
  extends TdHTMLAttributes<HTMLTableCellElement>,
    TableCellPaddingProps {}

export function TableCell({ className, padding, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        'min-w-0 border-b border-line px-0 py-[18px] align-middle',
        tableCellPaddingVariants({ padding }),
        className
      )}
      {...props}
    />
  );
}
