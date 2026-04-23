import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const {
  mockUseArchiveList,
  mockUseArchiveMarketPage,
  mockUseBatchJobDetail,
  mockUseBatchJobs,
  mockUseClusterDetail,
  mockUseLatestMarketPage,
  mockUseStartBatchRunMutation,
} = vi.hoisted(() => ({
  mockUseArchiveList: vi.fn(),
  mockUseArchiveMarketPage: vi.fn(),
  mockUseBatchJobDetail: vi.fn(),
  mockUseBatchJobs: vi.fn(),
  mockUseClusterDetail: vi.fn(),
  mockUseLatestMarketPage: vi.fn(),
  mockUseStartBatchRunMutation: vi.fn(),
}));

vi.mock('./lib/query-hooks', () => ({
  useLatestMarketPage: mockUseLatestMarketPage,
  useArchiveMarketPage: mockUseArchiveMarketPage,
  useArchiveList: mockUseArchiveList,
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useStartBatchRunMutation: mockUseStartBatchRunMutation,
  useClusterDetail: mockUseClusterDetail,
}));

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

describe('App routing', () => {
  beforeEach(() => {
    mockMatchMedia(true);

    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });
    mockUseArchiveMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });
    mockUseArchiveList.mockReturnValue({
      data: {
        page: 2,
        rows: [],
        totalCount: 0,
        totalPages: 3,
      },
      error: null,
      isLoading: false,
    });
    mockUseBatchJobs.mockReturnValue({
      data: {
        rows: [],
        summary: {
          successRate: '0.0%',
          avgProcessingTime: '-',
          marketSyncQuality: '-',
          successSupporting: 'No data',
          durationSupporting: 'No data',
          qualitySupporting: 'No data',
        },
        totalCount: 0,
      },
      error: null,
      isLoading: false,
    });
    mockUseBatchJobDetail.mockReturnValue({ data: null });
    mockUseStartBatchRunMutation.mockReturnValue({
      isError: false,
      isPending: false,
      mutate: vi.fn(),
    });
    mockUseClusterDetail.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  it('redirects the root path to /market/latest', async () => {
    window.history.replaceState(null, '', '/');

    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/market/latest');
    });

    expect(screen.getByText('No Market Data')).toBeInTheDocument();
  });

  it('renders the archive search route with parsed search params', () => {
    window.history.replaceState(
      null,
      '',
      '/market/archive/search?status=FAILED&page=2'
    );

    render(<App />);

    expect(screen.getByText('Archive Search')).toBeInTheDocument();
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('renders the batch operations route', () => {
    window.history.replaceState(null, '', '/ops/batches');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Batch Operations' })
    ).toBeInTheDocument();
    expect(screen.getByText('Selected Run Detail')).toBeInTheDocument();
  });
});
