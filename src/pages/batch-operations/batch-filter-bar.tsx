import { useState } from 'react';

import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilterDraft } from '@/components/ui/use-filter-draft';

import type { BatchFilters } from './batch-url';

/**
 * README §7-6 point 5 "적용된 상태 필터" + shared draft/applied pattern
 * (§7-4's `useFilterDraft`). Batch doesn't get Archive's full validation
 * suite (future-date check etc. — §7-6 never asks for it, the screen is
 * about past runs), just the one check that's cheap and clearly useful:
 * a reversed date range.
 *
 * The status field is tracked as separate local draft state rather than
 * being folded into `useFilterDraft` — that hook's `getFieldProps` targets
 * native `<input>`/`<select onChange>` elements, and Radix `Select` reports
 * changes via `onValueChange(value: string)` instead, which doesn't line up
 * without fabricating a fake `ChangeEvent`. Keeping it separate is a few
 * more lines but no unsound casts.
 */

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'all', label: '전체 상태' },
  { value: 'SUCCESS', label: 'SUCCESS · 성공' },
  { value: 'PARTIAL', label: 'PARTIAL · 부분 생성' },
  { value: 'FAILED', label: 'FAILED · 생성 실패' },
];

function statusLabel(status: string): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === (status || 'all'))
      ?.label ?? '전체 상태'
  );
}

export function BatchFilterBar({
  applied,
  onApply,
  onReset,
}: {
  applied: BatchFilters;
  onApply: (next: { from: string; to: string; status: string }) => void;
  onReset: () => void;
}) {
  const [statusDraft, setStatusDraft] = useState(applied.status);
  // React "adjusting state during render" pattern (not an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect) so a URL-driven
  // `applied.status` change (e.g. browser Back, or the 주의 배너's
  // 실패만/부분 실패만 보기 quick filters) resyncs this draft without an
  // extra post-commit render pass.
  const [prevAppliedStatus, setPrevAppliedStatus] = useState(applied.status);
  if (applied.status !== prevAppliedStatus) {
    setPrevAppliedStatus(applied.status);
    setStatusDraft(applied.status);
  }

  const dateApplied = { from: applied.from, to: applied.to };
  const { errors, isDirty, apply, reset, getFieldProps } = useFilterDraft({
    applied: dateApplied,
    defaultValues: dateApplied,
    validate: (draft) =>
      draft.from && draft.to && draft.from > draft.to
        ? {
            to: '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.',
          }
        : {},
    onApply: (next) => onApply({ ...next, status: statusDraft }),
    onReset: () => {
      setStatusDraft('');
      onReset();
    },
  });

  const statusIsDirty = statusDraft !== applied.status;

  return (
    <FilterBar
      onReset={reset}
      onSubmit={apply}
      summary={
        <div className='flex flex-wrap items-center gap-2 text-[12.5px] text-[color:var(--text-soft)]'>
          <span className='mono'>
            적용됨 · {applied.from} ~ {applied.to} ·{' '}
            {statusLabel(applied.status)}
          </span>
          <FilterDirtyBadge isDirty={isDirty || statusIsDirty} />
        </div>
      }
    >
      <FilterField error={errors.from} htmlFor='batch-from' label='시작일'>
        <Input
          {...getFieldProps('from')}
          className='min-h-11'
          invalid={Boolean(errors.from)}
          type='date'
        />
      </FilterField>
      <FilterField error={errors.to} htmlFor='batch-to' label='종료일'>
        <Input
          {...getFieldProps('to')}
          className='min-h-11'
          invalid={Boolean(errors.to)}
          type='date'
        />
      </FilterField>
      <FilterField htmlFor='batch-status-trigger' label='상태'>
        <Select
          onValueChange={(value) =>
            setStatusDraft(value === 'all' ? '' : value)
          }
          value={statusDraft || 'all'}
        >
          <SelectTrigger id='batch-status-trigger'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </FilterBar>
  );
}
