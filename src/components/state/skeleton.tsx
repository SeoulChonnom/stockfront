import type { CSSProperties } from 'react';

import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** Layout-preserving, aria-hidden placeholders; the parent owns aria-busy. */

const SHIMMER_CLASSES =
  'animate-[skeleton-shimmer_var(--dur-shimmer)_linear_infinite] rounded-[var(--r-md)] bg-[color:var(--surface-3)] bg-[length:200%_100%] [background-image:linear-gradient(100deg,var(--surface-3)_30%,var(--surface-2)_50%,var(--surface-3)_70%)]';

export type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden='true'
      className={cn(SHIMMER_CLASSES, className)}
      style={style}
    />
  );
}

export type SkeletonTextProps = {
  lines?: number;
  className?: string;
  lineClassName?: string;
};

export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: SkeletonTextProps) {
  return (
    <div aria-hidden='true' className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, index) => {
        const isLast = index === lines - 1;
        return (
          <Skeleton
            className={cn('h-3.5', isLast ? 'w-2/3' : 'w-full', lineClassName)}
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder, never reordered
            key={index}
          />
        );
      })}
    </div>
  );
}

export type SkeletonTableRowsProps = {
  rows: number;
  cols: number;
  className?: string;
};

export function SkeletonTableRows({
  rows,
  cols,
  className,
}: SkeletonTableRowsProps) {
  return (
    <Table aria-hidden='true' className={className}>
      <TableBody>
        {/* A fixed rows×cols placeholder grid — no identity, no state, never reordered. */}
        {Array.from({ length: rows }, (_, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder, never reordered
          <TableRow key={rowIndex}>
            {Array.from({ length: cols }, (_, colIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length placeholder, never reordered
              <TableCell key={colIndex}>
                <Skeleton className='h-4 w-full' />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
