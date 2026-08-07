import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  BatchJobDetailResponse,
  BatchJobListResponse,
  DailyPageResponse,
} from './api/types';
import {
  useArchiveMarketPage,
  useBatchJobDetail,
  useBatchJobs,
} from './query-hooks';

const {
  mockGetDailyPageByBusinessDate,
  mockGetDailyPageByPageId,
  mockGetLatestDailyPage,
  mockGetBatchJobs,
  mockGetBatchJobDetail,
} = vi.hoisted(() => ({
  mockGetDailyPageByBusinessDate: vi.fn(),
  mockGetDailyPageByPageId: vi.fn(),
  mockGetLatestDailyPage: vi.fn(),
  mockGetBatchJobs: vi.fn(),
  mockGetBatchJobDetail: vi.fn(),
}));

vi.mock('./api/pages', () => ({
  getDailyPageByBusinessDate: mockGetDailyPageByBusinessDate,
  getDailyPageByPageId: mockGetDailyPageByPageId,
  getLatestDailyPage: mockGetLatestDailyPage,
}));

vi.mock('./api/batch', () => ({
  getBatchJobs: mockGetBatchJobs,
  getBatchJobDetail: mockGetBatchJobDetail,
}));

const dailyPageResponse: DailyPageResponse = {
  pageId: 42,
  businessDate: '2026-03-31',
  versionNo: 2,
  pageTitle: 'Archive',
  status: 'READY',
  globalHeadline: 'headline',
  generatedAt: '2026-03-31T06:12:00Z',
  partialMessage: null,
  markets: [],
  metadata: {
    rawNewsCount: 0,
    processedNewsCount: 0,
    clusterCount: 0,
    lastUpdatedAt: '2026-03-31T06:12:00Z',
  },
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function getRefetchInterval(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
) {
  const query = queryClient.getQueryCache().find({ queryKey });

  if (!query) {
    throw new Error(`query not found: ${queryKey.join('/')}`);
  }

  const interval = (
    query.options as {
      refetchInterval?:
        | number
        | false
        | ((query: unknown) => number | false | undefined);
    }
  ).refetchInterval;
  return typeof interval === 'function' ? interval(query) : interval;
}

const batchListResponse: BatchJobListResponse = {
  items: [
    {
      jobId: 101,
      jobType: 'MARKET_SNAPSHOT',
      jobName: 'market_daily_batch',
      businessDate: '2026-03-31',
      status: 'SUCCESS',
      currentStep: null,
      startedAt: '2026-03-31T06:10:00',
      endedAt: '2026-03-31T06:12:00',
      durationSeconds: 120,
      marketScope: 'N/A',
      rawNewsCount: 1,
      processedNewsCount: 1,
      clusterCount: 1,
      pageId: 42,
      pageVersionNo: 1,
      partialMessage: null,
    },
  ],
  pagination: { page: 1, size: 20, totalCount: 1 },
  summary: {
    successCount: 1,
    partialCount: 0,
    failedCount: 0,
    avgDurationSeconds: 120,
  },
};

const batchDetailResponse: BatchJobDetailResponse = {
  jobId: 101,
  jobName: 'market_daily_batch',
  jobType: 'MARKET_SNAPSHOT',
  businessDate: '2026-03-31',
  status: 'SUCCESS',
  currentStep: null,
  startedAt: '2026-03-31T06:10:00',
  endedAt: '2026-03-31T06:12:00',
  durationSeconds: 120,
  partialMessage: null,
  errorCode: null,
  errorMessage: null,
  logSummary: null,
  snapshot: null,
  newsCollection: null,
};

describe('useArchiveMarketPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses pageId for archive detail fetches and includes full identity in the query key', async () => {
    mockGetDailyPageByPageId.mockResolvedValue(dailyPageResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(
      () => useArchiveMarketPage({ businessDate: '2026-03-31', pageId: 42 }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => {
      expect(mockGetDailyPageByPageId).toHaveBeenCalledWith(
        42,
        expect.any(AbortSignal)
      );
    });

    expect(mockGetDailyPageByBusinessDate).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(['daily-page', 'archive', '2026-03-31', 42])
    ).toMatchObject({ pageId: 42, businessDate: '2026-03-31' });
  });
});

describe('batch query polling', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(['PENDING', 'RUNNING'])(
    'polls batch list data every 5000 ms while a row is %s',
    async (status) => {
      mockGetBatchJobs.mockResolvedValue({
        ...batchListResponse,
        items: [{ ...batchListResponse.items[0], status }],
      });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      renderHook(
        () =>
          useBatchJobs({
            fromDate: '2026-03-31',
            toDate: '2026-03-31',
          }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(mockGetBatchJobs).toHaveBeenCalled());

      expect(
        getRefetchInterval(queryClient, [
          'batch-jobs',
          { fromDate: '2026-03-31', toDate: '2026-03-31' },
        ])
      ).toBe(5000);
    }
  );

  it('stops polling batch list data after a terminal status', async () => {
    mockGetBatchJobs.mockResolvedValue(batchListResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(
      () =>
        useBatchJobs({
          fromDate: '2026-03-31',
          toDate: '2026-03-31',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(mockGetBatchJobs).toHaveBeenCalled());

    expect(
      getRefetchInterval(queryClient, [
        'batch-jobs',
        { fromDate: '2026-03-31', toDate: '2026-03-31' },
      ])
    ).toBe(false);
  });

  it.each(['PENDING', 'RUNNING'])(
    'polls batch detail data every 5000 ms while the job is %s',
    async (status) => {
      mockGetBatchJobDetail.mockResolvedValue({
        ...batchDetailResponse,
        status,
      });
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      renderHook(() => useBatchJobDetail(101), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(mockGetBatchJobDetail).toHaveBeenCalled());

      expect(getRefetchInterval(queryClient, ['batch-job-detail', 101])).toBe(
        5000
      );
    }
  );

  it('stops polling batch detail data after a terminal status', async () => {
    mockGetBatchJobDetail.mockResolvedValue(batchDetailResponse);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useBatchJobDetail(101), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(mockGetBatchJobDetail).toHaveBeenCalled());

    expect(getRefetchInterval(queryClient, ['batch-job-detail', 101])).toBe(
      false
    );
  });

  it('keeps detail polling disabled when no job is selected', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useBatchJobDetail(null), {
      wrapper: createWrapper(queryClient),
    });

    expect(mockGetBatchJobDetail).not.toHaveBeenCalled();
    expect(getRefetchInterval(queryClient, ['batch-job-detail', null])).toBe(
      false
    );
  });
});
