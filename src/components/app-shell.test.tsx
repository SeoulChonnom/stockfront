import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import { AppShell } from './app-shell';
import { useAnnounce } from './shell/use-announce';

/**
 * `AppShell` is the single-nav rail/mobile-header/drawer shell (README §5,
 * §7-1). These tests replace the old single "topbar search is disabled"
 * assertion (`placeholder` no longer exists as a prop — the whole topbar
 * search field was deleted per §5's "Won't" list) with coverage for the
 * requirements that actually drive Phase 4: exactly one primary nav, the
 * Operator-only 운영 group is genuinely absent from the DOM for Viewer (not
 * just hidden), the skip link, the mobile drawer's open/close/focus-return
 * behaviour, and the single live region clearing on route change.
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
    setRoleOverride('viewer');
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

  it('never renders the 운영 nav group for Viewer — not even hidden (§10, §16-11)', () => {
    setRoleOverride('viewer');
    const { container } = renderShell();

    expect(
      screen.queryByRole('link', { name: '배치 운영' })
    ).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('배치 운영');
  });

  it('renders the 운영 nav group with 배치 운영 for Operator', () => {
    setRoleOverride('operator');
    renderShell({ pathname: '/ops/batches' });

    const opsLinks = screen.getAllByRole('link', { name: '배치 운영' });
    expect(opsLinks.length).toBeGreaterThan(0);
    expect(opsLinks[0]).toHaveAttribute('aria-current', 'page');
  });

  it('does not render a failed-count badge when the batch-jobs query cache is empty', () => {
    setRoleOverride('operator');
    renderShell();

    expect(
      screen.queryByTestId('ops-failed-count-badge')
    ).not.toBeInTheDocument();
  });

  it('renders the failed-count badge from an already-cached batch-jobs query, without firing a request', () => {
    setRoleOverride('operator');
    // No queryFn is ever registered on this client — `setQueryData` seeds the
    // cache directly. If the badge required a live query, this render would
    // throw ("Missing queryFn") instead of showing "2".
    //
    // Bug fix regression (`use-ops-failed-count.ts`, found by the §16
    // acceptance suite's `e2e/routing.spec.ts`): TanStack Query's cache only
    // ever holds the RAW `queryFn` result — the `BatchJobListResponse` shape
    // `useBatchJobs`'s own `getBatchJobs()` returns (`{items, pagination,
    // summary}`, see `src/lib/api/types.ts`) — never the post-`select`
    // `BatchJobsViewWithCounts` shape (`{rows, counts, ...}`) a component
    // sees after `useQuery()` applies `select: enrichBatchJobsView`. This
    // fixture previously seeded the cache with the SELECTED shape (`rows`/a
    // fabricated `summary.successRate` string), which the hook's old
    // `data.rows.filter(...)` read only "worked" against by coincidence in
    // this test — against the REAL raw shape it threw
    // `TypeError: Cannot read properties of undefined (reading 'filter')`
    // for every real user opening `/ops/batches` once. Seeding the actual
    // raw response shape here is what would have caught that before it
    // shipped.
    const queryClient = new QueryClient();
    queryClient.setQueryData(['batch-jobs', { page: 1, size: 20 }], {
      items: [
        { jobId: 1, status: 'FAILED' },
        { jobId: 2, status: 'SUCCESS' },
        { jobId: 3, status: 'FAILED' },
      ],
      pagination: { page: 1, size: 20, totalCount: 3 },
      summary: {
        successCount: 1,
        partialCount: 0,
        failedCount: 2,
        avgDurationSeconds: 120,
      },
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

    const badges = screen.getAllByTestId('ops-failed-count-badge');
    expect(badges[0]).toHaveTextContent('2');
    // Rendering AppShell must not have registered/fetched any additional
    // query — the one entry is exactly the one this test seeded, and it was
    // never (re)fetched.
    const cachedQueries = queryClient
      .getQueryCache()
      .findAll({ queryKey: ['batch-jobs'] });
    expect(cachedQueries).toHaveLength(1);
    expect(cachedQueries[0].state.fetchStatus).toBe('idle');
  });

  it('opens the mobile drawer from the menu button, and Escape closes it and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderShell();

    const menuButton = screen.getByRole('button', { name: '주요 메뉴 열기' });
    await user.click(menuButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
