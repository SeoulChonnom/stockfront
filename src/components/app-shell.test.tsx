import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import { AppShell } from './app-shell';
import { useAnnounce } from './shell/use-announce';

const { mockGetBatchJobs } = vi.hoisted(() => ({
  mockGetBatchJobs: vi.fn(),
}));

vi.mock('@/lib/api/batch', () => ({
  getBatchJobs: mockGetBatchJobs,
}));

/**
 * `AppShell` is the single-nav rail/mobile-header/drawer shell (README §5,
 * §7-1). These tests replace the old single "topbar search is disabled"
 * assertion (`placeholder` no longer exists as a prop — the whole topbar
 * search field was deleted per §5's "Won't" list) with coverage for the
 * requirements that actually drive Phase 4: exactly one primary nav, the
 * admin-only 운영 group is genuinely absent from the DOM for a non-admin
 * user (not just hidden), the skip link, the mobile drawer's
 * open/close/focus-return behaviour, and the single live region clearing on
 * route change.
 */

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

  it('renders exactly one primary nav landmark with the two always-on items', () => {
    setRoleOverride('user');
    renderShell();

    // The drawer is closed by default, so its <nav> copy isn't mounted yet —
    // exactly one nav landmark, one of each item, should exist.
    expect(
      screen.getAllByRole('navigation', { name: '주요 메뉴' })
    ).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: '최신 브리프' })).toHaveLength(
      1
    );
    expect(screen.getAllByRole('link', { name: '아카이브' })).toHaveLength(1);
  });

  it('marks the current route with aria-current="page"', () => {
    renderShell({ pathname: '/market/latest' });

    const active = screen.getAllByRole('link', { name: '최신 브리프' })[0];
    expect(active).toHaveAttribute('aria-current', 'page');

    const inactive = screen.getAllByRole('link', { name: '아카이브' })[0];
    expect(inactive).not.toHaveAttribute('aria-current');
  });

  it('renders the rail theme control as a full-width text button and keeps the mobile control icon-only', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    renderShell({ onToggleTheme, theme: 'dark' });

    const railToggle = within(screen.getByRole('complementary')).getByRole(
      'button',
      { name: '라이트 테마로 전환' }
    );
    expect(railToggle).toHaveTextContent('라이트 테마로 전환');
    expect(railToggle).toHaveClass('w-full');

    const mobileToggle = within(screen.getByRole('banner')).getByRole(
      'button',
      { name: '라이트 테마로 전환' }
    );
    expect(mobileToggle).not.toHaveTextContent('라이트 테마로 전환');

    await user.click(railToggle);
    await user.click(mobileToggle);
    expect(onToggleTheme).toHaveBeenCalledTimes(2);
  });

  it('uses the next theme in the accessible toggle copy', () => {
    renderShell({ theme: 'light' });

    expect(
      screen.getAllByRole('button', { name: '다크 테마로 전환' })
    ).toHaveLength(2);
  });

  it('never renders the 운영 nav group for a non-admin user — not even hidden (§10, §16-11)', () => {
    setRoleOverride('user');
    const { container } = renderShell();

    expect(
      screen.queryByRole('link', { name: '배치 운영' })
    ).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('배치 운영');
  });

  it('renders the 운영 nav group with 배치 운영 for an admin', () => {
    setRoleOverride('admin');
    renderShell({ pathname: '/ops/batches' });

    const opsLinks = screen.getAllByRole('link', { name: '배치 운영' });
    expect(opsLinks.length).toBeGreaterThan(0);
    expect(opsLinks[0]).toHaveAttribute('aria-current', 'page');
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

    await waitFor(() => {
      const badge = screen.getAllByTestId('ops-failed-count-badge')[0];
      expect(badge).toHaveTextContent('2');
      expect(badge).toHaveAttribute('title', '최근 7일 실패');
      expect(badge).toHaveAttribute('aria-label', '최근 7일 실패');
    });

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

    await waitFor(() => expect(mockGetBatchJobs).not.toHaveBeenCalled());
    expect(
      screen.queryByTestId('ops-failed-count-badge')
    ).not.toBeInTheDocument();
  });

  it('does not request the failed summary when no QueryClientProvider is present', async () => {
    setRoleOverride('admin');

    renderShell({ pathname: '/ops/batches' });

    await waitFor(() => expect(mockGetBatchJobs).not.toHaveBeenCalled());
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

    await waitFor(() => expect(mockGetBatchJobs).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(
        screen.queryByTestId('ops-failed-count-badge')
      ).not.toBeInTheDocument();
    });
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
      expect(
        screen.getAllByTestId('ops-failed-count-badge')[0]
      ).toHaveTextContent('2');
    });

    await queryClient.refetchQueries({
      queryKey: ['batch-jobs', 'failed-count'],
    });

    expect(mockGetBatchJobs).toHaveBeenCalledTimes(2);
    expect(
      screen.getAllByTestId('ops-failed-count-badge')[0]
    ).toHaveTextContent('2');
  });

  it('opens the mobile drawer from the menu button, and Escape closes it and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    setRoleOverride('admin');
    renderShell();

    const menuButton = screen.getByRole('button', { name: '주요 메뉴 열기' });
    await user.click(menuButton);

    const drawer = screen.getByRole('dialog', { name: 'Market Brief' });
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByText('Admin · ops.analyst')).toBeInTheDocument();
    // The drawer renders its own copy of the nav — now there should be two
    // "최신 브리프" links (rail + drawer).
    expect(screen.getAllByRole('link', { name: '최신 브리프' }).length).toBe(2);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menuButton).toHaveFocus();
  });

  it('closes the drawer when a nav item inside it is clicked', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: '주요 메뉴 열기' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const drawer = screen.getByRole('dialog');
    const archiveLink = within(drawer).getByRole('link', { name: '아카이브' });
    await user.click(archiveLink);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

    // A QUERY-ONLY change must NOT clear it. §9 pairs announcements with
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
    // previous screen must not survive it (§7-1).
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
