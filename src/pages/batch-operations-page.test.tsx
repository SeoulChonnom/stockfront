import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BatchJobsParams } from '../lib/api/batch';
import type { BatchRun } from '../lib/view-models';
import { BatchOperationsPage } from './batch-operations-page';

type BatchJobsQueryResult = {
  isLoading: boolean;
  error: null;
  data: {
    rows: BatchRun[];
    summary: ReturnType<typeof createSummary>;
    totalCount: number;
  };
};

const {
  mockUseBatchJobs,
  mockUseBatchJobDetail,
  mockUseStartBatchRunMutation,
} = vi.hoisted(() => ({
  mockUseBatchJobs: vi.fn<(
    params: BatchJobsParams
  ) => BatchJobsQueryResult>(),
  mockUseBatchJobDetail: vi.fn(),
  mockUseStartBatchRunMutation: vi.fn(),
}));

vi.mock('../lib/query-hooks', () => ({
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useStartBatchRunMutation: mockUseStartBatchRunMutation,
}));

describe('BatchOperationsPage', () => {
  beforeEach(() => {
    mockUseBatchJobs.mockReset();
    mockUseBatchJobDetail.mockReset();
    mockUseStartBatchRunMutation.mockReset();
    mockUseStartBatchRunMutation.mockReturnValue({
      isPending: false,
      isError: false,
      mutate: vi.fn(),
    });
  });

  it('passes normalized batch date ranges to the batch query', () => {
    mockUseBatchJobs.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        rows: [],
        summary: createSummary(),
        totalCount: 0,
      },
    });

    mockUseBatchJobDetail.mockReturnValue({
      data: null,
      isError: false,
      isLoading: false,
      error: null,
    });

    render(
      <BatchOperationsPage
        searchParams={new URLSearchParams('from=2026-03-14&to=2026-03-01')}
      />
    );

    expect(mockUseBatchJobs).toHaveBeenLastCalledWith({
      fromDate: '2026-03-01',
      toDate: '2026-03-14',
      status: undefined,
      page: 1,
      size: 20,
    });
  });

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

  it('resets the selected batch when the current page no longer contains it', async () => {
    const user = userEvent.setup();

    mockUseBatchJobs.mockImplementation(({ page }: BatchJobsParams) => {
      if (page === 2) {
        return {
          isLoading: false,
          error: null,
          data: {
            rows: [createBatchRun({ id: 303, status: 'SUCCESS' })],
            summary: createSummary(),
            totalCount: 1,
          },
        };
      }

      return {
        isLoading: false,
        error: null,
        data: {
          rows: [
            createBatchRun({ id: 101, status: 'SUCCESS' }),
            createBatchRun({ id: 202, status: 'SUCCESS' }),
          ],
          summary: createSummary(),
          totalCount: 2,
        },
      };
    });

    mockUseBatchJobDetail.mockReturnValue({
      data: createBatchRun({ id: 101, status: 'SUCCESS' }),
      isError: false,
      isLoading: false,
      error: null,
    });

    const { rerender } = render(
      <BatchOperationsPage searchParams={new URLSearchParams()} />
    );

    await user.click(
      screen.getByRole('button', { name: 'Select batch job 202' })
    );

    expect(mockUseBatchJobDetail).toHaveBeenLastCalledWith(202);

    rerender(
      <BatchOperationsPage searchParams={new URLSearchParams('page=2')} />
    );

    expect(mockUseBatchJobDetail).toHaveBeenLastCalledWith(303);
    expect(
      screen.getByRole('button', { name: 'Select batch job 303' }).closest('tr')
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('renders an explicit loading state while selected batch details load', () => {
    mockUseBatchJobs.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        rows: [createBatchRun({ id: 101, status: 'SUCCESS' })],
        summary: createSummary(),
        totalCount: 1,
      },
    });

    mockUseBatchJobDetail.mockReturnValue({
      data: null,
      isError: false,
      isLoading: true,
      error: null,
    });

    render(<BatchOperationsPage searchParams={new URLSearchParams()} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      '선택한 배치 상세 정보를 불러오는 중입니다.'
    );
    expect(screen.queryByText('선택된 배치가 없습니다.')).not.toBeInTheDocument();
  });

  it('renders an explicit error state for failed selected batch detail requests', () => {
    mockUseBatchJobs.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        rows: [createBatchRun({ id: 101, status: 'FAILED' })],
        summary: createSummary(),
        totalCount: 1,
      },
    });

    mockUseBatchJobDetail.mockReturnValue({
      data: null,
      isError: true,
      isLoading: false,
      error: new Error('Batch detail unavailable'),
    });

    render(<BatchOperationsPage searchParams={new URLSearchParams()} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Batch detail unavailable'
    );
    expect(screen.queryByText('선택된 배치가 없습니다.')).not.toBeInTheDocument();
  });

  it('removes statuses unsupported by batch operations before querying', () => {
    mockUseBatchJobs.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        rows: [],
        summary: createSummary(),
        totalCount: 0,
      },
    });
    mockUseBatchJobDetail.mockReturnValue({
      data: null,
      isError: false,
      isLoading: false,
      error: null,
    });

    render(
      <BatchOperationsPage searchParams={new URLSearchParams('status=READY')} />
    );

    const batchQuery = mockUseBatchJobs.mock.calls.at(-1)?.[0];

    expect(batchQuery).toBeDefined();
    expect(batchQuery).toMatchObject({
      status: undefined,
      page: 1,
      size: 20,
    });
    expect(typeof batchQuery?.fromDate).toBe('string');
    expect(typeof batchQuery?.toDate).toBe('string');
  });
});

function createBatchRun(overrides: Partial<BatchRun> = {}): BatchRun {
  return {
    id: 101,
    jobName: 'daily-market-brief',
    market: 'US Market',
    businessDate: '2026-03-31',
    status: 'SUCCESS',
    startedAt: '09:00:00',
    finishedAt: '09:05:00',
    duration: '5m 0s',
    counts: '10 / 10 / 0',
    detail: 'Batch run completed',
    pageVersion: 'v2',
    ...overrides,
  };
}

function createSummary() {
  return {
    successRate: '100.0%',
    avgProcessingTime: '5m 0s',
    marketSyncQuality: 'Healthy',
    successSupporting: '1 success / 0 failed',
    durationSupporting: 'Average across 1 runs',
    qualitySupporting: 'No failed jobs detected',
  };
}
