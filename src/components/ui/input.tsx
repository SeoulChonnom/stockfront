import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Input({
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3.5 py-2 text-[color:var(--text)] outline-none transition-all placeholder:text-[color:var(--text-faint)] focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      type={type}
      {...props}
    />
  );
}
