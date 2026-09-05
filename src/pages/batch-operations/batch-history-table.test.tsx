import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BatchRunRow } from '@/lib/query-hooks';

import { BatchHistoryTable } from '@/pages/batch-operations/batch-history-table';

function createRow(overrides: Partial<BatchRunRow> = {}): BatchRunRow {
  return {
    id: 101,
    jobName: 'market_daily_batch',
    jobType: 'MARKET_SNAPSHOT',
    currentStep: '페이지 스냅샷',
    market: 'N/A',
    businessDate: '2026-07-26',
    status: 'SUCCESS',
    rawStatus: 'SUCCESS',
    startedAt: '06:10:00',
    finishedAt: '06:12:15',
    duration: '2m 15s',
    counts: '174 / 114 / 21',
    detail: 'market_daily_batch 배치가 SUCCESS 상태로 기록되었습니다.',
    pageVersion: 'v3',
    pageId: 501,
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: false,
    rebuildPageOnly: false,
    steps: [],
    ...overrides,
  };
}

describe('BatchHistoryTable', () => {
  it('renders a semantic table and selects once from a button or row hit area', async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();

    render(
      <BatchHistoryTable
        isLoading={false}
        onSelectRow={onSelectRow}
        rows={[createRow(), createRow({ id: 202, businessDate: '2026-07-25' })]}
        selectedJobId={202}
      />
    );

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    expect(
      screen.getByRole('button', { name: 'job 202 상세 선택' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'job 202 상세 선택' }).closest('tr')
    ).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'job 202 상세 선택' }));
    expect(onSelectRow).toHaveBeenCalledTimes(1);
    expect(onSelectRow).toHaveBeenNthCalledWith(1, 202);

    const firstRow = screen
      .getByRole('button', { name: 'job 101 상세 선택' })
      .closest('tr');
    await user.click(
      within(firstRow as HTMLTableRowElement).getByText('2m 15s')
    );
    expect(onSelectRow).toHaveBeenCalledTimes(2);
    expect(onSelectRow).toHaveBeenNthCalledWith(2, 101);
  });

  it('keeps the selected-row button ref on the matching row only', () => {
    const selectedRowButtonRef = { current: null };

    render(
      <BatchHistoryTable
        isLoading={false}
        onSelectRow={vi.fn()}
        rows={[createRow(), createRow({ id: 202 })]}
        selectedJobId={101}
        selectedRowButtonRef={selectedRowButtonRef}
      />
    );

    expect(selectedRowButtonRef.current).toBe(
      screen.getByRole('button', { name: 'job 101 상세 선택' })
    );
    expect(selectedRowButtonRef.current).not.toBe(
      screen.getByRole('button', { name: 'job 202 상세 선택' })
    );
  });

  it('FAILED 행에 danger 톤을 표시한다', () => {
    render(
      <BatchHistoryTable
        isLoading={false}
        onSelectRow={vi.fn()}
        rows={[
          createRow({ rawStatus: 'FAILED', status: 'FAILED' }),
          createRow({ id: 202, rawStatus: 'SUCCESS' }),
        ]}
        selectedJobId={null}
      />
    );

    expect(
      screen.getByRole('button', { name: 'job 101 상세 선택' }).closest('tr')
    ).toHaveAttribute('data-tone', 'danger');
    expect(
      screen.getByRole('button', { name: 'job 202 상세 선택' }).closest('tr')
    ).not.toHaveAttribute('data-tone');
  });

  // 선택/danger 강조 클래스는 ui/table에서 이 컴포넌트로 옮겨왔다 — 표준
  // shadcn `data-[state=selected]:bg-muted`로는 hover(`bg-muted/50`)와
  // 알파값 차이만 나서 마스터-디테일 화면에서 선택 행이 구분되지 않는다.
  it('선택 행은 primary 배경/좌측 바 클래스를, danger 행은 좌측 danger 바 클래스를 갖는다', () => {
    render(
      <BatchHistoryTable
        isLoading={false}
        onSelectRow={vi.fn()}
        rows={[createRow({ rawStatus: 'FAILED', status: 'FAILED' })]}
        selectedJobId={101}
      />
    );

    const row = screen
      .getByRole('button', { name: 'job 101 상세 선택' })
      .closest('tr');

    expect(row).toHaveClass(
      'data-[state=selected]:bg-primary-soft',
      'data-[state=selected]:shadow-[inset_3px_0_0_var(--primary)]',
      'not-data-[state=selected]:data-[tone=danger]:shadow-[inset_3px_0_0_var(--danger)]'
    );
  });
});
