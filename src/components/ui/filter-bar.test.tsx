import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FilterBar, FilterDirtyBadge, FilterField } from './filter-bar';
import { Input } from './input';
import type { FilterErrors } from './use-filter-draft';
import { useFilterDraft } from './use-filter-draft';

type TestFilters = {
  from: string;
  to: string;
};

const defaultValues: TestFilters = { from: '2026-07-01', to: '2026-07-27' };

function validate(draft: TestFilters): FilterErrors<TestFilters> {
  const errors: FilterErrors<TestFilters> = {};

  if (draft.from > draft.to) {
    errors.from = '시작일이 종료일보다 늦습니다.';
  }

  return errors;
}

function TestHarness({
  applied,
  onApply,
  onReset,
}: {
  applied: TestFilters;
  onApply: (next: TestFilters) => void;
  onReset: () => void;
}) {
  const { errors, isDirty, apply, reset, getFieldProps } = useFilterDraft({
    applied,
    defaultValues,
    onApply,
    onReset,
    validate,
  });

  return (
    <FilterBar
      onReset={reset}
      onSubmit={() => {
        apply();
      }}
      summary={<FilterDirtyBadge isDirty={isDirty} />}
    >
      <FilterField error={errors.from} htmlFor='from' label='시작일'>
        <Input {...getFieldProps('from')} />
      </FilterField>
      <FilterField error={errors.to} htmlFor='to' label='종료일'>
        <Input {...getFieldProps('to')} />
      </FilterField>
    </FilterBar>
  );
}

describe('FilterBar / useFilterDraft', () => {
  it('typing in a field does not call onApply — only the apply action does', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    const fromInput = screen.getByLabelText('시작일');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-07-05');

    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows the dirty badge once the draft diverges from applied, and hides it again once reset', async () => {
    const user = userEvent.setup();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(screen.queryByText('적용 전 변경 있음')).not.toBeInTheDocument();

    const fromInput = screen.getByLabelText('시작일');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-07-05');

    expect(screen.getByText('적용 전 변경 있음')).toBeInTheDocument();
  });

  it('calls onApply with the draft values when 필터 적용 is clicked', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    const toInput = screen.getByLabelText('종료일');
    await user.clear(toInput);
    await user.type(toInput, '2026-07-20');

    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).toHaveBeenCalledWith({
      from: defaultValues.from,
      to: '2026-07-20',
    });
  });

  it('on validation failure: does not call onApply, sets aria-invalid + aria-describedby, and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    const fromInput = screen.getByLabelText('시작일');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-07-30'); // after `to`, invalid

    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(fromInput).toHaveAttribute('aria-invalid', 'true');
    expect(fromInput).toHaveAttribute('aria-describedby', 'from-error');
    expect(
      screen.getByText('시작일이 종료일보다 늦습니다.')
    ).toBeInTheDocument();
    expect(fromInput).toHaveFocus();
  });

  it('reset calls onReset and restores default values in the draft', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={vi.fn()}
        onReset={onReset}
      />
    );

    const fromInput = screen.getByLabelText('시작일');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-07-10');

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(fromInput).toHaveValue(defaultValues.from);
  });
});
