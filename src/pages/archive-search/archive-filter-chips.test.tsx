import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ThemeNodeResponse } from '@/lib/api/types';

import { ArchiveFilterChips } from '@/pages/archive-search/archive-filter-chips';

const catalog = [
  {
    code: 'SECTOR',
    label: '업종',
    description: '기업의 주요 사업 영역',
    children: [],
  },
] satisfies ThemeNodeResponse[];

const baseApplied = {
  from: '2026-07-13',
  to: '2026-07-27',
  status: '',
  market: '',
  themes: [],
  q: '',
};

function renderChips(
  overrides: Partial<ComponentProps<typeof ArchiveFilterChips>> = {}
) {
  const handlers = {
    onRemoveStatus: vi.fn(),
    onRemoveMarket: vi.fn(),
    onRemoveTheme: vi.fn(),
    onRemoveQuery: vi.fn(),
    onResetAll: vi.fn(),
  };
  const utils = render(
    <ArchiveFilterChips
      applied={baseApplied}
      themeCatalog={catalog}
      {...handlers}
      {...overrides}
    />
  );
  return { ...utils, ...handlers };
}

describe('ArchiveFilterChips', () => {
  it('always shows the date range chip with no remove button', () => {
    renderChips();

    expect(screen.getByText('2026-07-13 ~ 2026-07-27')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /필터 해제/ })
    ).not.toBeInTheDocument();
  });

  it('renders only the removable chips whose filter is set', () => {
    renderChips({
      applied: {
        ...baseApplied,
        status: 'READY',
        market: 'KR',
        themes: ['SECTOR'],
        q: '반도체',
      },
    });

    expect(screen.getByText('준비 완료')).toBeInTheDocument();
    expect(screen.getByText('시장 한국')).toBeInTheDocument();
    expect(screen.getByText('테마 업종')).toBeInTheDocument();
    expect(screen.getByText('검색어 "반도체"')).toBeInTheDocument();
  });

  it('renders an applied KR market as 시장 한국, with the remove button accessible name matching', async () => {
    const user = userEvent.setup();
    const { onRemoveMarket } = renderChips({
      applied: { ...baseApplied, market: 'KR' },
    });

    expect(screen.getByText('시장 한국')).toBeInTheDocument();
    expect(screen.queryByText(/시장 KR/)).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '시장 한국 필터 해제' })
    );
    expect(onRemoveMarket).toHaveBeenCalledTimes(1);
  });

  it('omits removable chips for unset filters', () => {
    renderChips();

    expect(screen.queryByText(/시장 /)).not.toBeInTheDocument();
    expect(screen.queryByText(/테마 /)).not.toBeInTheDocument();
    expect(screen.queryByText(/검색어/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '전체 해제' })
    ).not.toBeInTheDocument();
  });

  it('falls back to the raw theme code when the catalog has not resolved it', () => {
    renderChips({
      applied: { ...baseApplied, themes: ['UNKNOWN_CODE'] },
      themeCatalog: [],
    });

    expect(screen.getByText('테마 UNKNOWN_CODE')).toBeInTheDocument();
  });

  it('clicking each remove button fires the matching callback with the right argument', async () => {
    const user = userEvent.setup();
    const { onRemoveStatus, onRemoveMarket, onRemoveTheme, onRemoveQuery } =
      renderChips({
        applied: {
          ...baseApplied,
          status: 'PARTIAL',
          market: 'US',
          themes: ['SECTOR'],
          q: 'rate',
        },
      });

    await user.click(
      screen.getByRole('button', { name: '부분 생성 필터 해제' })
    );
    expect(onRemoveStatus).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: '시장 미국 필터 해제' })
    );
    expect(onRemoveMarket).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: '테마 업종 필터 해제' })
    );
    expect(onRemoveTheme).toHaveBeenCalledWith('SECTOR');

    await user.click(screen.getByRole('button', { name: '검색어 필터 해제' }));
    expect(onRemoveQuery).toHaveBeenCalledTimes(1);
  });

  it('shows 전체 해제 only when at least one removable chip exists', async () => {
    const user = userEvent.setup();
    const { onResetAll } = renderChips({
      applied: { ...baseApplied, market: 'KR' },
    });

    const resetAll = screen.getByRole('button', { name: '전체 해제' });
    await user.click(resetAll);
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});
