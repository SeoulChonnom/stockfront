import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-[var(--r-lg)] border border-line bg-[color:var(--surface)]',
  {
    variants: {
      padding: {
        inset: 'px-[18px] py-4',
      },
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, padding, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ padding }), className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
