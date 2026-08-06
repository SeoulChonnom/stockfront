import type { FormEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

/**
 * FilterBar — README §7-4 (Archive Search) + §7-6 (Batch Operations 필터).
 * Presentational only: grid + apply/reset actions. Field rendering (Input/
 * Select + error text) stays with the caller, wired through
 * `useFilterDraft`'s `getFieldProps(name)` — this keeps FilterBar generic
 * enough for both Archive Search and Batch Operations to compose with their
 * own field sets. Archive's 3-column grid becomes 2 columns at 1180px and
 * 1 column at 640px (§6). Inputs must be given `min-h-11` (44px) by the
 * caller via `getFieldProps`+Input/Select, consistent with the touch-target
 * rule.
 */

export type FilterBarProps = {
  onSubmit: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  /** e.g. `적용됨 · 2026-07-13 ~ 2026-07-27 · 전체 상태` + optional dirty badge — rendered above the field grid. */
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

/** Label + control + (optional) 12px danger error text, wired via `aria-describedby` from `getFieldProps`. */
export function FilterField({
  label,
  htmlFor,
  error,
  children,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {/* 참조의 필터 라벨은 두 화면 모두 동일하게
          `font-size:12px;font-weight:600;color:var(--fg2)`이며 uppercase도
          letter-spacing도 없다 — archive-search 480/485/490행, ops-batches
          743/748/753/758행. 여기가 11px + `tracking-[.07em]` + uppercase +
          `--text-faint`로 되어 있어서 라벨 높이가 17.6px(11×1.6)로 잡혔고,
          참조의 19.2px(12×1.6)보다 1.6px 낮았다. 그 1.6px이 라벨 행 수만큼
          누적돼(desktop 1행 → -1.6px, tablet 2행 → -3.2px) 조회 조건 카드
          아래 모든 블록의 y를 밀고 있었다. `--fg2`는 이 앱의 `--text-soft`
          (#4a6180 = rgb(74,97,128))에 대응한다 — 감사가 기대값으로 리포트하는
          값과 정확히 같다. 라벨-입력 간격(margin-bottom)은 화면마다 다르므로
          (batch는 `[&_label]:mb-[5px]`로 override) 여기서 건드리지 않는다. */}
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

/** README §7-4 "적용 전 변경 있음" info 배지 — 캐스팅 없이 `isDirty`를 그대로 넘긴다. */
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
