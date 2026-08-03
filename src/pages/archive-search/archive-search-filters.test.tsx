import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { getTodayIso } from '@/lib/kst-date';

import { ArchiveSearchFilters } from './archive-search-filters';

function renderWithAnnounce(ui: ReactNode) {
  return render(<AnnounceProvider pathname='/test'>{ui}</AnnounceProvider>);
}

function getLiveRegionText() {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

// `userEvent.type` simulates keystrokes, which native `<input type="date">`
// elements don't reliably accept in jsdom (well-documented Testing Library
// limitation for picker-style input types) — `fireEvent.change` sets
// `.value` directly and fires the same `change` event React's controlled
// `onChange` relies on, so every date-field edit below goes through this
// instead of `user.type`.
function setDateValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

const applied = { from: '2026-07-13', to: '2026-07-27', status: '' };

describe('ArchiveSearchFilters', () => {
  it('renders the applied filters as a mono summary line', () => {
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    );

    expect(
      screen.getByText('적용됨 · 2026-07-13 ~ 2026-07-27 · 전체 상태')
    ).toBeInTheDocument();
  });

  it('does not call onApply while typing — draft/applied stay separate until submit', () => {
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-01');

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(/적용 전 변경 있음/)).toBeInTheDocument();
  });

  it('calls onApply with the draft values when 필터 적용 is submitted with valid input', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-10');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).toHaveBeenCalledWith({
      from: '2026-07-10',
      to: '2026-07-27',
      status: '',
    });
  });

  it('rejects a future date with the exact §7-4 message, blocks apply, and focuses the field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    const today = getTodayIso();
    const toInput = screen.getByLabelText('종료일');
    setDateValue(toInput, '2099-01-01');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(toInput).toHaveAttribute('aria-invalid', 'true');
    expect(toInput).toHaveFocus();
    expect(
      screen.getByText(
        `미래 날짜는 선택할 수 없습니다. 오늘(${today})까지 조회할 수 있습니다.`
      )
    ).toBeInTheDocument();
    expect(getLiveRegionText()).toBe(
      '필터를 적용하지 못했습니다. 입력 오류 1건을 확인해 주세요.'
    );
  });

  it('rejects from > to with the exact §7-4 swap message, attached to the start date field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={onApply}
        onReset={vi.fn()}
      />
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-27');
    setDateValue(screen.getByLabelText('종료일'), '2026-07-13');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('시작일')).toHaveFocus();
  });

  it('reset calls onReset and announces the default-restore message', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={onReset}
      />
    );

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(getLiveRegionText()).toBe('필터를 기본값으로 초기화했습니다.');
  });

  it('offers the four status options exactly as specified', () => {
    renderWithAnnounce(
      <ArchiveSearchFilters
        applied={applied}
        onApply={vi.fn()}
        onReset={vi.fn()}
      />
    );

    const select = screen.getByLabelText('생성 상태');
    const labels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent
    );

    expect(labels).toEqual([
      '전체 상태',
      'READY · 준비 완료',
      'PARTIAL · 부분 생성',
      'FAILED · 생성 실패',
    ]);
  });
});
