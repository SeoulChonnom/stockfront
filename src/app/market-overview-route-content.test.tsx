import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { ApiError } from '@/lib/api/client';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import { MarketOverviewRouteContent } from './market-overview-route-content';

const { mockUseArchiveMarketPage, mockUseLatestMarketPage, mockUseNavigation } =
  vi.hoisted(() => ({
    mockUseArchiveMarketPage: vi.fn(),
    mockUseLatestMarketPage: vi.fn(),
    mockUseNavigation: vi.fn(),
  }));

vi.mock('@/lib/query-hooks', () => ({
  useArchiveMarketPage: mockUseArchiveMarketPage,
  useLatestMarketPage: mockUseLatestMarketPage,
  useNavigation: mockUseNavigation,
}));

// The 404 and error/no-data shells both render `ArchiveModeBand` via
// `useAdjacentNavigation`, which calls `useNavigation` directly (B-5's
// standalone `GET /pages/navigation` lookup — not through
// `useArchiveMarketPage`/`useLatestMarketPage`, since neither shell has a
// loaded daily-page response to read `navigation` off of). None of the
// cases below assert on the band's prev/next dates, so a resolved,
// both-null default is enough to keep the hook from throwing on an
// unmocked export.
beforeEach(() => {
  mockUseNavigation.mockReturnValue({
    data: {
      businessDate: '',
      pageExists: false,
      previousBusinessDate: null,
      nextBusinessDate: null,
    },
    status: 'success',
  });
});

function setLocation(pathname: string) {
  window.history.replaceState(null, '', pathname);
}

function renderRoute(pathname: string) {
  setLocation(pathname);

  return render(
    <AnnounceProvider pathname={pathname}>
      <MarketOverviewRouteContent authResolved />
    </AnnounceProvider>
  );
}

function mockQuery(error: Error, refetch = vi.fn()) {
  return {
    data: undefined,
    error,
    isFetching: false,
    isLoading: false,
    refetch,
  };
}

afterEach(() => {
  // Unmount before resetting the role override: the reset can synchronously
  // notify `useCapabilities()` subscribers, and a stray re-render after the
  // query mocks are cleared would call them with no return value configured
  // and throw (see archive-search-page.test.tsx's afterEach comment).
  cleanup();
  resetRoleOverrideForTesting();
  mockUseArchiveMarketPage.mockReset();
  mockUseLatestMarketPage.mockReset();
  mockUseNavigation.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('MarketOverviewRouteContent error context', () => {
  it('keeps the latest route title and says its basis date is unavailable on 500', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockUseLatestMarketPage.mockReturnValue(
      mockQuery(new ApiError('server error', 500, null), refetch)
    );
    mockUseArchiveMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderRoute('/market/latest');

    const pageTitle = screen.getByRole('heading', {
      level: 1,
      name: '최신 시장 브리프',
    });
    expect(pageTitle).toHaveAttribute('id', 'page-title');
    expect(document.querySelectorAll('#page-title')).toHaveLength(1);
    expect(
      screen.getByText('최신 브리프의 기준일을 확인할 수 없습니다.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '데이터를 불러오지 못했습니다',
      })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps archive mode and the URL business date around a 403 PermissionState', () => {
    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseArchiveMarketPage.mockReturnValue(
      mockQuery(new ApiError('forbidden', 403, null))
    );

    renderRoute('/market/archive/2026-03-17');

    const pageTitle = screen.getByRole('heading', {
      level: 1,
      name: '2026-03-17 시장 브리프',
    });
    expect(pageTitle).toHaveAttribute('id', 'page-title');
    expect(document.querySelectorAll('#page-title')).toHaveLength(1);
    expect(screen.getAllByText('아카이브 스냅샷')).not.toHaveLength(0);
    expect(screen.getAllByText('2026-03-17')).not.toHaveLength(0);
    expect(screen.getByText('403 · FORBIDDEN')).toBeInTheDocument();
    expect(
      screen.getByText('이 화면에 접근할 권한이 없습니다')
    ).toBeInTheDocument();
  });
});

describe('MarketOverviewRouteContent — Archive 404 (ArchiveNotFoundState)', () => {
  function renderArchive404() {
    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseArchiveMarketPage.mockReturnValue(
      mockQuery(new ApiError('not found', 404, null))
    );

    return renderRoute('/market/archive/2026-03-17');
  }

  it('operator: shows the 404 badge and the batch-facing explanation', () => {
    setRoleOverride('admin');
    renderArchive404();

    expect(
      screen.getByText('해당 날짜의 스냅샷이 없습니다')
    ).toBeInTheDocument();
    expect(screen.getByText('404 · PAGE_NOT_FOUND')).toBeInTheDocument();
    expect(
      screen.getByText('배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.')
    ).toBeInTheDocument();
  });

  it('regular user: hides the 404 badge and the 배치 wording', () => {
    setRoleOverride('user');
    renderArchive404();

    expect(
      screen.getByText('해당 날짜의 스냅샷이 없습니다')
    ).toBeInTheDocument();
    expect(screen.queryByText('404 · PAGE_NOT_FOUND')).not.toBeInTheDocument();
    expect(
      screen.queryByText('배치가 실행되지 않았거나 실패한 날짜일 수 있습니다.')
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('해당 날짜의 브리프가 아직 생성되지 않았습니다.')
    ).toBeInTheDocument();
  });
});

describe('MarketOverviewRouteContent — B-5 인접 영업일 (no loaded page -> standalone endpoint)', () => {
  it('페이지 없는 날짜에서 양쪽 이동 가능: both prev/next enabled from GET /pages/navigation', () => {
    mockUseNavigation.mockReturnValue({
      data: {
        businessDate: '2026-03-17',
        pageExists: false,
        previousBusinessDate: '2026-03-16',
        nextBusinessDate: '2026-03-18',
      },
      status: 'success',
    });

    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseArchiveMarketPage.mockReturnValue(
      mockQuery(new ApiError('not found', 404, null))
    );

    renderRoute('/market/archive/2026-03-17');

    expect(
      screen.getByRole('button', { name: '이전 2026-03-16' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '다음 2026-03-18' })
    ).toBeEnabled();
  });

  it('로딩·오류 시 양쪽 비활성: a pending GET /pages/navigation disables both buttons', () => {
    mockUseNavigation.mockReturnValue({ data: undefined, status: 'pending' });

    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseArchiveMarketPage.mockReturnValue(
      mockQuery(new ApiError('not found', 404, null))
    );

    renderRoute('/market/archive/2026-03-17');

    expect(screen.getByRole('button', { name: '이전 확인 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 확인 중' })).toBeDisabled();
  });

  it('로딩·오류 시 양쪽 비활성: an errored GET /pages/navigation disables both buttons (never guesses a date)', () => {
    mockUseNavigation.mockReturnValue({ data: undefined, status: 'error' });

    mockUseLatestMarketPage.mockReturnValue({
      data: undefined,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseArchiveMarketPage.mockReturnValue(
      mockQuery(new ApiError('not found', 404, null))
    );

    renderRoute('/market/archive/2026-03-17');

    expect(
      screen.getByRole('button', { name: '이전 확인 불가' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 확인 불가' })
    ).toBeDisabled();
  });
});
