import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useNavigationMock = vi.fn();

vi.mock('@/lib/query-hooks', () => ({
  useNavigation: (businessDate: string, enabled?: boolean) =>
    useNavigationMock(businessDate, enabled),
}));

import { useAdjacentNavigation } from './use-adjacent-navigation';

describe('useAdjacentNavigation', () => {
  it('returns the resolved prev/next dates once the query succeeds', () => {
    useNavigationMock.mockReturnValue({
      data: {
        businessDate: '2026-08-13',
        pageExists: true,
        previousBusinessDate: '2026-08-12',
        nextBusinessDate: '2026-08-14',
      },
      status: 'success',
    });

    const { result } = renderHook(() => useAdjacentNavigation('2026-08-13'));

    expect(result.current).toEqual({
      status: 'ready',
      previousBusinessDate: '2026-08-12',
      nextBusinessDate: '2026-08-14',
    });
  });

  it('preserves a true null neighbour as null, not as loading/error', () => {
    useNavigationMock.mockReturnValue({
      data: {
        businessDate: '2026-08-13',
        pageExists: true,
        previousBusinessDate: null,
        nextBusinessDate: null,
      },
      status: 'success',
    });

    const { result } = renderHook(() => useAdjacentNavigation('2026-08-13'));

    expect(result.current).toEqual({
      status: 'ready',
      previousBusinessDate: null,
      nextBusinessDate: null,
    });
  });

  it('returns "loading" (not fabricated dates) while the query is pending', () => {
    useNavigationMock.mockReturnValue({ data: undefined, status: 'pending' });

    const { result } = renderHook(() => useAdjacentNavigation('2026-08-13'));

    expect(result.current).toEqual({ status: 'loading' });
  });

  // Requirement: sending a user to a dead end is worse than a temporarily
  // unavailable control — a failed lookup must not fabricate a guess.
  it('returns "error" (not fabricated dates) when the query fails', () => {
    useNavigationMock.mockReturnValue({ data: undefined, status: 'error' });

    const { result } = renderHook(() => useAdjacentNavigation('2026-08-13'));

    expect(result.current).toEqual({ status: 'error' });
  });

  // The Latest route (or any screen with a loaded page) must not fire this
  // query. React hooks cannot be called conditionally, so callers gate it
  // via `enabled` instead of an early return — this asserts the flag
  // reaches the underlying `useNavigation` query.
  it('forwards `enabled` to the underlying navigation query', () => {
    useNavigationMock.mockReturnValue({ data: undefined, status: 'pending' });

    renderHook(() => useAdjacentNavigation('2026-08-13', false));

    expect(useNavigationMock).toHaveBeenCalledWith('2026-08-13', false);
  });
});
