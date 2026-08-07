import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 유효하지 않은 값. `aria-invalid`를 설정하고 danger 톤 border로 표시한다. */
  invalid?: boolean;
}

export function Input({
  className,
  type,
  invalid,
  'aria-invalid': ariaInvalidProp,
  ...props
}: InputProps) {
  return (
    <input
      aria-invalid={ariaInvalidProp ?? invalid ?? undefined}
      className={cn(
        'flex min-h-11 w-full rounded-[14px] border border-line bg-[color:var(--surface-2)] px-3.5 py-2 text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50',
        invalid &&
          'border-[color:var(--danger-line)] focus:border-[color:var(--danger)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_16%,transparent)]',
        className
      )}
      type={type}
      {...props}
    />
  );
}
