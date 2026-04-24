import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import {
  authBootstrapNavigation,
  resetAuthBootstrapForTesting,
} from './lib/auth-bootstrap';

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

function createJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

function createDeferredResponse() {
  let resolve: ((value: Response) => void) | undefined;

  return {
    promise: new Promise<Response>((nextResolve) => {
      resolve = nextResolve;
    }),
    resolve(response: Response) {
      resolve?.(response);
    },
  };
}

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

function expectProtectedShellToBeHidden() {
  expect(screen.queryByText('Market Brief')).not.toBeInTheDocument();
  expect(
    screen.queryByText('Financial Intelligence Console')
  ).not.toBeInTheDocument();
  expect(screen.queryByText('Batch Status')).not.toBeInTheDocument();
  expect(screen.queryByText('Admin.Ops')).not.toBeInTheDocument();
  expect(screen.queryByText('Market Daily Brief')).not.toBeInTheDocument();
}

describe('App routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    resetAuthBootstrapForTesting();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    window.history.replaceState(null, '', '/');
  });

  it('waits for production bootstrap success before normalizing / to /market/latest', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const deferredResponse = createDeferredResponse();
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockReturnValue(deferredResponse.promise)
    );
    window.history.replaceState(null, '', '/');

    render(<App />);

    expect(window.location.pathname).toBe('/');
    expect(mockUseLatestMarketPage).toHaveBeenCalledWith(false);
    expectProtectedShellToBeHidden();
    expect(screen.queryByText('No Market Data')).not.toBeInTheDocument();

    await act(async () => {
      deferredResponse.resolve(createJsonResponse({ accessToken: 'issued-token' }));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/market/latest');
    });

    await waitFor(() => {
      expect(mockUseLatestMarketPage).toHaveBeenCalledWith(true);
    });
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    expect(
      screen.getByText('Financial Intelligence Console')
    ).toBeInTheDocument();
    expect(screen.getByText('No Market Data')).toBeInTheDocument();
  });

  it('redirects to the exact production login URL when bootstrap fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const redirectToLogin = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: '   ' }))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith('http://localhost:8000/login');
    });

    expect(window.location.pathname).toBe('/');
    expect(mockUseLatestMarketPage.mock.calls).not.toContainEqual([true]);
    expectProtectedShellToBeHidden();
    expect(screen.queryByText('No Market Data')).not.toBeInTheDocument();
  });

  it('redirects to the exact production login URL when bootstrap payload is malformed from a trailing-slash host', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000/');
    const redirectToLogin = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({}))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith('http://localhost:8000/login');
    });

    expect(window.location.pathname).toBe('/');
    expect(mockUseLatestMarketPage.mock.calls).not.toContainEqual([true]);
    expectProtectedShellToBeHidden();
  });

  it('redirects to the exact production login URL when bootstrap request fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const redirectToLogin = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockRejectedValue(new TypeError('Failed to fetch'))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith('http://localhost:8000/login');
    });

    expect(window.location.pathname).toBe('/');
    expectProtectedShellToBeHidden();
    expect(screen.queryByText('No Market Data')).not.toBeInTheDocument();
  });

  it('keeps bootstrap idempotent under StrictMode so duplicate startup effects do not duplicate token requests', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const deferredResponse = createDeferredResponse();
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockReturnValue(deferredResponse.promise);
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');
    expectProtectedShellToBeHidden();

    await act(async () => {
      deferredResponse.resolve(createJsonResponse({ accessToken: 'issued-token' }));
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/market/latest');
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockUseLatestMarketPage).toHaveBeenCalledWith(true);
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
  });

  it('allows development bypass and resumes normal route rendering', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    const redirectToLogin = vi.spyOn(authBootstrapNavigation, 'redirectToLogin');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );
    window.history.replaceState(
      null,
      '',
      '/market/archive/search?status=FAILED&page=2'
    );

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Archive Search')).toBeInTheDocument();
    });

    expect(redirectToLogin).not.toHaveBeenCalled();
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    expect(screen.getByText('Archive Search')).toBeInTheDocument();
    expect(screen.getByText('Page 2 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('does not render protected query pages before bootstrap resolves', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const deferredResponse = createDeferredResponse();
    vi.stubGlobal(
      'fetch',
      vi
        .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
        .mockReturnValue(deferredResponse.promise)
    );
    window.history.replaceState(null, '', '/ops/batches');

    render(<App />);

    expect(mockUseBatchJobs).not.toHaveBeenCalled();
    expectProtectedShellToBeHidden();
    expect(
      screen.queryByRole('heading', { name: 'Batch Operations' })
    ).not.toBeInTheDocument();

    await act(async () => {
      deferredResponse.resolve(createJsonResponse({ accessToken: 'issued-token' }));
    });

    await waitFor(() => {
      expect(mockUseBatchJobs).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Batch Operations' })
    ).toBeInTheDocument();
    expect(screen.getByText('Selected Run Detail')).toBeInTheDocument();
  });
});
