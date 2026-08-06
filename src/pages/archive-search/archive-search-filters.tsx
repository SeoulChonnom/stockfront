import { useAnnounce } from '@/components/shell/use-announce';
import { Card } from '@/components/ui/card';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { useFilterDraft } from '@/components/ui/use-filter-draft';
import { cn } from '@/lib/utils';

import {
  type ArchiveFilterDraft,
  getDefaultArchiveFilters,
  getStatusOptions,
  getStatusSummaryLabel,
  validateArchiveFilters,
} from './filter-copy';

/**
 * Archive Search filter card — README §7-4.
 *
 * Draft/applied separation is delegated entirely to `useFilterDraft`
 * (`src/components/ui/use-filter-draft.ts`): typing here only ever updates
 * local `draft` state. The only path to the URL is `onApply`, invoked from
 * `apply()` after validation passes — the parent page is the one that
 * actually calls `navigate()` (this component has no router dependency).
 */
export function ArchiveSearchFilters({
  applied,
  onApply,
  onReset,
}: {
  applied: ArchiveFilterDraft;
  onApply: (next: ArchiveFilterDraft) => void;
  onReset: () => void;
}) {
  const announce = useAnnounce();
  const { draft, errors, isDirty, apply, reset, getFieldProps } =
    useFilterDraft<ArchiveFilterDraft>({
      applied,
      defaultValues: getDefaultArchiveFilters(),
      validate: validateArchiveFilters,
      onApply,
      onReset: () => {
        onReset();
        announce('필터를 기본값으로 초기화했습니다.');
      },
    });

  function handleSubmit() {
    // Computed independently of `apply()`'s internal validation so the
    // failure announcement can report an exact error count — the hook only
    // exposes success/failure as a boolean, not the error tally.
    const validationErrors = validateArchiveFilters(draft);
    const succeeded = apply();

    if (!succeeded) {
      const count = Object.keys(validationErrors).length;
      announce(
        `필터를 적용하지 못했습니다. 입력 오류 ${count}건을 확인해 주세요.`
      );
    }
  }

  return (
    <section aria-labelledby='archive-filter-heading'>
      {/* N1 (parity cycle 3): design's card padding is 16px vertical /
          18px horizontal at every measured width (390/768/1280) — not the
          previous `p-4 sm:p-5` (16px uniform on mobile, 20px uniform from
          640px up). */}
      <Card className='flex flex-col gap-3 px-[18px] py-4'>
        {/* D2 (parity cycle 2): design keeps the heading and the applied
            summary on ONE row (single flex container, wrap only as a last
            resort) — the app previously split them into two stacked rows,
            which wrapped even when there was room for one line. */}
        <div className='flex flex-wrap items-center gap-2.5'>
          {/* parity cycle A3: design uses per-block card-heading sizes
              (14–15px), not the README §6 17px `--fs-h2` scale — see
              docs/design_v2/v2-decisions.md §5 for the recorded divergence.
              This block ("필터") measures 14px. */}
          <h2
            className='m-0 text-[14px] font-semibold text-[color:var(--text)]'
            id='archive-filter-heading'
          >
            필터
          </h2>
          <span className='mono wrap-anywhere text-[11.5px] text-[color:var(--text-faint)]'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getStatusSummaryLabel(applied.status)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar className='gap-3.5' onReset={reset} onSubmit={handleSubmit}>
          {/* No native `max`/`min` here on purpose: an HTML5
              constraint-violating value makes the browser (and jsdom)
              silently block the form's `submit` event before it ever
              reaches `handleSubmit` — which would make the exact §7-4
              future-date message below unreachable in real use, not just in
              tests. All range/format checks are enforced by
              `validateArchiveFilters` alone. */}
          {/* W2 (parity cycle 7): the design's own `#f-from`/`#f-to` inline
              styles are `padding:0 12px` (relying on `min-height:44px` to
              center content, not vertical padding), `border-radius:var(--r2)`
              (8px — the app's shared `Input` had a literal `rounded-[14px]`,
              off-token and not 8px), `font-size:13.5px`, and
              `font-family:var(--mono)` (dates are timestamps — README §3-1
              already reserves mono for exactly this). `Input`
              (`src/components/ui/input.tsx`) is shared/off-limits this
              phase, so override its classes here via `className`
              (`cn()`/`twMerge` lets these win) instead of editing the
              shared component.
              X2 (parity cycle 8): the design's `#f-from`/`#f-to` also use
              `background:var(--surface)` (white) and
              `border:1px solid var(--line2)`, not `Input`'s default
              `--surface-2`/`--line` — those read visibly grey against the
              design's white. `--line2` (design, `#c2ccdb` light /
              `#35496d` dark) is exactly the app's `--line-strong` token
              (verified against both themes' values in the prototype's
              `:root`/`[data-theme=dark]` blocks); `--surface` already has
              the same name on both sides. Overridden here, not in the
              shared `Input`, per the same off-limits note above.
              The border-color override is skipped while `invalid` so it
              doesn't win (via `twMerge`'s last-class-wins rule) over
              `Input`'s own `--danger-line` border for that state — the
              design has no border-color rule for `hasErrFrom`/`hasErrTo`
              either, so deferring to `Input`'s existing danger styling
              here is the closer match, not a regression. */}
          <FilterField error={errors.from} htmlFor='from' label='시작일'>
            <Input
              className={cn(
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-[13.5px]',
                !errors.from && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.from)}
              type='date'
              {...getFieldProps('from')}
            />
          </FilterField>
          <FilterField error={errors.to} htmlFor='to' label='종료일'>
            <Input
              className={cn(
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-[13.5px]',
                !errors.to && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.to)}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='생성 상태'>
            {/* W2: design's `#f-status` is `padding:0 10px;
                border-radius:var(--r2);font-size:13.5px` — no
                `font-family` override, so (unlike the date inputs above)
                this one keeps the body sans font.
                X2 (parity cycle 8): same `--surface`/`--line-strong` fix as
                the date inputs above — this select was built from scratch
                here (not the shared `Input`) with the same wrong
                `--surface-2`/`--line` pair. */}
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-[13.5px] text-[color:var(--text)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('status')}
            >
              {getStatusOptions().map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </FilterBar>
      </Card>
    </section>
  );
}
