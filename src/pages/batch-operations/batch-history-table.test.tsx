import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BatchRunRow } from '@/lib/query-hooks';

import { BatchHistoryTable } from './batch-history-table';

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
    ...overrides,
  };
}

describe('BatchHistoryTable', () => {
  it('renders a semantic table and selects a row from both its button and row hit area', async () => {
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
    expect(onSelectRow).toHaveBeenCalledWith(202);

    const firstRow = screen
      .getByRole('button', { name: 'job 101 상세 선택' })
      .closest('tr');
    await user.click(
      within(firstRow as HTMLTableRowElement).getByText('2m 15s')
    );
    expect(onSelectRow).toHaveBeenCalledWith(101);
  });

  it('keeps the selected-row button ref on the matching row only', () => {
    const selectedRowButtonRef = { current: null };

    render(
      <BatchHistoryTable
        isLoading={false}
        onSelectRow={vi.fn()}
        rows={[createRow(), createRow({ id: 202 })]}
        selectedJobId={202}
        selectedRowButtonRef={selectedRowButtonRef}
      />
    );

    expect(selectedRowButtonRef.current).toBe(
      screen.getByRole('button', { name: 'job 202 상세 선택' })
    );
  });
});
