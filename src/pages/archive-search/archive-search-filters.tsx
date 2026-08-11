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
      {/* Use 16px vertical and 18px horizontal card padding at all widths. */}
      <Card className='flex flex-col gap-3' padding='inset'>
        {/* Keep the heading and applied summary in one wrapping row. */}
        <div className='flex flex-wrap items-center gap-2.5'>
          {/* Dense card headings use 14–15px rather than the shared 17px scale. */}
          <h2
            className='m-0 text-[14px] font-semibold text-fg'
            id='archive-filter-heading'
          >
            필터
          </h2>
          <span className='mono wrap-anywhere text-caption text-faint'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getStatusSummaryLabel(applied.status)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar className='gap-3.5' onReset={reset} onSubmit={handleSubmit}>
          {/* No native `max`/`min` here on purpose: an HTML5
              constraint-violating value makes the browser (and jsdom)
              silently block the form's `submit` event before it ever
              reaches `handleSubmit` — which would make the exact validation
              future-date message below unreachable in real use, not just in
              tests. All range/format checks are enforced by
              `validateArchiveFilters` alone. */}
          {/* Keep date fields mono with token radius, surface, and strong border; the shared Input stays unchanged. */}
          <FilterField error={errors.from} htmlFor='from' label='시작일'>
            <Input
              className={cn(
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-body',
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
                'mono rounded-[var(--r-md)] bg-[color:var(--surface)] px-3 py-0 text-body',
                !errors.to && 'border-[color:var(--line-strong)]'
              )}
              invalid={Boolean(errors.to)}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='생성 상태'>
            {/* Keep the select surface/border tokens aligned with the date fields. */}
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-body text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
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
