import { useAnnounce } from '@/components/shell/use-announce';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { useFilterDraft } from '@/components/ui/use-filter-draft';

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
      <div className='flex flex-col gap-4 rounded-[var(--r-lg)] border border-[color:var(--line)] bg-[color:var(--surface)] p-4 sm:p-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h2
            className='m-0 text-[17px] font-semibold text-[color:var(--text)]'
            id='archive-filter-heading'
          >
            필터
          </h2>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <span className='mono wrap-anywhere text-[12.5px] text-[color:var(--text-soft)]'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getStatusSummaryLabel(applied.status)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar onReset={reset} onSubmit={handleSubmit}>
          {/* No native `max`/`min` here on purpose: an HTML5
              constraint-violating value makes the browser (and jsdom)
              silently block the form's `submit` event before it ever
              reaches `handleSubmit` — which would make the exact §7-4
              future-date message below unreachable in real use, not just in
              tests. All range/format checks are enforced by
              `validateArchiveFilters` alone. */}
          <FilterField error={errors.from} htmlFor='from' label='시작일'>
            <Input
              invalid={Boolean(errors.from)}
              type='date'
              {...getFieldProps('from')}
            />
          </FilterField>
          <FilterField error={errors.to} htmlFor='to' label='종료일'>
            <Input
              invalid={Boolean(errors.to)}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='생성 상태'>
            <select
              className='flex min-h-11 w-full rounded-[14px] border border-[color:var(--line)] bg-[color:var(--surface-2)] px-3.5 py-2 text-[color:var(--text)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
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
      </div>
    </section>
  );
}
