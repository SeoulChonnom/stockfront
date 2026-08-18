import { act, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import {
  resetScrollPositionsForTesting,
  saveScrollPosition,
} from './components/shell/scroll-restoration';
import {
  authBootstrapNavigation,
  resetAuthBootstrapForTesting,
} from './lib/auth-bootstrap';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from './lib/capabilities';
import { navigate, withBasePath } from './lib/router';

const {
  mockUseArchiveList,
  mockUseArchiveThemes,
  mockUseArchiveMarketPage,
  mockUseBatchJobDetail,
  mockUseBatchJobs,
  mockUseClusterDetail,
  mockUseLatestMarketPage,
  mockUsePageNavigation,
  mockUseRetryAiMutation,
} = vi.hoisted(() => ({
  mockUseArchiveList: vi.fn(),
  mockUseArchiveThemes: vi.fn(),
  mockUseArchiveMarketPage: vi.fn(),
  mockUseBatchJobDetail: vi.fn(),
  mockUseBatchJobs: vi.fn(),
  mockUseClusterDetail: vi.fn(),
  mockUseLatestMarketPage: vi.fn(),
  mockUsePageNavigation: vi.fn(),
  mockUseRetryAiMutation: vi.fn(),
}));

vi.mock('./lib/query-hooks', () => ({
  useLatestMarketPage: mockUseLatestMarketPage,
  useArchiveMarketPage: mockUseArchiveMarketPage,
  useArchiveList: mockUseArchiveList,
  useArchiveThemes: mockUseArchiveThemes,
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useRetryAiMutation: mockUseRetryAiMutation,
  useClusterDetail: mockUseClusterDetail,
  usePageNavigation: mockUsePageNavigation,
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

type MockLatestSnapshot = {
  pageId: number;
  businessDate: string;
  versionNo: number;
  generatedAt: string;
  status: 'ready';
  globalHeadline: string;
  navigation: {
    previousBusinessDate: string | null;
    nextBusinessDate: string | null;
  };
  keyPoints: [];
  issues: [];
  markets: [];
};

type MockLatestQueryResult = {
  data: MockLatestSnapshot | undefined;
  error: null;
  isFetching: boolean;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
};

let setMockLatestQuery: ((next: MockLatestQueryResult) => void) | undefined;

function useLatestMarketPageMock(): MockLatestQueryResult {
  const [query, setQuery] = useState<MockLatestQueryResult>({
    data: undefined,
    error: null,
    isFetching: false,
    isLoading: true,
    refetch: () => Promise.resolve(),
  });

  setMockLatestQuery = setQuery;
  return query;
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

/**
 * Pre-auth-resolve, none of the shell should exist at all — no brand mark,
 * no nav (old or new labels), no user chip. The current shell replaced an
 * older brand that had a "Financial Intelligence Console" subtitle
 * (the brand mark has no subtitle) and English nav/
 * user-chip labels ("Batch Status", "Admin.Ops") that are now "배치 운영"/
 * "ops.analyst" (the literal Korean nav tree plus user chip).
 */
function expectProtectedShellToBeHidden() {
  expect(screen.queryByText('Market Brief')).not.toBeInTheDocument();
  expect(screen.queryByText('배치 운영')).not.toBeInTheDocument();
  expect(screen.queryByText('ops.analyst')).not.toBeInTheDocument();
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
    mockUseArchiveThemes.mockReturnValue({
      data: [],
      isSuccess: true,
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
    mockUseRetryAiMutation.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      isSuccess: false,
      mutate: vi.fn(),
    });
    mockUseClusterDetail.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
    });
    // B-5: only the no-loaded-page shells (`MarketOverviewRouteShell`,
    // `ArchiveNotFoundState`) call this — a resolved, both-null default
    // keeps them from throwing on an unmocked export. None of the cases
    // below assert on the band's prev/next dates.
    mockUsePageNavigation.mockReturnValue({
      data: {
        businessDate: '',
        pageExists: false,
        previousBusinessDate: null,
        nextBusinessDate: null,
      },
      status: 'success',
    });
  });

  afterEach(() => {
    setMockLatestQuery = undefined;
    resetAuthBootstrapForTesting();
    resetScrollPositionsForTesting();
    resetRoleOverrideForTesting();
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
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockReturnValue(deferredResponse.promise)
    );
    window.history.replaceState(null, '', '/');

    render(<App />);

    expect(window.location.pathname).toBe('/');
    // The market-page queries are owned by `MarketOverviewRouteContent`
    // (nested under the protected shell), which does not mount before
    // auth resolves — so the hook simply hasn't been called yet, not
    // called-with-`false`.
    expect(mockUseLatestMarketPage).not.toHaveBeenCalled();
    expectProtectedShellToBeHidden();
    expect(screen.getByRole('status')).toHaveTextContent(
      '로그인 상태를 확인하고 있습니다'
    );
    expect(
      screen.queryByText('표시할 데이터가 없습니다')
    ).not.toBeInTheDocument();

    act(() => {
      deferredResponse.resolve(
        createJsonResponse({ accessToken: 'issued-token' })
      );
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe(withBasePath('/market/latest'));
    });

    await waitFor(() => {
      expect(mockUseLatestMarketPage).toHaveBeenCalledWith(true);
    });
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    expect(screen.getByText('표시할 데이터가 없습니다')).toBeInTheDocument();
  });

  it('redirects to the exact production login URL when bootstrap fails', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const redirectToLogin = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({ accessToken: '   ' }))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith(
        'http://localhost:8000/main/login?redirect=%2F'
      );
    });

    expect(window.location.pathname).toBe('/');
    expect(mockUseLatestMarketPage.mock.calls).not.toContainEqual([true]);
    expectProtectedShellToBeHidden();
    expect(screen.getByRole('status')).toHaveTextContent(
      '로그인 페이지로 이동 중입니다'
    );
    expect(
      screen.queryByText('표시할 데이터가 없습니다')
    ).not.toBeInTheDocument();
  });

  it('renders a safe accessible failure state when bootstrap cannot redirect', async () => {
    vi.stubEnv('VITE_API_HOST', '');
    const fetchMock =
      vi.fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >();
    vi.stubGlobal('fetch', fetchMock);
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    const failureMessage = await screen.findByRole('alert');
    expect(failureMessage).toHaveTextContent(
      '로그인 상태를 확인할 수 없습니다'
    );
    expect(failureMessage).toHaveTextContent(
      '잠시 후 다시 시도하거나 로그인 페이지에서 다시 접속해 주세요.'
    );
    expect(failureMessage).not.toHaveTextContent('VITE_API_HOST');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    expectProtectedShellToBeHidden();
    expect(
      screen.queryByText('표시할 데이터가 없습니다')
    ).not.toBeInTheDocument();
  });

  it('operator: shows the 401 · AUTH_BOOTSTRAP_FAILED badge on the same failure state', async () => {
    vi.stubEnv('VITE_API_HOST', '');
    vi.stubGlobal(
      'fetch',
      vi.fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
    );
    window.history.replaceState(null, '', '/');
    setRoleOverride('admin');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    const failureMessage = await screen.findByRole('alert');
    expect(failureMessage).toHaveTextContent('401 · AUTH_BOOTSTRAP_FAILED');
  });

  it('regular user: hides the 401 · AUTH_BOOTSTRAP_FAILED badge on the same failure state', async () => {
    vi.stubEnv('VITE_API_HOST', '');
    vi.stubGlobal(
      'fetch',
      vi.fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >()
    );
    window.history.replaceState(null, '', '/');
    setRoleOverride('user');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    const failureMessage = await screen.findByRole('alert');
    expect(failureMessage).toHaveTextContent(
      '로그인 상태를 확인할 수 없습니다'
    );
    expect(failureMessage).not.toHaveTextContent('401 · AUTH_BOOTSTRAP_FAILED');
  });

  it('redirects to the exact production login URL when bootstrap payload is malformed from a trailing-slash host', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000/');
    const redirectToLogin = vi
      .spyOn(authBootstrapNavigation, 'redirectToLogin')
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({}))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith(
        'http://localhost:8000/main/login?redirect=%2F'
      );
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
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockRejectedValue(new TypeError('Failed to fetch'))
    );
    window.history.replaceState(null, '', '/');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(redirectToLogin).toHaveBeenCalledWith(
        'http://localhost:8000/main/login?redirect=%2F'
      );
    });

    expect(window.location.pathname).toBe('/');
    expectProtectedShellToBeHidden();
    expect(
      screen.queryByText('표시할 데이터가 없습니다')
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole('status')).toHaveTextContent(
      '로그인 상태를 확인하고 있습니다'
    );

    act(() => {
      deferredResponse.resolve(
        createJsonResponse({ accessToken: 'issued-token' })
      );
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe(withBasePath('/market/latest'));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockUseLatestMarketPage).toHaveBeenCalledWith(true);
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
  });

  it('allows development bypass and resumes normal route rendering', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    const redirectToLogin = vi.spyOn(
      authBootstrapNavigation,
      'redirectToLogin'
    );
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
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
      expect(
        screen.getByRole('heading', { level: 1, name: '아카이브' })
      ).toBeInTheDocument();
    });

    expect(redirectToLogin).not.toHaveBeenCalled();
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: '아카이브' })
    ).toBeInTheDocument();
    // 페이지 표시는 공용 Pagination의 mono `page / totalPages` 이고,
    // 적용 버튼은 draft/applied 분리를 반영한 '필터 적용'이다.
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '필터 적용' })
    ).toBeInTheDocument();
  });

  it('does not render protected query pages before bootstrap resolves', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    const deferredResponse = createDeferredResponse();
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockReturnValue(deferredResponse.promise)
    );
    window.history.replaceState(null, '', '/ops/batches');

    render(<App />);

    expect(mockUseBatchJobs).not.toHaveBeenCalled();
    expectProtectedShellToBeHidden();
    expect(screen.getByRole('status')).toHaveTextContent(
      '로그인 상태를 확인하고 있습니다'
    );
    expect(
      screen.queryByRole('heading', { name: '배치 운영' })
    ).not.toBeInTheDocument();

    act(() => {
      deferredResponse.resolve(
        createJsonResponse({
          accessToken: 'issued-token',
          roleList: ['USER', 'ADMIN'],
        })
      );
    });

    await waitFor(() => {
      expect(mockUseBatchJobs).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Market Brief')).toBeInTheDocument();
    // 배치 운영은 라우트 단위로 코드 분할되어 있어(`app-page-content.tsx`)
    // 청크가 도착한 뒤에야 렌더된다 — 부트스트랩 해소와 같은 틱이 아니다.
    expect(
      await screen.findByRole('heading', { name: '배치 운영' })
    ).toBeInTheDocument();
    // master-detail 목록 헤딩. 상세는 jobId 선택 시에만 렌더된다.
    expect(screen.getByText('실행 이력')).toBeInTheDocument();
  });

  it('passes archive pageId from the URL into the archive page query identity', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );
    window.history.replaceState(
      null,
      '',
      '/market/archive/2026-03-31?pageId=42'
    );

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUseArchiveMarketPage).toHaveBeenCalledWith(
        { businessDate: '2026-03-31', pageId: 42 },
        true
      );
    });
  });

  it('focuses #page-title on a pathname route change, and leaves query-only changes to the page', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );
    window.history.replaceState(null, '', '/market/archive/search');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '아카이브' })
      ).toBeInTheDocument();
    });
    expect(document.activeElement?.id).toBe('page-title');

    // Move focus away, then change ONLY the query string (pathname stays
    // identical).
    //
    // Query-only transitions belong to the page, not the shell: Archive
    // 필터 적용 and pagination focus the 결과 heading, 검증 실패 focuses the
    // first invalid field, Batch `jobId` selection focuses the 상세 heading.
    // Because `App.tsx` is the parent, its effect commits after the page's,
    // so if the shell refocused `#page-title` here it would always win and
    // undo whatever the page just did. The shell must therefore stay out of
    // the way — `#page-title` must NOT be refocused by a search-only change.
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    expect(document.activeElement?.id).not.toBe('page-title');

    act(() => {
      navigate('/market/archive/search?page=2');
    });

    await waitFor(() => {
      expect(window.location.search).toBe('?page=2');
    });
    expect(document.activeElement?.id).not.toBe('page-title');
  });

  it('focuses a title mounted by a child rerender after the route skeleton', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );
    mockUseLatestMarketPage.mockImplementation(useLatestMarketPageMock);
    window.history.replaceState(null, '', '/market/latest');

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveFocus();
      expect(
        screen.queryByRole('heading', { name: '최신 시장 브리프' })
      ).not.toBeInTheDocument();
    });

    act(() => {
      setMockLatestQuery?.({
        data: {
          businessDate: '2026-03-17',
          generatedAt: '2026. 03. 17. 09:30',
          globalHeadline: 'headline',
          navigation: { previousBusinessDate: null, nextBusinessDate: null },
          keyPoints: [],
          issues: [],
          markets: [],
          pageId: 501,
          status: 'ready',
          versionNo: 3,
        },
        error: null,
        isFetching: false,
        isLoading: false,
        refetch: () => Promise.resolve(),
      });
    });

    await waitFor(() => {
      // The h1 now renders the promoted headline (`decision-header-card.tsx`),
      // not the old "최신 시장 브리프" label — that copy moved to a small
      // caption above it.
      expect(screen.getByRole('heading', { name: 'headline' })).toHaveFocus();
    });
  });

  it('scrolls a brand-new URL to the top, and restores a saved scroll position when returning to a visited one', async () => {
    vi.stubEnv('VITE_API_HOST', 'http://localhost:8000');
    vi.stubEnv('VITE_APP_ENV', 'development');
    vi.stubGlobal(
      'fetch',
      vi
        .fn<
          (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
        >()
        .mockResolvedValue(createJsonResponse({ accessToken: '' }))
    );
    window.history.replaceState(null, '', '/market/latest');
    const scrollToSpy = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined);

    await act(async () => {
      render(<App />);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Market Brief')).toBeInTheDocument();
    });
    // Brand-new key (never saved before) scrolls to 0 — App.tsx's own
    // restoration effect, the part this phase owns. (Saving `window.scrollY`
    // for a URL the user is LEAVING is the caller's job — see
    // `saveScrollPosition`'s doc comment in `scroll-restoration.ts` — so this
    // test calls it explicitly, the same way a screen's own navigate link
    // would, rather than assuming a bare `navigate()` call saves it.)
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0);

    saveScrollPosition('/market/latest', 480);

    act(() => {
      navigate('/market/archive/search');
    });
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: '아카이브' })
      ).toBeInTheDocument();
    });
    // A different, never-visited key also starts at 0.
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0);

    act(() => {
      navigate('/market/latest');
    });

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenLastCalledWith(0, 480);
    });
  });
});
