import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/domain/filter-bar';
import { useFilterDraft } from '@/components/domain/use-filter-draft';
import { useAnnounce } from '@/components/shell/use-announce';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { cn } from '@/lib/utils';

import {
  type BatchFilterDraft,
  getBatchStatusOptions,
  getBatchStatusSummaryLabel,
  getBatchTypeOptions,
  getBatchTypeSummaryLabel,
  getDefaultBatchFilters,
  validateBatchFilters,
} from '@/pages/batch-operations/filter-copy';

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
            className='m-0 text-label font-semibold tracking-caps text-fg-soft uppercase'
            id='ops-filter-heading'
          >
            조회 조건
          </h2>
          <span className='tnum wrap-anywhere text-body-sm text-faint'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {getBatchStatusSummaryLabel(applied.status)} ·{' '}
            {getBatchTypeSummaryLabel(applied.type)}
          </span>
          <FilterDirtyBadge isDirty={isDirty} />
        </div>

        <FilterBar
          applyLabel='조회'
          className='gap-3.5 [&_label]:mb-[5px] [&_[data-filter-grid]]:grid-cols-[repeat(auto-fit,minmax(168px,1fr))] [&_[data-filter-grid]]:items-start'
          onReset={reset}
          onSubmit={handleSubmit}
        >
          <FilterField error={errors.from} htmlFor='from' label='기준일 시작'>
            <Input
              className={cn(
                'tnum rounded-md bg-card px-3 py-0 text-body',
                !errors.from && 'border-line-strong'
              )}
              type='date'
              {...getFieldProps('from')}
            />
          </FilterField>
          <FilterField error={errors.to} htmlFor='to' label='기준일 종료'>
            <Input
              className={cn(
                'tnum rounded-md bg-card px-3 py-0 text-body',
                !errors.to && 'border-line-strong'
              )}
              type='date'
              {...getFieldProps('to')}
            />
          </FilterField>
          <FilterField htmlFor='status' label='실행 상태'>
            <NativeSelect
              className='min-h-tap border-line-strong bg-card text-body text-fg'
              {...getFieldProps('status')}
            >
              {getBatchStatusOptions().map((option) => (
                <NativeSelectOption
                  key={option.value || 'all'}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FilterField>
          <FilterField htmlFor='type' label='배치 타입'>
            <NativeSelect
              className='min-h-tap border-line-strong bg-card text-body text-fg'
              {...getFieldProps('type')}
            >
              {getBatchTypeOptions().map((option) => (
                <NativeSelectOption
                  key={option.value || 'all'}
                  value={option.value}
                >
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FilterField>
        </FilterBar>
      </Card>
    </section>
  );
}
