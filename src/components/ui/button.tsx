import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] border font-bold transition-all disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-transparent text-white shadow-[0_16px_30px_color-mix(in_srgb,var(--primary)_24%,transparent)] bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] hover:-translate-y-px',
        secondary:
          'border-[color:var(--line-strong)] bg-[color:color-mix(in_srgb,var(--surface-strong)_92%,transparent)] text-[color:var(--text)] hover:-translate-y-px',
        ghost:
          'border-[color:var(--line)] bg-transparent text-[color:var(--text-soft)] hover:-translate-y-px',
      },
      size: {
        default: 'min-h-11 px-4',
        sm: 'min-h-10 px-3.5 text-sm',
        lg: 'min-h-12 px-5',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
