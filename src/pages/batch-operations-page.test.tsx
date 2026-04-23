import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BatchOperationsPage } from './batch-operations-page';

const {
  mockUseBatchJobs,
  mockUseBatchJobDetail,
  mockUseStartBatchRunMutation,
} = vi.hoisted(() => ({
  mockUseBatchJobs: vi.fn(),
  mockUseBatchJobDetail: vi.fn(),
  mockUseStartBatchRunMutation: vi.fn(),
}));

vi.mock('../lib/query-hooks', () => ({
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useStartBatchRunMutation: mockUseStartBatchRunMutation,
}));

describe('BatchOperationsPage', () => {
  it('uses a real button to select a batch row', async () => {
    const user = userEvent.setup();

    mockUseBatchJobs.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        rows: [
          {
            id: 101,
            jobName: 'daily-market-brief',
            market: 'US Market',
            businessDate: '2026-03-31',
            status: 'FAILED',
            startedAt: '09:00:00',
            finishedAt: '09:05:00',
            duration: '5m 0s',
            counts: '10 / 8 / 2',
            detail: 'Batch run failed',
            pageVersion: 'v2',
          },
        ],
        summary: {
          successRate: '0.0%',
          avgProcessingTime: '5m 0s',
          marketSyncQuality: 'Attention',
          successSupporting: '0 success / 1 failed',
          durationSupporting: 'Average across 1 runs',
          qualitySupporting: '1 failed job(s) detected',
        },
        totalCount: 1,
      },
    });

    mockUseBatchJobDetail.mockReturnValue({
      data: {
        id: 101,
        jobName: 'daily-market-brief',
        market: 'US Market',
        businessDate: '2026-03-31',
        status: 'FAILED',
        startedAt: '09:00:00',
        finishedAt: '09:05:00',
        duration: '5m 0s',
        counts: '10 / 8 / 2',
        detail: 'Batch run failed',
        pageVersion: 'v2',
      },
    });

    mockUseStartBatchRunMutation.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: vi.fn(),
    });

    render(<BatchOperationsPage searchParams={new URLSearchParams()} />);

    const selectButton = screen.getByRole('button', {
      name: 'Select batch job 101',
    });
    const row = selectButton.closest('tr');

    expect(row).not.toBeNull();
    expect(row).toHaveAttribute('aria-selected', 'true');

    await user.click(selectButton);

    expect(
      screen.getByRole('button', { name: 'Select batch job 101' })
    ).toBeEnabled();
    expect(row).toHaveAttribute('aria-selected', 'true');
  });
});
