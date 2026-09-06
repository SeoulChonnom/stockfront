import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  FilterBar,
  FilterDirtyBadge,
  FilterField,
} from '@/components/domain/filter-bar';
import type { FilterErrors } from '@/components/domain/use-filter-draft';
import { useFilterDraft } from '@/components/domain/use-filter-draft';
import { Input } from '@/components/ui/input';

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

  it('wires aria-describedby to the id of the actually-rendered error element (not just a matching string)', async () => {
    const user = userEvent.setup();

    render(
      <TestHarness
        applied={defaultValues}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const fromInput = screen.getByLabelText('시작일');
    await user.clear(fromInput);
    await user.type(fromInput, '2026-07-30'); // after `to`, invalid

    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    const describedById = fromInput.getAttribute('aria-describedby');
    expect(describedById).toBe('from-error');

    // The linkage is only real if some element actually carries that id —
    // `getFieldProps` and `FilterField`'s `FieldError` id are wired
    // independently, so a matching string on the input alone doesn't prove
    // the two are actually connected in the DOM.
    const errorElement = document.getElementById(describedById as string);
    expect(errorElement).not.toBeNull();
    expect(errorElement).toHaveTextContent('시작일이 종료일보다 늦습니다.');
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

  it('renders beforeFields above the field grid when provided, and nothing extra when omitted', () => {
    const { rerender } = render(
      <FilterBar
        beforeFields={<div data-testid='before-fields'>프리셋</div>}
        onReset={vi.fn()}
        onSubmit={vi.fn()}
      >
        <div data-testid='field-grid-child'>필드</div>
      </FilterBar>
    );

    const beforeFields = screen.getByTestId('before-fields');
    const fieldGrid = document.querySelector('[data-filter-grid]');
    expect(beforeFields).toBeInTheDocument();
    expect(fieldGrid).toBeInTheDocument();
    // `beforeFields`는 그리드 위, 형제 순서상 앞에 온다.
    expect(
      beforeFields.compareDocumentPosition(fieldGrid as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    rerender(
      <FilterBar onReset={vi.fn()} onSubmit={vi.fn()}>
        <div data-testid='field-grid-child'>필드</div>
      </FilterBar>
    );

    expect(screen.queryByTestId('before-fields')).not.toBeInTheDocument();
  });

  it('FilterField renders no hint element when hint is omitted', () => {
    render(
      <FilterField htmlFor='from' label='시작일'>
        <Input id='from' />
      </FilterField>
    );

    expect(document.getElementById('from-hint')).not.toBeInTheDocument();
  });
});
