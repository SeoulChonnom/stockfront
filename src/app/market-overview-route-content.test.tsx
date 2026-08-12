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

const {
  mockUseArchiveList,
  mockUseArchiveMarketPage,
  mockUseLatestMarketPage,
} = vi.hoisted(() => ({
  mockUseArchiveList: vi.fn(),
  mockUseArchiveMarketPage: vi.fn(),
  mockUseLatestMarketPage: vi.fn(),
}));

vi.mock('@/lib/query-hooks', () => ({
  useArchiveList: mockUseArchiveList,
  useArchiveMarketPage: mockUseArchiveMarketPage,
  useLatestMarketPage: mockUseLatestMarketPage,
}));

// The 404 and error/no-data shells both render `ArchiveModeBand` via
// `useAdjacentSnapshotDates`, which calls `useArchiveList` directly (not
// through `useArchiveMarketPage`/`useLatestMarketPage`). None of the cases
// below assert on the band's prev/next dates, so an empty-rows default is
// enough to keep the hook from throwing on an unmocked export.
beforeEach(() => {
  mockUseArchiveList.mockReturnValue({ data: { rows: [] }, isLoading: false });
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
  mockUseArchiveList.mockReset();
  mockUseArchiveMarketPage.mockReset();
  mockUseLatestMarketPage.mockReset();
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
