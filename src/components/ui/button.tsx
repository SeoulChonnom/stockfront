import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border font-semibold transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:-translate-y-px',
        secondary:
          'border-[color:var(--line-strong)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] text-fg hover:-translate-y-px',
        ghost: 'border-line bg-transparent text-fg-soft hover:-translate-y-px',
        danger:
          'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)] hover:-translate-y-px',
      },
      size: {
        default: 'min-h-11 px-[18px] text-[13.5px]',
        sm: 'min-h-10 px-3.5 text-[12.5px]',
        lg: 'min-h-12 px-[18px] text-[13.5px]',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  // Slot requires one child; keep the spinner on the plain button path only.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? (
        <Loader2 aria-hidden='true' className='size-4 animate-spin' />
      ) : null}
      {children}
    </>
  );

  return (
    <Comp
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </Comp>
  );
}
