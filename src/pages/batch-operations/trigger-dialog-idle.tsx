import { ChevronDown, ChevronUp } from 'lucide-react';
import { type ComponentType, type Ref, type RefObject, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * README §7-7 "idle" form. Advanced options (`force`/`rebuildPageOnly`) are
 * gated by `canUseAdvancedOptions` (`can('ops.advancedTriggerOptions')`,
 * README §10/§14 D-11) — the whole toggle+box is omitted, not merely
 * disabled, when the capability is false.
 */

/**
 * `Input` (`src/components/ui/input.tsx`, shared/off-limits for this phase)
 * is a plain function component whose destructure spreads every prop it
 * doesn't explicitly name straight onto the underlying `<input>` — so a
 * `ref` prop DOES flow through to the real DOM node at runtime (React 19
 * passes `ref` through function components like any other prop, no
 * `forwardRef` required). `InputProps`, though, was never updated to
 * *declare* `ref` in its type, so TS rejects `<Input ref={...} />` even
 * though it works. This local, ref-aware alias documents that gap instead
 * of silently `as any`-ing the call site.
 */
const RefInput = Input as ComponentType<
  InputProps & { ref?: Ref<HTMLInputElement> }
>;

export type TriggerFormValues = {
  businessDate: string;
  force: boolean;
  rebuildPageOnly: boolean;
};

export function TriggerIdleForm({
  values,
  onChange,
  dateInputRef,
  dateFieldInvalid,
  canUseAdvancedOptions,
  onCancel,
  onSubmit,
}: {
  values: TriggerFormValues;
  onChange: (next: TriggerFormValues) => void;
  dateInputRef: RefObject<HTMLInputElement | null>;
  dateFieldInvalid: boolean;
  canUseAdvancedOptions: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <form
      className='flex flex-col gap-4'
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className='wrap-anywhere m-0 text-[13.5px] text-[color:var(--text-soft)]'>
        기준일 하루치 뉴스·지수를 다시 수집하고 통합 페이지 스냅샷을 생성합니다.
        같은 기준일 작업이 실행 중이면 요청은 거부됩니다.
      </p>

      <div>
        <label
          className='mb-1 block text-[11px] font-semibold tracking-[0.07em] text-[color:var(--text-faint)] uppercase'
          htmlFor='trigger-date'
        >
          기준일 (KST)
        </label>
        <RefInput
          aria-describedby={dateFieldInvalid ? 'trigger-date-error' : undefined}
          className={cn(
            'mono min-h-11 rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-[14px]',
            !dateFieldInvalid && 'border-[color:var(--line-strong)]'
          )}
          id='trigger-date'
          invalid={dateFieldInvalid}
          onChange={(event) =>
            onChange({ ...values, businessDate: event.target.value })
          }
          ref={dateInputRef}
          required
          type='date'
          value={values.businessDate}
        />
        {dateFieldInvalid ? (
          <p
            className='wrap-anywhere m-0 mt-1 text-[12px] text-[color:var(--danger)]'
            id='trigger-date-error'
          >
            미래 날짜는 실행할 수 없습니다.
          </p>
        ) : null}
      </div>

      {canUseAdvancedOptions ? (
        <AdvancedOptions
          expanded={advancedOpen}
          onToggle={() => setAdvancedOpen((current) => !current)}
          onChange={onChange}
          values={values}
        />
      ) : null}

      <div className='flex justify-end gap-2 pt-1'>
        <Button onClick={onCancel} type='button' variant='ghost'>
          취소
        </Button>
        <Button className='min-h-11' type='submit' variant='primary'>
          실행
        </Button>
      </div>
    </form>
  );
}

function AdvancedOptions({
  expanded,
  onToggle,
  values,
  onChange,
}: {
  expanded: boolean;
  onToggle: () => void;
  values: TriggerFormValues;
  onChange: (next: TriggerFormValues) => void;
}) {
  return (
    <div>
      <Button
        aria-expanded={expanded}
        onClick={onToggle}
        size='sm'
        type='button'
        variant='ghost'
      >
        고급 옵션
        {expanded ? (
          <ChevronUp aria-hidden='true' size={14} />
        ) : (
          <ChevronDown aria-hidden='true' size={14} />
        )}
      </Button>
      {expanded ? (
        <div className='mt-2 flex flex-col gap-3 rounded-[var(--r-md)] border border-[color:var(--warning-line)] bg-[color:var(--warning-soft)] p-3'>
          <label className='flex items-start gap-2 text-[13.5px] text-[color:var(--text)]'>
            <input
              checked={values.force}
              className='mt-1 size-4'
              onChange={(event) =>
                onChange({ ...values, force: event.target.checked })
              }
              type='checkbox'
            />
            <span>
              <span className='block font-semibold'>force</span>
              <span className='wrap-anywhere block text-[12.5px] text-[color:var(--text-soft)]'>
                이미 생성된 스냅샷이 있어도 새 versionNo로 다시 생성합니다. 기존
                버전은 보존됩니다.
              </span>
            </span>
          </label>
          <label className='flex items-start gap-2 text-[13.5px] text-[color:var(--text)]'>
            <input
              checked={values.rebuildPageOnly}
              className='mt-1 size-4'
              onChange={(event) =>
                onChange({ ...values, rebuildPageOnly: event.target.checked })
              }
              type='checkbox'
            />
            <span>
              <span className='block font-semibold'>rebuildPageOnly</span>
              <span className='wrap-anywhere block text-[12.5px] text-[color:var(--text-soft)]'>
                뉴스·지수를 재수집하지 않고 저장된 정제 결과로 페이지만 다시
                만듭니다.
              </span>
            </span>
          </label>
          <p className='wrap-anywhere m-0 text-[12px] font-semibold text-[color:var(--warning)]'>
            두 옵션의 실행 권한과 audit 정책은 백엔드 확인이 필요합니다 (D-11).
          </p>
        </div>
      ) : null}
    </div>
  );
}
