import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';
import { useAnnounce } from '@/components/shell/use-announce';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

const { mockGetBatchJobs } = vi.hoisted(() => ({
  mockGetBatchJobs: vi.fn(),
}));

vi.mock('@/lib/api/batch', () => ({
  getBatchJobs: mockGetBatchJobs,
}));

/**
 * `AppShell`은 상단 고정 헤더 하나로 이루어진 셸이다. 좌측 레일과 모바일
 * 드로어는 사라졌고, 데스크톱·모바일 모두 헤더 중앙의 사이트맵 버튼 그룹
 * 하나만 쓴다. 목적지는 열고 닫는 것 없이 항상 화면에 있다.
 *
 * 여기서 고정하는 계약: 스킵 링크, 정확히 하나인 `주요 메뉴` 랜드마크,
 * 활성 목적지의 `aria-current`, `ops.view`가 없는 사용자에게 운영 목적지가
 * 숨겨지는 게 아니라 DOM에 아예 없다는 것, 실패 배지, 그리고 라우트가 바뀔 때
 * 비워지는 단 하나의 라이브 리전.
 */

function getNav() {
  return screen.getByRole('navigation', { name: '주요 메뉴' });
}

function renderShell(props: Partial<Parameters<typeof AppShell>[0]> = {}) {
  return render(
    <AppShell
      onToggleTheme={() => undefined}
      pathname='/market/latest'
      searchParams={new URLSearchParams()}
      theme='dark'
      {...props}
    >
      <h1 id='page-title' tabIndex={-1}>
        페이지 콘텐츠
      </h1>
    </AppShell>
  );
}

