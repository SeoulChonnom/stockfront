import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Tailwind v4 compiles `scale-*` to the independent `scale` property. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border font-semibold transition-[scale,background-color,border-color,color] duration-(--dur-fast) ease-(--ease) active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-fg)] hover:border-[color:color-mix(in_srgb,var(--primary)_86%,var(--text))] hover:bg-[color:color-mix(in_srgb,var(--primary)_86%,var(--text))]',
        secondary:
          'border-[color:var(--line-strong)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] text-fg hover:bg-[color:var(--surface-2)]',
        ghost:
          'border-line bg-transparent text-fg-soft hover:bg-[color:var(--surface-2)] hover:text-fg',
        danger:
          'border-[color:var(--danger-line)] bg-[color:var(--danger-soft)] text-[color:var(--danger)] hover:border-[color:var(--danger)]',
      },
      size: {
        default: 'min-h-tap px-[18px] text-body',
        sm: 'min-h-tap px-3.5 text-body-sm',
        lg: 'min-h-12 px-[18px] text-body',
        icon: 'size-tap',
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
