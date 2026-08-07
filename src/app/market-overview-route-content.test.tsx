import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { ApiError } from '@/lib/api/client';

import { MarketOverviewRouteContent } from './market-overview-route-content';

const { mockUseArchiveMarketPage, mockUseLatestMarketPage } = vi.hoisted(
  () => ({
    mockUseArchiveMarketPage: vi.fn(),
    mockUseLatestMarketPage: vi.fn(),
  })
);

vi.mock('@/lib/query-hooks', () => ({
  useArchiveMarketPage: mockUseArchiveMarketPage,
  useLatestMarketPage: mockUseLatestMarketPage,
}));

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
