import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DailyPageResponse } from './api/types';
import { useArchiveMarketPage } from './query-hooks';

const {
  mockGetDailyPageByBusinessDate,
  mockGetDailyPageByPageId,
  mockGetLatestDailyPage,
} = vi.hoisted(() => ({
  mockGetDailyPageByBusinessDate: vi.fn(),
  mockGetDailyPageByPageId: vi.fn(),
  mockGetLatestDailyPage: vi.fn(),
}));

vi.mock('./api/pages', () => ({
  getDailyPageByBusinessDate: mockGetDailyPageByBusinessDate,
  getDailyPageByPageId: mockGetDailyPageByPageId,
  getLatestDailyPage: mockGetLatestDailyPage,
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
      () =>
        useArchiveMarketPage({ businessDate: '2026-03-31', pageId: 42 }),
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
