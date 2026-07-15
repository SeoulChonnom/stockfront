import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ArchiveListParams } from '../lib/api/archive';
import { ArchiveSearchPage } from './archive-search-page';

type ArchiveListQueryResult = {
  data: {
    page: number;
    rows: Array<unknown>;
    totalCount: number;
    totalPages: number;
  };
  error: null;
  isLoading: boolean;
};

const { mockUseArchiveList } = vi.hoisted(() => ({
  mockUseArchiveList: vi.fn<(
    params: ArchiveListParams
  ) => ArchiveListQueryResult>(),
}));

vi.mock('../lib/query-hooks', () => ({
  useArchiveList: mockUseArchiveList,
}));

describe('ArchiveSearchPage', () => {
  it('removes statuses unsupported by archive search before querying', () => {
    mockUseArchiveList.mockReturnValue({
      data: {
        page: 1,
        rows: [],
        totalCount: 0,
        totalPages: 1,
      },
      error: null,
      isLoading: false,
    });

    render(
      <ArchiveSearchPage searchParams={new URLSearchParams('status=SUCCESS')} />
    );

    const archiveQuery = mockUseArchiveList.mock.calls.at(-1)?.[0];

    expect(archiveQuery).toBeDefined();
    expect(archiveQuery).toMatchObject({
      status: undefined,
      page: 1,
      size: 4,
    });
    expect(typeof archiveQuery?.fromDate).toBe('string');
    expect(typeof archiveQuery?.toDate).toBe('string');
    expect(screen.getByText('Archive Search')).toBeInTheDocument();
  });
});
