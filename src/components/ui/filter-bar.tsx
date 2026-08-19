import {
  type FormEvent,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';

/** Presentational form shell; callers own field controls and validation. */

/**
 * 필드 그리드가 2열로 펴지는 지점과 같은 값이다(`min-[641px]:grid-cols-2`).
 * 한 화면에 두 개의 반응형 경계를 두지 않는다 — 필터가 접히는 폭과 필드가
 * 한 줄로 서는 폭이 어긋나면, 그 사이 구간에서 "펼쳤는데 여전히 1열"이라는
 * 어중간한 상태가 생긴다.
 */
const WIDE_QUERY = '(min-width: 641px)';

function subscribeToWide(onChange: () => void) {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => {
      // No matchMedia (jsdom): nothing to unsubscribe from.
    };
  }

  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * `matchMedia`가 없으면 **넓은 화면으로 친다.** jsdom 단위 테스트가 그
 * 경우인데, 여기서 `false`를 돌려주면 필드가 접힌 채 렌더되어 필터를 다루는
 * 모든 테스트가 화면에 없는 입력을 찾게 된다. 기능을 감추는 쪽보다 드러내는
 * 쪽이 안전한 기본값이다 — `theme.ts`가 `matchMedia` 부재 시 라이트로
 * 떨어지는 것과 같은 판단이다.
 */
function getIsWide() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return true;
  }

  return window.matchMedia(WIDE_QUERY).matches;
}

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
  const isWide = useSyncExternalStore(subscribeToWide, getIsWide, getIsWide);
  const [expandedOnNarrow, setExpandedOnNarrow] = useState(false);

  /**
   * 넓은 화면에는 토글 자체가 없다 — 데스크톱은 예전 그대로 항상 펼쳐진
   * 폼이다. 좁은 화면에서만 접힘이 기본값이 되고, 그때 편 상태는 사용자가
   * 소유한다. `isWide`가 열림을 강제하므로 폭을 오가도 방금 편 필터가
   * 닫히지 않는다.
   */
  const isOpen = isWide || expandedOnNarrow;

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
      {isWide ? null : (
        <Button
          aria-expanded={isOpen}
          className='w-fit'
          onClick={() => setExpandedOnNarrow((open) => !open)}
          size='sm'
          type='button'
          variant='secondary'
        >
          {isOpen ? '조건 접기' : '조건 바꾸기'}
        </Button>
      )}
      {isOpen ? (
        <>
          {/* `data-filter-grid`는 호출부가 열 구성을 덮어쓸 때 잡는 손잡이다.
              예전에는 `[&>div:first-child]`라는 위치 선택자로 잡았는데, 위에
              토글이 하나 끼는 순간 조용히 빗나간다. */}
          <div
            className='grid min-w-0 grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1181px]:grid-cols-3'
            data-filter-grid=''
          >
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
        </>
      ) : null}
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
        className='mb-1 block text-label font-semibold text-fg-soft'
        htmlFor={htmlFor}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p
          className='wrap-anywhere m-0 mt-1 text-body-sm text-[color:var(--danger)]'
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
    <span className='tnum inline-flex w-fit items-center gap-1.5 rounded-[var(--r-sm)] border border-[color:var(--info-line)] bg-[color:var(--info-soft)] px-2 py-0.5 text-body-sm font-semibold text-[color:var(--info)]'>
      적용 전 변경 있음
    </span>
  );
}
