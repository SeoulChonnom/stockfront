import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { getTodayIso } from '@/lib/kst-date';

import { BatchFilters } from './batch-filters';

function renderWithAnnounce(ui: ReactNode) {
  return render(<AnnounceProvider pathname='/test'>{ui}</AnnounceProvider>);
}

function getLiveRegionText() {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

// See `archive-search-filters.test.tsx`'s matching helper: native
// `<input type="date">` doesn't reliably accept `userEvent.type` keystrokes
// in jsdom, so date edits go through `fireEvent.change` instead.
function setDateValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

const applied = { from: '2026-07-13', to: '2026-07-27', status: '', type: '' };

describe('BatchFilters', () => {
  it('renders the applied filters as a tnum summary line including status and type', () => {
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={vi.fn()} onReset={vi.fn()} />
    );

    expect(
      screen.getByText(
        '적용됨 · 2026-07-13 ~ 2026-07-27 · 전체 상태 · 전체 타입'
      )
    ).toBeInTheDocument();
  });

  it('does not call onApply while typing — draft/applied stay separate until 조회', () => {
    const onApply = vi.fn();
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={onApply} onReset={vi.fn()} />
    );

    setDateValue(screen.getByLabelText('기준일 시작'), '2026-07-01');

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText(/적용 전 변경 있음/)).toBeInTheDocument();
  });

  it('calls onApply with the draft values (including jobType) when 조회 is submitted with valid input', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={onApply} onReset={vi.fn()} />
    );

    setDateValue(screen.getByLabelText('기준일 시작'), '2026-07-10');
    await user.selectOptions(screen.getByLabelText('실행 상태'), 'FAILED');
    await user.selectOptions(
      screen.getByLabelText('배치 타입'),
      'MARKET_SNAPSHOT'
    );
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(onApply).toHaveBeenCalledWith({
      from: '2026-07-10',
      to: '2026-07-27',
      status: 'FAILED',
      type: 'MARKET_SNAPSHOT',
    });
  });

  it('rejects a future date with the product message, blocks apply, focuses the field, and announces the exact batch-screen error copy', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={onApply} onReset={vi.fn()} />
    );

    const today = getTodayIso();
    const toInput = screen.getByLabelText('기준일 종료');
    setDateValue(toInput, '2099-01-01');
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(toInput).toHaveAttribute('aria-invalid', 'true');
    expect(toInput).toHaveFocus();
    const message = `미래 날짜는 선택할 수 없습니다. 오늘(${today})까지 조회할 수 있습니다.`;
    expect(screen.getByText(message)).toBeInTheDocument();
    // This is the batch-screen-specific announce copy — different from
    // Archive Search's "입력 오류 N건을 확인해 주세요." count wording.
    expect(getLiveRegionText()).toBe(`입력값을 확인해 주세요. ${message}`);
  });

  it('rejects from > to with the exact swap message, attached to the start date field', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={onApply} onReset={vi.fn()} />
    );

    setDateValue(screen.getByLabelText('기준일 시작'), '2026-07-27');
    setDateValue(screen.getByLabelText('기준일 종료'), '2026-07-13');
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        '시작일이 종료일보다 늦습니다. 두 날짜를 바꿔 입력해 주세요.'
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기준일 시작')).toHaveFocus();
  });

  it('초기화 calls onReset and announces the batch-screen default-restore message', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={vi.fn()} onReset={onReset} />
    );

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(getLiveRegionText()).toBe('조회 조건을 기본값으로 초기화했습니다.');
  });

  it('offers the five supported status options in display order', () => {
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={vi.fn()} onReset={vi.fn()} />
    );

    const select = screen.getByLabelText('실행 상태');
    const labels = Array.from(select.querySelectorAll('option')).map(
      (option) => option.textContent
    );

    expect(labels).toEqual([
      '전체 상태',
      'SUCCESS · 성공',
      'PARTIAL · 부분 생성',
      'FAILED · 생성 실패',
      'RUNNING · 실행 중',
    ]);
  });

  it('offers the three type options with API enum values and user-facing labels', () => {
    renderWithAnnounce(
      <BatchFilters applied={applied} onApply={vi.fn()} onReset={vi.fn()} />
    );

    const select = screen.getByLabelText('배치 타입');
    const options = Array.from(select.querySelectorAll('option'));

    expect(options.map((option) => option.value)).toEqual([
      '',
      'NEWS_COLLECTION',
      'MARKET_SNAPSHOT',
    ]);
    expect(options.map((option) => option.textContent)).toEqual([
      '전체 타입',
      '검색 결과 저장',
      '스냅샷 생성',
    ]);
  });
});
