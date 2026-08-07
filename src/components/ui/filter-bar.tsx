import type { FormEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

/** Presentational form shell; callers own field controls and validation. */

export type FilterBarProps = {
  onSubmit: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FilterBar({
  onSubmit,
  onReset,
  applyLabel = '필터 적용',
  resetLabel = '초기화',
  summary,
  children,
  className,
}: FilterBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className={cn('flex flex-col gap-3', className)}
      onSubmit={handleSubmit}
    >
      {summary}
      <div className='grid min-w-0 grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1181px]:grid-cols-3'>
        {children}
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button size='default' type='submit'>
          {applyLabel}
        </Button>
        <Button onClick={onReset} type='button' variant='secondary'>
          {resetLabel}
        </Button>
      </div>
    </form>
  );
}

export type FilterFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FilterField({
  label,
  htmlFor,
  error,
  children,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <label
        className='mb-1 block text-[12px] font-semibold text-[color:var(--text-soft)]'
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          className='wrap-anywhere m-0 mt-1 text-[12px] text-[color:var(--danger)]'
          id={`${htmlFor}-error`}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FilterDirtyBadge({ isDirty }: { isDirty: boolean }) {
  if (!isDirty) {
    return null;
  }

  return (
    <span className='mono inline-flex w-fit items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--info-line)] bg-[color:var(--info-soft)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--info)]'>
      적용 전 변경 있음
    </span>
  );
}
