import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useArchiveListMock = vi.fn();

vi.mock('@/lib/query-hooks', () => ({
  useArchiveList: (params: unknown, enabled?: boolean) =>
    useArchiveListMock(params, enabled),
}));

import { useAdjacentSnapshotDates } from './use-adjacent-snapshot-dates';

function mockRows(dates: string[]) {
  useArchiveListMock.mockReturnValue({
    data: { rows: dates.map((businessDate) => ({ businessDate })) },
    isLoading: false,
  });
}

describe('useAdjacentSnapshotDates', () => {
  it('returns the nearest existing dates on both sides', () => {
    mockRows(['2026-08-14', '2026-08-12', '2026-08-07']);

    const { result } = renderHook(() => useAdjacentSnapshotDates('2026-08-12'));

    expect(result.current.previous).toBe('2026-08-07');
    expect(result.current.next).toBe('2026-08-14');
  });

  it('returns null when no earlier snapshot exists', () => {
    mockRows(['2026-08-14', '2026-08-12']);

    const { result } = renderHook(() => useAdjacentSnapshotDates('2026-08-12'));

    expect(result.current.previous).toBeNull();
  });

  it('returns nulls while loading', () => {
    useArchiveListMock.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useAdjacentSnapshotDates('2026-08-12'));

    expect(result.current).toEqual({
      previous: null,
      next: null,
      isLoading: true,
    });
  });

  // Requirement: sending a user to a 404 is worse than a temporarily
  // unavailable control — a failed list query must not fabricate a guess.
  it('returns nulls when the underlying query has failed', () => {
    useArchiveListMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    const { result } = renderHook(() => useAdjacentSnapshotDates('2026-08-12'));

    expect(result.current).toEqual({
      previous: null,
      next: null,
      isLoading: false,
    });
  });

  // Requirement: the Latest route must not fire this query. React hooks
  // cannot be called conditionally, so callers gate it via `enabled` instead
  // of an early return — this asserts that flag reaches the underlying query.
  it('forwards `enabled` to the underlying archive-list query', () => {
    mockRows(['2026-08-14', '2026-08-12', '2026-08-07']);

    renderHook(() => useAdjacentSnapshotDates('2026-08-12', false));

    expect(useArchiveListMock).toHaveBeenCalledWith(expect.any(Object), false);
  });
});
