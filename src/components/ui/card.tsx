import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * Card — README §6/§12: 반투명 surface와 그림자를 제거하고 solid
 * `--surface` + 1px `--line` border + 12px radius(`--r-lg`)만 쓴다("카드에는
 * 그림자를 쓰지 않고 1px border만 쓴다").
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)]',
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