function getFailedCountQuery(queryClient: QueryClient) {
  const query = queryClient
    .getQueryCache()
    .find({ queryKey: ['batch-jobs', 'failed-count'], exact: false });

  if (!query) {
    throw new Error('failed-count query was not created');
  }

  return query;
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_APP_ENV', 'production');
  });

  afterEach(() => {
    resetRoleOverrideForTesting();
    vi.unstubAllEnvs();
  });

  it('renders the skip link pointing at #main-content', () => {
    renderShell();

    const skipLink = screen.getByRole('link', { name: '본문으로 바로가기' });
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('keeps the header pinned to the top and points the wordmark at 최신 브리프', () => {
    renderShell();

    const header = screen.getByRole('banner');
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('top-0');
    expect(
      within(header).getByRole('link', { name: 'Market Brief' })
    ).toHaveAttribute('href', '/market/latest');
  });

  it('renders exactly one primary nav landmark with the two always-on items', () => {
    setRoleOverride('user');
    renderShell();

    expect(
      screen.getAllByRole('navigation', { name: '주요 메뉴' })
    ).toHaveLength(1);
    expect(
      within(getNav()).getAllByRole('link', { name: '최신 브리프' })
    ).toHaveLength(1);
    expect(
      within(getNav()).getAllByRole('link', { name: '아카이브' })
    ).toHaveLength(1);
  });

  it('marks the current route with aria-current="page"', () => {
    renderShell({ pathname: '/market/latest' });

    // 레일이 사라진 뒤 "지금 어디"를 말하는 자리는 여기뿐이다 — 브리프
    // 화면의 <h1>은 목적지 이름이 아니라 그날의 헤드라인이다.
    expect(
      within(getNav()).getByRole('link', { name: '최신 브리프' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(getNav()).getByRole('link', { name: '아카이브' })
    ).not.toHaveAttribute('aria-current');
  });

  it('keeps every destination reachable without opening anything', () => {
    setRoleOverride('admin');
    renderShell();

    // 버튼 그룹은 접히지 않는다. 좁은 화면에서 라벨만 시각적으로 접히고
    // 접근 가능한 이름은 그대로 남는다.
    expect(within(getNav()).getAllByRole('link')).toHaveLength(3);
  });

  it('offers the theme toggle inside the profile menu, named for the theme it switches to', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    renderShell({ onToggleTheme, theme: 'dark' });

    await user.click(screen.getByRole('button', { name: /계정 메뉴/ }));

    const toggle = screen.getByRole('menuitem', {
      name: '라이트 테마로 전환',
    });
    await user.click(toggle);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('uses the next theme in the toggle copy', async () => {
    const user = userEvent.setup();
    renderShell({ theme: 'light' });

    await user.click(screen.getByRole('button', { name: /계정 메뉴/ }));

    expect(
      screen.getByRole('menuitem', { name: '다크 테마로 전환' })
    ).toBeInTheDocument();
  });

  it('never renders the 운영 destination for a non-admin user — not even hidden', () => {
    setRoleOverride('user');
    const { baseElement } = renderShell();

    expect(
      screen.queryByRole('link', { name: '배치 운영' })
    ).not.toBeInTheDocument();
    expect(baseElement.innerHTML).not.toContain('배치 운영');
  });

  it('renders the 배치 운영 destination for an admin', () => {
    setRoleOverride('admin');
    renderShell({ pathname: '/ops/batches' });

    expect(
      within(getNav()).getByRole('link', { name: '배치 운영' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('renders the failed-count badge from the live seven-day summary query', async () => {
    setRoleOverride('admin');
    mockGetBatchJobs.mockResolvedValue({ summary: { failedCount: 2 } });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppShell
          onToggleTheme={() => undefined}
          pathname='/ops/batches'
          searchParams={new URLSearchParams()}
          theme='dark'
        >
          <div>content</div>
        </AppShell>
      </QueryClientProvider>
    );

    // 배지는 배치 운영 버튼 위에 그대로 붙는다 — 운영자가 무엇을 열지 않아도
    // 실패가 보여야 신호다.
    await waitFor(() => {
      const badge = screen.getByTestId('ops-failed-count-badge');
      expect(badge).toHaveTextContent('2');
      expect(badge).toHaveAttribute('title', '최근 7일 실패');
      expect(badge).toHaveAttribute('aria-label', '최근 7일 실패');
    });
    expect(
      within(getNav()).getByRole('link', { name: /배치 운영/ })
    ).toBeInTheDocument();

    expect(mockGetBatchJobs).toHaveBeenCalledTimes(1);
    const [params] = mockGetBatchJobs.mock.calls[0] as [
      { fromDate: string; toDate: string; page: number; size: number },
    ];
    expect(params).toMatchObject({ page: 1, size: 1 });
    expect(
      Math.round(
        (Date.parse(params.toDate) - Date.parse(params.fromDate)) /
          (24 * 60 * 60 * 1000)
      )
    ).toBe(6);
  });

  it('does not request the failed summary for an unauthorized user', async () => {
    setRoleOverride('user');
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AppShell
          onToggleTheme={() => undefined}
          pathname='/ops/batches'
          searchParams={new URLSearchParams()}
          theme='dark'
        >
          <div>content</div>
        </AppShell>
      </QueryClientProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });
    const query = getFailedCountQuery(queryClient);
    expect(query.state.status).toBe('pending');
    expect(query.state.fetchStatus).toBe('idle');
    expect(mockGetBatchJobs).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('ops-failed-count-badge')
    ).not.toBeInTheDocument();
  });

  it('does not request the failed summary when no QueryClientProvider is present', async () => {
    setRoleOverride('admin');

    renderShell({ pathname: '/ops/batches' });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetBatchJobs).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('ops-failed-count-badge')
    ).not.toBeInTheDocument();
  });

  it.each([
    'initial request failure',
    'empty summary',
    'malformed summary',
    'zero failed jobs',
  ])('hides the failed badge for %s', async (caseName) => {
    setRoleOverride('admin');
    if (caseName === 'initial request failure') {
      mockGetBatchJobs.mockRejectedValue(new Error('offline'));
    } else if (caseName === 'empty summary') {
      mockGetBatchJobs.mockResolvedValue({});
    } else if (caseName === 'malformed summary') {
      mockGetBatchJobs.mockResolvedValue({ summary: null });
    } else {
      mockGetBatchJobs.mockResolvedValue({ summary: { failedCount: 0 } });
    }
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppShell
          onToggleTheme={() => undefined}
          pathname='/ops/batches'
          searchParams={new URLSearchParams()}
          theme='dark'
        >
          <div>content</div>
        </AppShell>
      </QueryClientProvider>
    );

    const expectedStatus =
      caseName === 'zero failed jobs' ? 'success' : 'error';

    await waitFor(() => {
      const query = getFailedCountQuery(queryClient);
      expect(mockGetBatchJobs).toHaveBeenCalledTimes(1);
      expect(query.state.status).toBe(expectedStatus);
      expect(query.state.fetchStatus).toBe('idle');
    });
    expect(
      screen.queryByTestId('ops-failed-count-badge')
    ).not.toBeInTheDocument();
  });

  it('keeps the last successful count when a refetch fails', async () => {
    setRoleOverride('admin');
    mockGetBatchJobs
      .mockResolvedValueOnce({ summary: { failedCount: 2 } })
      .mockRejectedValueOnce(new Error('offline'));
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppShell
          onToggleTheme={() => undefined}
          pathname='/ops/batches'
          searchParams={new URLSearchParams()}
          theme='dark'
        >
          <div>content</div>
        </AppShell>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ops-failed-count-badge')).toHaveTextContent(
        '2'
      );
    });

    await queryClient.refetchQueries({
      queryKey: ['batch-jobs', 'failed-count'],
    });

    expect(mockGetBatchJobs).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('ops-failed-count-badge')).toHaveTextContent('2');
  });

  it('shows the role alone in the profile menu when the token carries no name', async () => {
    const user = userEvent.setup();
    setRoleOverride('admin');
    renderShell();

    // 토큰이 없는 렌더(테스트/개발 우회)에서는 이름이 없다. 그때는 역할만
    // 남기고 자리표시자를 지어내지 않는다 — `useAuthUserName` 참고.
    await user.click(screen.getByRole('button', { name: '계정 메뉴' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Admin')).toBeInTheDocument();
  });

  it('exposes exactly one aria-live="polite" region that clears its message on route change', () => {
    function Announcer() {
      const announce = useAnnounce();
      return (
        <button
          onClick={() => announce('검색 결과 46건을 찾았습니다.')}
          type='button'
        >
          발표
        </button>
      );
    }

    const { rerender } = render(
      <AppShell
        onToggleTheme={() => undefined}
        pathname='/market/archive/search'
        searchParams={new URLSearchParams()}
        theme='dark'
      >
        <Announcer />
      </AppShell>
    );

    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBe(1);
    const liveRegion = liveRegions[0];
    expect(liveRegion).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button', { name: '발표' }));
    expect(liveRegion).toHaveTextContent('검색 결과 46건을 찾았습니다.');

    // A query-only change must not clear it. Announcements pair with
    // exactly these transitions — Pagination announces "N페이지를 불러옵니다."
    // in the same synchronous call as the `navigate()` that sets `page=2`.
    // Clearing on pathname+search swallowed those announcements 100% of the
    // time; a query-only change is the same screen updating, not a new one.
    rerender(
      <AppShell
        onToggleTheme={() => undefined}
        pathname='/market/archive/search'
        searchParams={new URLSearchParams('page=2')}
        theme='dark'
      >
        <Announcer />
      </AppShell>
    );

    expect(liveRegion).toHaveTextContent('검색 결과 46건을 찾았습니다.');

    // A pathname change IS a real route change — the stale message from the
    // previous screen must not survive it.
    rerender(
      <AppShell
        onToggleTheme={() => undefined}
        pathname='/ops/batches'
        searchParams={new URLSearchParams()}
        theme='dark'
      >
        <Announcer />
      </AppShell>
    );

    expect(liveRegion).toHaveTextContent('');
  });
});
