import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';

import type { ArchiveListParams } from '../lib/api/archive';
import { ApiError } from '../lib/api/client';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '../lib/capabilities';
import { withBasePath } from '../lib/router';
import { ArchiveSearchPage } from './archive-search-page';

type ArchiveListQueryResult = {
  data:
    | {
        page: number;
        rows: Array<{
          pageId: number;
          businessDate: string;
          headline: string;
          status: 'READY' | 'PARTIAL' | 'FAILED';
          generatedAt: string;
          detail: string | null;
        }>;
        totalCount: number;
        totalPages: number;
      }
    | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
};

const { mockUseArchiveList } = vi.hoisted(() => ({
  mockUseArchiveList:
    vi.fn<(params: ArchiveListParams) => ArchiveListQueryResult>(),
}));

vi.mock('../lib/query-hooks', () => ({
  useArchiveList: mockUseArchiveList,
}));

// Deliberately distinct from the "글로벌 헤드라인" table column header text
// so `getByText` queries below unambiguously match the row's own content.
const baseRow = {
  pageId: 501,
  businessDate: '2026-07-26',
  headline: '샘플 헤드라인 문구',
  status: 'READY' as const,
  generatedAt: '2026-07-27 06:08 KST',
  detail: null,
};

// `userEvent.type` simulates keystrokes, which native `<input type="date">`
// elements don't reliably accept in jsdom — `fireEvent.change` sets
// `.value` directly and fires the same `change` event React's controlled
// `onChange` relies on.
function setDateValue(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

function ready(overrides: Partial<ArchiveListQueryResult['data']> = {}) {
  return {
    data: {
      page: 1,
      rows: [baseRow],
      totalCount: 1,
      totalPages: 1,
      ...overrides,
    },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

function renderPage(searchParams = new URLSearchParams()) {
  return render(
    <AnnounceProvider pathname='/test'>
      <ArchiveSearchPage searchParams={searchParams} />
    </AnnounceProvider>
  );
}

function getLiveRegionText() {
  return document.querySelector('[aria-live="polite"]')?.textContent ?? '';
}

afterEach(() => {
  // Unmount deterministically before touching shared state: resetting the
  // role override synchronously notifies `useCapabilities()` subscribers,
  // and if the page were still mounted when that fires, the `useArchiveList`
  // mock reset below would leave it returning `undefined` for that stray
  // re-render and throw. Explicit `cleanup()` guarantees the unmount
  // happens before either reset runs, regardless of hook registration order.
  cleanup();
  resetRoleOverrideForTesting();
  window.history.replaceState(null, '', '/');
  mockUseArchiveList.mockReset();
});

describe('ArchiveSearchPage', () => {
  it('passes normalized archive date ranges and the size=20 page contract to the archive query', () => {
    mockUseArchiveList.mockReturnValue(ready());

    renderPage(new URLSearchParams('from=2026-03-14&to=2026-03-01'));

    expect(mockUseArchiveList).toHaveBeenLastCalledWith({
      fromDate: '2026-03-01',
      toDate: '2026-03-14',
      status: undefined,
      page: 1,
      size: 20,
    });
  });

  it('removes statuses unsupported by archive search before querying', () => {
    mockUseArchiveList.mockReturnValue(ready());

    renderPage(new URLSearchParams('status=SUCCESS'));

    const archiveQuery = mockUseArchiveList.mock.calls.at(-1)?.[0];
    expect(archiveQuery).toMatchObject({
      status: undefined,
      page: 1,
      size: 20,
    });
    expect(
      screen.getByRole('heading', { level: 1, name: '아카이브' })
    ).toBeInTheDocument();
  });

  it('apply sets query params and resets to page=1, announcing the result count exactly once', async () => {
    const user = userEvent.setup();
    mockUseArchiveList.mockReturnValue(
      ready({ totalCount: 46, totalPages: 3 })
    );

    const { rerender } = renderPage(
      new URLSearchParams('from=2026-07-13&to=2026-07-27&page=2')
    );

    setDateValue(screen.getByLabelText('시작일'), '2026-07-10');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(window.location.pathname).toBe(
      withBasePath('/market/archive/search')
    );
    expect(window.location.search).toBe(
      '?from=2026-07-10&to=2026-07-27&page=1'
    );

    // `ArchiveSearchPage` reads `searchParams` from a prop, not from
    // `useUrlState()` directly (that's `App.tsx`'s job in the real app,
    // which re-renders this page with fresh props on every route change).
    // Rendered in isolation here, the just-navigated URL has to be handed
    // back in explicitly to simulate that re-render before the "apply
    // resolved" announce effect (keyed on the new `applied` filters) can
    // fire.
    rerender(
      <AnnounceProvider pathname='/test'>
        <ArchiveSearchPage
          searchParams={new URLSearchParams(window.location.search)}
        />
      </AnnounceProvider>
    );

    expect(getLiveRegionText()).toBe('검색 결과 46건을 찾았습니다.');
  });

  it('validation failure leaves the URL unchanged, marks the field invalid, and does not call navigate', async () => {
    const user = userEvent.setup();
    mockUseArchiveList.mockReturnValue(ready());

    renderPage(new URLSearchParams('from=2026-07-13&to=2026-07-27'));

    const toInput = screen.getByLabelText('종료일');
    setDateValue(toInput, '2099-01-01');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
    expect(toInput).toHaveAttribute('aria-invalid', 'true');
    expect(toInput).toHaveFocus();
  });

  it('reset navigates to the bare search URL so parseListFilters recomputes the default range', async () => {
    const user = userEvent.setup();
    mockUseArchiveList.mockReturnValue(ready());

    renderPage(
      new URLSearchParams('from=2026-01-01&to=2026-01-05&status=FAILED&page=2')
    );

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(window.location.pathname).toBe(
      withBasePath('/market/archive/search')
    );
    expect(window.location.search).toBe('');
  });

  it('pagination reflects the target page in the URL', async () => {
    const user = userEvent.setup();
    mockUseArchiveList.mockReturnValue(
      ready({ totalCount: 46, totalPages: 3 })
    );

    renderPage(new URLSearchParams('from=2026-07-13&to=2026-07-27'));

    await user.click(screen.getByRole('button', { name: '2' }));

    expect(window.location.search).toBe(
      '?from=2026-07-13&to=2026-07-27&page=2'
    );
  });

  it('loading keeps the filter card and previously loaded rows, and skips the full skeleton', () => {
    mockUseArchiveList.mockReturnValue(ready());
    const { rerender } = renderPage(new URLSearchParams());
    expect(screen.getByText('샘플 헤드라인 문구')).toBeInTheDocument();

    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    });
    rerender(
      <AnnounceProvider pathname='/test'>
        <ArchiveSearchPage searchParams={new URLSearchParams()} />
      </AnnounceProvider>
    );

    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
    expect(screen.getByText('샘플 헤드라인 문구')).toBeInTheDocument();
  });

  it('error keeps the filter card and previous results, and offers 다시 시도', () => {
    mockUseArchiveList.mockReturnValue(ready());
    const { rerender } = renderPage(new URLSearchParams());
    expect(screen.getByText('샘플 헤드라인 문구')).toBeInTheDocument();

    const refetch = vi.fn();
    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: new Error('network down'),
      isLoading: false,
      isFetching: false,
      refetch,
    });
    rerender(
      <AnnounceProvider pathname='/test'>
        <ArchiveSearchPage searchParams={new URLSearchParams()} />
      </AnnounceProvider>
    );

    expect(screen.getByLabelText('시작일')).toBeInTheDocument();
    expect(screen.getByText('샘플 헤드라인 문구')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    screen.getByRole('button', { name: '다시 시도' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('operator: renders the error title, HTTP code, message, and retry action for a 500 response', () => {
    const refetch = vi.fn();
    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: new ApiError('API request failed with status 500.', 500, null),
      isLoading: false,
      isFetching: false,
      refetch,
    });

    setRoleOverride('admin');
    renderPage(new URLSearchParams());

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('데이터를 불러오지 못했습니다');
    expect(alert).toHaveTextContent('500 · INTERNAL_ERROR');
    expect(alert).toHaveTextContent(
      '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    );
    expect(
      screen.getByRole('button', { name: '다시 시도' })
    ).toBeInTheDocument();
  });

  it('regular user: hides the HTTP code badge for the same 500 response', () => {
    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: new ApiError('API request failed with status 500.', 500, null),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    setRoleOverride('user');
    renderPage(new URLSearchParams());

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('데이터를 불러오지 못했습니다');
    expect(alert).not.toHaveTextContent('INTERNAL_ERROR');
    expect(alert).toHaveTextContent(
      '서버가 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    );
  });

  it('regular user: never shows the raw error.message or an HTTP code for a non-5xx request failure', () => {
    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: new ApiError(
        'batch pipeline provider threshold rejected the request',
        400,
        null
      ),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    setRoleOverride('user');
    renderPage(new URLSearchParams());

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('아카이브 요청을 처리하지 못했습니다');
    expect(alert).not.toHaveTextContent('REQUEST_FAILED');
    expect(alert).not.toHaveTextContent(
      'batch pipeline provider threshold rejected the request'
    );
  });

  it('uses the archive page label in request errors', () => {
    mockUseArchiveList.mockReturnValue({
      data: undefined,
      error: new ApiError('잘못된 요청입니다.', 400, null),
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    setRoleOverride('admin');
    renderPage(new URLSearchParams());

    expect(screen.getByRole('alert')).toHaveTextContent(
      '아카이브 요청을 처리하지 못했습니다'
    );
  });

  it('shows the empty-results state with a reset action when the query resolves with zero rows', () => {
    mockUseArchiveList.mockReturnValue(
      ready({ rows: [], totalCount: 0, totalPages: 1 })
    );

    renderPage(new URLSearchParams());

    expect(
      screen.getByText('조건에 맞는 스냅샷이 없습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '필터 초기화' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '선택한 기간에 생성된 브리프가 없거나, 상태 필터가 결과를 모두 제외했습니다. 기간을 넓히거나 상태 필터를 해제해 보세요.'
      )
    ).toBeInTheDocument();
  });
});
