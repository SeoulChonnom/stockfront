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
  type BatchFilterDraft,
  getBatchStatusOptions,
  getBatchStatusSummaryLabel,
  getBatchTypeOptions,
  getBatchTypeSummaryLabel,
  getDefaultBatchFilters,
  validateBatchFilters,
} from './filter-copy';

export function BatchFilters({
  applied,
  onApply,
  onReset,
}: {
  applied: BatchFilterDraft;
  onApply: (next: BatchFilterDraft) => void;
  onReset: () => void;
}) {
  const announce = useAnnounce();
  const { draft, errors, isDirty, apply, reset, getFieldProps } =
    useFilterDraft<BatchFilterDraft>({
      applied,
      defaultValues: getDefaultBatchFilters(),
      validate: validateBatchFilters,
      onApply,
      onReset: () => {
        onReset();
        announce('조회 조건을 기본값으로 초기화했습니다.');
      },
    });

  function handleSubmit() {
    const validationErrors = validateBatchFilters(draft);
    const succeeded = apply();

    if (!succeeded) {
      const [firstMessage] = Object.values(validationErrors);
      announce(`입력값을 확인해 주세요. ${firstMessage}`);
    }
  }

  return (
    <section aria-labelledby='ops-filter-heading'>
      <Card className='flex flex-col gap-3 px-[18px] py-4'>
        <div className='flex flex-wrap items-center gap-2.5'>
          <h2
            className='m-0 text-[14px] font-semibold text-fg'
            id='ops-filter-heading'
          >
            조회 조건
          </h2>
          <span className='mono wrap-anywhere text-[11.5px] text-faint'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getBatchStatusSummaryLabel(applied.status)} ·{' '}
            {getBatchTypeSummaryLabel(applied.type)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar
          applyLabel='조회'
          className='gap-3.5 [&_label]:mb-[5px] [&>div:first-child]:grid-cols-[repeat(auto-fit,minmax(168px,1fr))] [&>div:first-child]:items-start'
          onReset={reset}
          onSubmit={handleSubmit}
        >
          <FilterField error={errors.from} htmlFor='from' label='기준일 시작'>
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
          <FilterField error={errors.to} htmlFor='to' label='기준일 종료'>
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
          <FilterField htmlFor='status' label='실행 상태'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-[13.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('status')}
            >
              {getBatchStatusOptions().map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField htmlFor='type' label='배치 타입'>
            <select
              className='flex min-h-11 w-full rounded-[var(--r-md)] border border-[color:var(--line-strong)] bg-[color:var(--surface)] px-2.5 py-0 text-[13.5px] text-fg outline-none transition-[border-color,box-shadow] duration-150 focus:border-[color:color-mix(in_srgb,var(--primary)_45%,transparent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
              {...getFieldProps('type')}
            >
              {getBatchTypeOptions().map((option) => (
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
