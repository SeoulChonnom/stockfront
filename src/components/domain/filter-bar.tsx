import { type FormEvent, type ReactNode, useState } from 'react';
import { ToneBadge } from '@/components/domain/tone-badge';
import { useIsWide } from '@/components/domain/use-is-wide';
import { Button } from '@/components/ui/button';
import { FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/** Presentational form shell; callers own field controls and validation. */

export type FilterBarProps = {
  onSubmit: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  summary?: ReactNode;
  /** 필드 그리드 바로 위, 전체 폭으로 렌더된다(예: 기간 프리셋 버튼 줄). */
  beforeFields?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FilterBar({
  onSubmit,
  onReset,
  applyLabel = '필터 적용',
  resetLabel = '초기화',
  summary,
  beforeFields,
  children,
  className,
}: FilterBarProps) {
  const isWide = useIsWide();
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
          className='tap-control w-fit'
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
          {beforeFields}
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
            <Button className='tap-control' size='default' type='submit'>
              {applyLabel}
            </Button>
            <Button
              className='tap-control'
              onClick={onReset}
              type='button'
              variant='secondary'
            >
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
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FilterField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: FilterFieldProps) {
  /**
   * `FieldLabel`/`FieldError`만 쓴다 — 전체 `Field`(role="group" wrapper,
   * flex-col gap-3 등)를 씌우면 이 컴포넌트가 지금까지 갖지 않던 레이아웃과
   * 시맨틱스가 끼어든다. `getFieldProps`(`use-filter-draft.ts`)가 이미
   * `aria-describedby`를 `${name}-error`로 스스로 배선해 두므로, 여기서는
   * 그 값과 일치하는 `id`를 `FieldError`에 그대로 넘기기만 하면 된다 —
   * `FieldError`는 id를 스스로 만들지 않고 전달받은 값을 쓴다.
   *
   * `hint`는 `getFieldProps`가 모르는 값이라 자동으로 배선되지 않는다 —
   * 힌트를 쓰는 호출부가 `{...getFieldProps(name)}` 뒤에 명시적
   * `aria-describedby`를 덧붙여 `${htmlFor}-hint`를 연결해야 한다.
   */
  return (
    // `[&_[data-slot=native-select-wrapper]]:w-full`: `NativeSelect`
    // 내부 래퍼 div는 `w-fit`가 하드코딩돼 있고 `className` prop을 받지
    // 않는다(안쪽 `<select>`에만 적용된다) — 그래서 그리드 셀을 채우던
    // 이전 원시 `<select>`의 `w-full` 폭을 밖에서 이 데이터 훅으로
    // 대신 강제한다. `select`가 아닌 자식(Input 등)에는 이 선택자가
    // 매치되지 않으므로 부작용이 없다.
    <div
      className={cn(
        'min-w-0 [&_[data-slot=native-select-wrapper]]:w-full',
        className
      )}
    >
      <FieldLabel
        className='mb-1 block w-full text-label font-semibold text-fg-soft'
        htmlFor={htmlFor}
      >
        {label}
      </FieldLabel>
      {children}
      {hint ? (
        <p
          className='wrap-anywhere m-0 mt-1 text-label text-faint'
          id={`${htmlFor}-hint`}
        >
          {hint}
        </p>
      ) : null}
      {error ? (
        <FieldError
          className='wrap-anywhere m-0 mt-1 text-body-sm text-danger'
          id={`${htmlFor}-error`}
        >
          {error}
        </FieldError>
      ) : null}
    </div>
  );
}

export function FilterDirtyBadge({ isDirty }: { isDirty: boolean }) {
  if (!isDirty) {
    return null;
  }

  return (
    <ToneBadge className='tnum' size='compact' tone='info'>
      적용 전 변경 있음
    </ToneBadge>
  );
}
