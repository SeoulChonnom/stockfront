import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArchiveModeBand } from './archive-mode-band';
import type { AdjacentNavigationState } from './use-adjacent-navigation';

const navigateMock = vi.fn();

vi.mock('@/lib/router', () => ({
  navigate: (to: string) => navigateMock(to),
}));

afterEach(() => {
  navigateMock.mockClear();
});

function renderBand(navigation: AdjacentNavigationState) {
  return render(
    <ArchiveModeBand
      businessDate='2026-03-17'
      filterQuery={null}
      navigation={navigation}
      pageId={501}
      versionNo={3}
    />
  );
}

describe('ArchiveModeBand — B-5 인접 영업일', () => {
  it('중간 날짜: both buttons enabled, labeled with the real dates, and navigate to them', async () => {
    const user = userEvent.setup();
    renderBand({
      status: 'ready',
      previousBusinessDate: '2026-03-16',
      nextBusinessDate: '2026-03-18',
    });

    const prevButton = screen.getByRole('button', { name: '이전 2026-03-16' });
    const nextButton = screen.getByRole('button', { name: '다음 2026-03-18' });
    expect(prevButton).toBeEnabled();
    expect(nextButton).toBeEnabled();

    await user.click(prevButton);
    expect(navigateMock).toHaveBeenCalledWith('/market/archive/2026-03-16');

    await user.click(nextButton);
    expect(navigateMock).toHaveBeenCalledWith('/market/archive/2026-03-18');
  });

  it('가장 오래된 날짜: prev is null -> only the prev button is disabled', () => {
    renderBand({
      status: 'ready',
      previousBusinessDate: null,
      nextBusinessDate: '2026-03-18',
    });

    expect(
      screen.getByRole('button', { name: '이전 브리프 없음' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 2026-03-18' })
    ).toBeEnabled();
  });

  it('최신 날짜: next is null -> only the next button is disabled', () => {
    renderBand({
      status: 'ready',
      previousBusinessDate: '2026-03-16',
      nextBusinessDate: null,
    });

    expect(
      screen.getByRole('button', { name: '이전 2026-03-16' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: '다음 브리프 없음' })
    ).toBeDisabled();
  });

  it('데이터 없음(양쪽 null): both buttons disabled', () => {
    renderBand({
      status: 'ready',
      previousBusinessDate: null,
      nextBusinessDate: null,
    });

    expect(
      screen.getByRole('button', { name: '이전 브리프 없음' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 브리프 없음' })
    ).toBeDisabled();
  });

  it('로딩: both buttons disabled and never guess a stale date', () => {
    renderBand({ status: 'loading' });

    expect(screen.getByRole('button', { name: '이전 확인 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 확인 중' })).toBeDisabled();
  });

  it('오류: both buttons disabled and never guess a stale date', () => {
    renderBand({ status: 'error' });

    expect(
      screen.getByRole('button', { name: '이전 확인 불가' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: '다음 확인 불가' })
    ).toBeDisabled();
  });
});
