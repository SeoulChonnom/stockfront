import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import { ApiError } from '@/lib/api/client';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import type { BatchJobsParams } from './../lib/api/batch';
import type { AiRetryRunResponse } from './../lib/api/types';
import type { BatchRunRow } from './../lib/query-hooks';
import { BatchOperationsPage } from './batch-operations-page';

/**
 * `/ops/batches` (README §7-6/§7-7). Rewritten for Phase 6's full rebuild:
 * non-admin 403 gating with NO batch request issued, failure-first summary
 * tiles, real pagination, `?jobId=` deep link, list/detail INDEPENDENT
 * loading/error, and the ≤1180px column collapse. Trigger dialog lifecycle
 * (idle→pending→success/409/403/422/429/5xx/network, duplicate-submit
 * impossibility, input preservation) is covered in the colocated
 * `batch-operations/trigger-dialog.test.tsx` instead of here, since it's
 * independently unit-testable against a real `useStartBatchRunMutation` and
 * doesn't need this page's list/detail wiring around it.
 */

type BatchJobsQueryResult = {
  data:
    | {
        rows: BatchRunRow[];
        totalCount: number;
        counts: {
          successCount: number;
          partialCount: number;
          failedCount: number;
          avgDurationSeconds: number | null;
        };
      }
    | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
};

type BatchJobDetailQueryResult = {
  data: BatchRunRow | undefined;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
};

type RetryAiMutationResult = {
  data: AiRetryRunResponse | undefined;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  isSuccess: boolean;
  variables: { jobId: number } | undefined;
  mutate: (
    variables: { jobId: number },
    options?: { onSuccess?: (data: AiRetryRunResponse) => void }
  ) => void;
  reset: () => void;
};

const {
  mockUseBatchJobs,
  mockUseBatchJobDetail,
  mockUseRetryAiMutation,
  mockUseStartBatchRunMutation,
} = vi.hoisted(() => ({
  mockUseBatchJobs: vi.fn<(params: BatchJobsParams) => BatchJobsQueryResult>(),
  mockUseBatchJobDetail:
    vi.fn<(jobId: number | null) => BatchJobDetailQueryResult>(),
  mockUseRetryAiMutation: vi.fn<() => RetryAiMutationResult>(),
  mockUseStartBatchRunMutation: vi.fn(),
}));

vi.mock('@/lib/query-hooks', () => ({
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useRetryAiMutation: mockUseRetryAiMutation,
  useStartBatchRunMutation: mockUseStartBatchRunMutation,
}));

function createRow(overrides: Partial<BatchRunRow> = {}): BatchRunRow {
  return {
    id: 101,
    jobName: 'market_daily_batch',
    jobType: 'MARKET_SNAPSHOT',
    currentStep: '페이지 스냅샷',
    market: 'N/A',
    businessDate: '2026-07-26',
    status: 'SUCCESS',
    rawStatus: 'SUCCESS',
    startedAt: '06:10:00',
    finishedAt: '06:12:15',
    duration: '2m 15s',
    counts: '174 / 114 / 21',
    detail: 'market_daily_batch 배치가 SUCCESS 상태로 기록되었습니다.',
    pageVersion: 'v3',
    pageId: 501,
    errorCode: null,
    errorMessage: null,
    logSummary: null,
    forceRun: false,
    rebuildPageOnly: false,
    steps: [],
    ...overrides,
  };
}

function jobsReady(
  overrides: Partial<NonNullable<BatchJobsQueryResult['data']>> = {},
  queryOverrides: Partial<BatchJobsQueryResult> = {}
): BatchJobsQueryResult {
  return {
    data: {
      rows: [createRow()],
      totalCount: 1,
      counts: {
        successCount: 1,
        partialCount: 0,
        failedCount: 0,
        avgDurationSeconds: 135,
      },
      ...overrides,
    },
    error: null,
    isLoading: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
    ...queryOverrides,
  };
}

function detailReady(run: BatchRunRow | undefined): BatchJobDetailQueryResult {
  return {
    data: run,
    error: null,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  };
}

function detailLoading(): BatchJobDetailQueryResult {
  return {
    data: undefined,
    error: null,
    isLoading: true,
    isError: false,
    isFetching: true,
    refetch: vi.fn(),
  };
}

function retryAiReady(
  overrides: Partial<RetryAiMutationResult> = {}
): RetryAiMutationResult {
  return {
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
    variables: undefined,
    mutate: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function renderPage(searchParams = new URLSearchParams()) {
  return render(
    <AnnounceProvider pathname='/test'>
      <BatchOperationsPage searchParams={searchParams} />
    </AnnounceProvider>
  );
}

beforeEach(() => {
  // Reset role BEFORE each test (not after) so it happens once the previous
  // test's RTL cleanup/unmount has unconditionally already run (guaranteed
  // by the test runner's lifecycle) — resetting in `afterEach` risks
  // `setRoleOverride`'s `notifyListeners()` reactively re-rendering a
  // still-mounted tree from the JUST-finished test with this file's mocks
  // already `.mockReset()` for the NEXT test, i.e. returning `undefined`.
  resetRoleOverrideForTesting();
  mockUseBatchJobs.mockReset();
  mockUseBatchJobDetail.mockReset();
  mockUseRetryAiMutation.mockReset();
  mockUseStartBatchRunMutation.mockReset();
  mockUseRetryAiMutation.mockReturnValue(retryAiReady());
  mockUseStartBatchRunMutation.mockReturnValue({
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    mutate: vi.fn(),
    reset: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('BatchOperationsPage — non-admin user (§10, §16-11)', () => {
  beforeEach(() => {
    setRoleOverride('user');
  });

  it('renders only the 403 PermissionState and issues no batch request', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '이 화면에 접근할 권한이 없습니다',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('403 · FORBIDDEN')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '최신 브리프로 이동' })
    ).toBeInTheDocument();

    expect(mockUseBatchJobs).not.toHaveBeenCalled();
    expect(mockUseBatchJobDetail).not.toHaveBeenCalled();
    expect(mockUseStartBatchRunMutation).not.toHaveBeenCalled();
  });

  it('never renders the trigger button, log box, or detail/summary nodes — not merely hidden', () => {
    const { container } = renderPage();

    // Note: PermissionState's OWN explanatory copy legitimately contains the
    // substring "수동 실행" ("...파이프라인 로그와 수동 실행을 포함하므로...") —
    // the requirement is that the TRIGGER BUTTON/list/detail nodes don't
    // exist, not that the two words never co-occur in prose, so this
    // asserts absence by role/heading rather than raw substring search.
    expect(
      screen.queryByRole('button', { name: '수동 실행' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '실행 이력' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('파이프라인 단계')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain('실행 이력');
  });
});

describe('BatchOperationsPage — admin', () => {
  beforeEach(() => {
    setRoleOverride('admin');
  });

  it('renders the header, and passes page/status/jobType/size through to the batch query', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(
      new URLSearchParams('page=2&status=FAILED&type=MARKET_SNAPSHOT')
    );

    expect(
      screen.getByRole('heading', { level: 1, name: '배치 운영' })
    ).toBeInTheDocument();
    expect(mockUseBatchJobs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        status: 'FAILED',
        jobType: 'MARKET_SNAPSHOT',
        size: 20,
      })
    );
  });

  it('shows the relative last-updated time in the history header', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T03:00:00Z'));
    mockUseBatchJobs.mockReturnValue(
      jobsReady({}, { dataUpdatedAt: Date.parse('2026-08-07T02:58:00Z') })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    expect(screen.getByText('마지막 갱신 2분 전')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('refreshes the history from an accessible button and disables it while fetching', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mockUseBatchJobs.mockReturnValue(
      jobsReady({}, { refetch, isFetching: false })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    const { rerender } = renderPage();

    const refreshButton = screen.getByRole('button', {
      name: '실행 이력 새로고침',
    });
    expect(refreshButton).toBeEnabled();

    await user.click(refreshButton);

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      '다시 불러오는 중입니다.'
    );

    mockUseBatchJobs.mockReturnValue(
      jobsReady({}, { refetch, isFetching: true })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams()} />
      </AnnounceProvider>
    );

    expect(
      screen.getByRole('button', { name: '실행 이력 새로고침' })
    ).toBeDisabled();
  });

  it('does not announce a background refetch', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady({}, { isFetching: true }));
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      ''
    );
  });

  it('an unknown/invalid ?type= value is ignored (falls back to 전체 타입, jobType omitted from the query)', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(new URLSearchParams('type=NOT_A_REAL_TYPE'));

    expect(mockUseBatchJobs).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobType: undefined })
    );
    expect(
      screen.getByText(/적용됨 · .* · 전체 상태 · 전체 타입/)
    ).toBeInTheDocument();
  });

  it('조회 조건 카드에서 조회를 제출하면 page=1로, jobType을 포함해 URL이 갱신된다', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(new URLSearchParams('page=3'));

    const typeSelect = screen.getByLabelText('배치 타입');
    await user.selectOptions(typeSelect, 'NEWS_COLLECTION');
    await user.click(screen.getByRole('button', { name: '조회' }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get('type')).toBe('NEWS_COLLECTION');
    expect(params.get('page')).toBe('1');
  });

  it('조회 조건 카드에서 초기화를 누르면 bare `/ops/batches`로 이동한다 (jobId/view/type 모두 해제)', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(
      new URLSearchParams('type=MARKET_SNAPSHOT&jobId=101&view=detail')
    );

    await user.click(screen.getByRole('button', { name: '초기화' }));

    expect(window.location.pathname).toBe('/ops/batches');
    expect(window.location.search).toBe('');
  });

  it('renders the 3 summary tiles in failure-first order (실패 → 부분 실패 → 성공)', () => {
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        counts: {
          successCount: 20,
          partialCount: 4,
          failedCount: 3,
          avgDurationSeconds: 190,
        },
      })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    const group = screen.getByRole('group', { name: '배치 실행 요약' });
    const labels = within(group)
      .getAllByText(/^(실패|부분 실패|성공)$/)
      .map((el) => el.textContent);

    expect(labels).toEqual(['실패', '부분 실패', '성공']);
    expect(within(group).getByText('3')).toBeInTheDocument();
    expect(within(group).getByText('4')).toBeInTheDocument();
    expect(within(group).getByText('20')).toBeInTheDocument();
    expect(within(group).getByText(/평균 소요/)).toHaveTextContent('3분 10초');
  });

  it('shows the 주의 배너 only when failed+partial > 0, and quick filters set status+page=1', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        counts: {
          successCount: 20,
          partialCount: 2,
          failedCount: 1,
          avgDurationSeconds: 190,
        },
      })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(new URLSearchParams('page=3'));

    expect(
      screen.getByText('1건 실패, 2건 부분 실패 — 확인이 필요합니다.')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '실패만 보기' }));

    // from/to are preserved (today-relative defaults, not asserted
    // verbatim); status+page=1 is what this quick filter is responsible for
    // (README §7-6 point 3).
    const params = new URLSearchParams(window.location.search);
    expect(params.get('status')).toBe('FAILED');
    expect(params.get('page')).toBe('1');
  });

  it('pagination reflects the page query param and paging updates the URL', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        rows: [createRow({ id: 900 })],
        totalCount: 27,
      })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow({ id: 900 })));

    renderPage(new URLSearchParams('page=2'));

    // E7 (parity cycle 2): design's ops pager has no trailing "N / M"
    // indicator (unlike Archive's) — the range lives in the list header
    // instead ("1–20 / 27", already covered by other tests in this file).
    expect(screen.getByText('21–27 / 27')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '1' }));

    expect(new URLSearchParams(window.location.search).get('page')).toBe('1');
  });

  it('?jobId= deep link selects that row and drives the detail panel', () => {
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        rows: [
          createRow({ id: 101 }),
          createRow({ id: 202, businessDate: '2026-07-25' }),
        ],
      })
    );
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ id: 202, businessDate: '2026-07-25' }))
    );

    renderPage(new URLSearchParams('jobId=202'));

    expect(mockUseBatchJobDetail).toHaveBeenLastCalledWith(202);
    const selectButton = screen.getByRole('button', {
      name: 'job 202 상세 선택',
    });
    expect(selectButton.closest('tr')).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('heading', { level: 2, name: 'job 202' })
    ).toBeInTheDocument();
  });

  it('clicking anywhere in a row (not just the 기준일 button) selects that job', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        rows: [
          createRow({ id: 101 }),
          createRow({ id: 202, businessDate: '2026-07-25' }),
        ],
      })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow({ id: 101 })));

    renderPage();

    const targetRow = screen
      .getByRole('button', { name: 'job 202 상세 선택' })
      .closest('tr') as HTMLTableRowElement;

    // 기준일 버튼이 아닌, 같은 행의 소요 시간 셀을 클릭한다.
    await user.click(within(targetRow).getByText('2m 15s'));

    const params = new URLSearchParams(window.location.search);
    expect(params.get('jobId')).toBe('202');
    expect(params.get('view')).toBe('detail');
  });

  it('keeps desktop selection in master-detail without adding view=detail to the URL', async () => {
    const user = userEvent.setup();
    const innerWidthSpy = vi
      .spyOn(window, 'innerWidth', 'get')
      .mockReturnValue(1440);
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        rows: [createRow({ id: 101 }), createRow({ id: 202 })],
      })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow({ id: 101 })));

    renderPage();
    await user.click(screen.getByRole('button', { name: 'job 202 상세 선택' }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get('jobId')).toBe('202');
    expect(params.get('view')).toBeNull();
    innerWidthSpy.mockRestore();
  });

  it('moves focus to the detail heading on drill-in and restores the selected row on return', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(
      jobsReady({
        rows: [
          createRow({ id: 101 }),
          createRow({ id: 202, businessDate: '2026-07-25' }),
        ],
      })
    );
    mockUseBatchJobDetail.mockImplementation((jobId) =>
      detailReady(
        createRow({
          id: jobId ?? 101,
          businessDate: jobId === 202 ? '2026-07-25' : '2026-07-26',
        })
      )
    );

    const { rerender } = renderPage();
    await user.click(screen.getByRole('button', { name: 'job 202 상세 선택' }));

    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage
          searchParams={new URLSearchParams('jobId=202&view=detail')}
        />
      </AnnounceProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'job 202' })
      ).toHaveFocus();
    });

    await user.click(screen.getByRole('button', { name: '목록' }));
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'job 202 상세 선택' })
      ).toHaveFocus();
    });
  });

  it('list error keeps filters and the previous selection, while detail keeps working', () => {
    mockUseBatchJobs.mockReturnValue({
      data: undefined,
      error: new Error('boom'),
      isLoading: false,
      isError: true,
      isFetching: false,
      dataUpdatedAt: 0,
      refetch: vi.fn(),
    });
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow({ id: 202 })));

    renderPage(new URLSearchParams('jobId=202&status=FAILED'));

    expect(
      screen.getByText(
        '배치 목록을 불러오지 못했습니다. 필터와 이전 선택은 그대로 유지됩니다.'
      )
    ).toBeInTheDocument();
    // E3: the applied status (+ type) filter is shown as plain muted text in
    // the list header ("· <status label> · <type label>", always present)
    // rather than a `<select>` value — the actual filter FORM now lives in
    // the "조회 조건" card above (`batch-filters.tsx`), covered separately
    // in `batch-filters.test.tsx`.
    expect(
      screen.getByText('· FAILED · 생성 실패 · 전체 타입')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'job 202' })
    ).toBeInTheDocument();
  });

  it('실행 이력 헤더의 필터 해제는 status와 type을 모두 해제하고 announce한다 (design v2 2055행)', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(new URLSearchParams('status=FAILED&type=MARKET_SNAPSHOT'));

    const liveRegion = document.querySelector('[aria-live="polite"]');
    await user.click(screen.getByRole('button', { name: '필터 해제' }));

    const params = new URLSearchParams(window.location.search);
    // Empty string values are omitted from the querystring entirely (see
    // `buildUrl`'s `buildSearchParams`), so a cleared filter reads back as
    // an absent param, not an empty one.
    expect(params.get('status')).toBeNull();
    expect(params.get('type')).toBeNull();
    expect(params.get('page')).toBe('1');
    expect(liveRegion?.textContent).toBe('상태와 타입 조건을 해제했습니다.');
  });

  it('빈 상태의 필터 해제는 해제할 조건이 없으면 announce하지 않는다', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady({ rows: [], totalCount: 0 }));
    mockUseBatchJobDetail.mockReturnValue(detailReady(undefined));

    // status/type 없는 기본 URL — 빈 상태의 필터 해제 버튼은 프로토타입과
    // 동일하게 무조건 렌더되지만, 실제로 해제할 조건이 없으므로 "해제했습니다"
    // 라고 알리면 일어나지 않은 상태 변화를 announce하는 셈이 된다.
    renderPage(new URLSearchParams());

    const liveRegion = document.querySelector('[aria-live="polite"]');
    await user.click(screen.getByRole('button', { name: '필터 해제' }));

    expect(liveRegion?.textContent ?? '').toBe('');
  });

  it('detail error keeps the list working and offers 상세 다시 시도', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue({
      data: undefined,
      error: new Error('boom'),
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('실행 이력')).toBeInTheDocument();
    expect(
      screen.getByText('이 작업의 상세를 불러오지 못했습니다')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '상세 다시 시도' })
    ).toBeInTheDocument();
  });

  it('≤1180px collapse keeps 원문/정제/이슈 counts present as a first-cell subline', () => {
    mockUseBatchJobs.mockReturnValue(
      jobsReady({ rows: [createRow({ counts: '174 / 114 / 21' })] })
    );
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    // Rendered unconditionally (visibility is CSS-media-query-driven, not
    // `display:none` removal), so the value must exist in the DOM
    // regardless of the jsdom viewport width used to run this test.
    expect(
      screen.getByText('원문/정제/이슈 174 / 114 / 21')
    ).toBeInTheDocument();
  });

  it('renders NEWS_COLLECTION list/detail behavior without snapshot-only fields', () => {
    const newsRun = createRow({
      id: 201,
      jobType: 'NEWS_COLLECTION',
      currentStep: 'collect_news',
      rawStatus: 'RUNNING',
      status: 'RUNNING',
      pageId: null,
      pageVersion: '-',
      // PipelineStages renders `run.steps` verbatim from the detail API; it
      // no longer infers a stage list from `jobType`.
      steps: [
        {
          stepCode: 'COLLECT_NEWS',
          label: '뉴스 수집',
          status: 'RUNNING',
          duration: '-',
        },
      ],
    });
    mockUseBatchJobs.mockReturnValue(jobsReady({ rows: [], totalCount: 0 }));
    mockUseBatchJobDetail.mockReturnValue(detailReady(newsRun));

    renderPage(new URLSearchParams('jobId=201'));

    expect(screen.getAllByText('검색 결과 저장')).not.toHaveLength(0);
    expect(screen.getByText('스냅샷 대상 아님')).toBeInTheDocument();
    expect(screen.getByText('뉴스 수집').closest('li')).toHaveTextContent(
      '실행 중'
    );
    expect(screen.queryByText('174 / 114 / 21')).not.toBeInTheDocument();
    expect(screen.queryByText('실행 옵션')).not.toBeInTheDocument();
  });

  it('preserves an unknown type but does not treat it as MARKET_SNAPSHOT', () => {
    const unknownRun = createRow({
      id: 303,
      jobType: 'SOME_FUTURE_TYPE',
      currentStep: null,
      rawStatus: 'FAILED',
      status: 'FAILED',
      pageId: null,
      pageVersion: '-',
      detail: '',
      // No step history for this job (e.g. an old job); PipelineStages is
      // jobType-agnostic and must still render its heading plus the honest
      // empty state, never an invented stage list keyed off jobType.
      steps: [],
    });
    mockUseBatchJobs.mockReturnValue(jobsReady({ rows: [], totalCount: 0 }));
    mockUseBatchJobDetail.mockReturnValue(detailReady(unknownRun));

    renderPage(new URLSearchParams('jobId=303'));

    expect(screen.getByText('SOME_FUTURE_TYPE')).toBeInTheDocument();
    expect(screen.getByText('스냅샷 정보 확인 불가')).toBeInTheDocument();
    expect(screen.queryByText('174 / 114 / 21')).not.toBeInTheDocument();
    expect(screen.queryByText('실행 옵션')).not.toBeInTheDocument();
    expect(screen.getByText('파이프라인 단계')).toBeInTheDocument();
    expect(screen.getByText('스텝 실행 이력이 없습니다.')).toBeInTheDocument();
    expect(
      screen.queryByText('2026-07-26 시장 스냅샷이 생성되지 않았습니다.')
    ).not.toBeInTheDocument();
  });

  it('opens the Manual Trigger dialog from the header button', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    await user.click(screen.getByRole('button', { name: '수동 실행' }));

    expect(
      screen.getByRole('dialog', { name: '배치 수동 실행' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기준일 (KST)')).toBeInTheDocument();
  });

  it('shows AI 요약만 재시도 only for a selected PARTIAL job', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
    );

    const { rerender } = renderPage();

    expect(
      screen.getByRole('button', { name: 'AI 요약만 재시도' })
    ).toBeInTheDocument();

    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'SUCCESS', status: 'SUCCESS' }))
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams()} />
      </AnnounceProvider>
    );

    expect(
      screen.queryByRole('button', { name: 'AI 요약만 재시도' })
    ).not.toBeInTheDocument();
  });

  it('requires ops.trigger and never exposes AI retry to a non-admin capability set', () => {
    setRoleOverride('user');
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
    );

    renderPage();

    expect(
      screen.queryByRole('button', { name: 'AI 요약만 재시도' })
    ).not.toBeInTheDocument();
    expect(mockUseRetryAiMutation).not.toHaveBeenCalled();
  });

  it('disables repeated activation while pending and announces one request', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    const retryMutation = retryAiReady({ mutate });
    mockUseRetryAiMutation.mockReturnValue(retryMutation);
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
    );

    const { rerender } = renderPage();
    const button = screen.getByRole('button', { name: 'AI 요약만 재시도' });
    await user.click(button);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ jobId: 101 }, expect.anything());
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'AI 요약 재시도를 요청하고 있습니다.'
    );

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({ isPending: true, mutate, variables: { jobId: 101 } })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams()} />
      </AnnounceProvider>
    );

    const pendingButton = screen.getByRole('button', {
      name: 'AI 요약만 재시도',
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('announces accepted success without adding a second live region', async () => {
    const user = userEvent.setup();
    const response: AiRetryRunResponse = {
      jobId: 1043,
      jobName: 'market_snapshot_ai_retry',
      businessDate: '2026-07-26',
      status: 'RUNNING',
      runMode: 'AI_SUMMARY_RETRY',
      sourceJobId: 101,
      sourcePageId: 501,
      idempotencyKey: 'retry-key-1',
      startedAt: '2026-08-07T08:24:31Z',
    };
    const mutate = vi.fn(
      (
        _variables: { jobId: number },
        options?: { onSuccess?: (data: AiRetryRunResponse) => void }
      ) => options?.onSuccess?.(response)
    );
    mockUseRetryAiMutation.mockReturnValue(retryAiReady({ mutate }));
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
    );

    renderPage();
    await user.click(screen.getByRole('button', { name: 'AI 요약만 재시도' }));

    expect(document.querySelectorAll('[aria-live]').length).toBe(1);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'AI 요약 재시도가 접수되었습니다.'
    );
  });

  it('exposes API conflicts in an accessible alert without duplicate polite noise', () => {
    const conflict = new ApiError('conflict', 409, {
      error: {
        code: 'AI_RETRY_IN_PROGRESS',
        message: 'AI 요약 재시도가 이미 진행 중입니다.',
      },
    });
    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        error: conflict,
        isError: true,
        variables: { jobId: 101 },
      })
    );
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(createRow({ rawStatus: 'PARTIAL', status: 'PARTIAL' }))
    );

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'AI 요약 재시도가 이미 진행 중입니다.'
    );
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      ''
    );
  });

  it('does not carry job A retry feedback or pending state into selected job B', async () => {
    const user = userEvent.setup();
    const response: AiRetryRunResponse = {
      jobId: 1043,
      jobName: 'market_snapshot_ai_retry',
      businessDate: '2026-07-26',
      status: 'RUNNING',
      runMode: 'AI_SUMMARY_RETRY',
      sourceJobId: 101,
      sourcePageId: 501,
      idempotencyKey: 'retry-key-a',
      startedAt: '2026-08-07T08:24:31Z',
    };
    let settleA: (() => void) | undefined;
    const mutate = vi.fn(
      (
        _variables: { jobId: number },
        options?: { onSuccess?: (data: AiRetryRunResponse) => void }
      ) => {
        settleA = () => options?.onSuccess?.(response);
      }
    );
    mockUseRetryAiMutation.mockReturnValue(retryAiReady({ mutate }));
    mockUseBatchJobs.mockReturnValue(
      jobsReady({ rows: [createRow({ id: 101 }), createRow({ id: 202 })] })
    );
    mockUseBatchJobDetail.mockImplementation((jobId) =>
      detailReady(
        createRow({
          id: jobId ?? 101,
          rawStatus: 'PARTIAL',
          status: 'PARTIAL',
        })
      )
    );

    const { rerender } = renderPage(new URLSearchParams('jobId=101'));
    await user.click(screen.getByRole('button', { name: 'AI 요약만 재시도' }));

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        isPending: true,
        mutate,
        variables: { jobId: 101 },
      })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    expect(
      screen.getByRole('button', { name: 'AI 요약만 재시도' })
    ).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('AI 요약 재시도가 접수되었습니다.')
    ).not.toBeInTheDocument();

    act(() => {
      settleA?.();
    });
    expect(
      document.querySelector('[aria-live="polite"]')
    ).not.toHaveTextContent('AI 요약 재시도가 접수되었습니다.');

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        data: response,
        isSuccess: true,
        mutate,
        variables: { jobId: 101 },
      })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('AI 요약 재시도가 접수되었습니다.')
    ).not.toBeInTheDocument();

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        error: new Error('job A failed'),
        isError: true,
        mutate,
        variables: { jobId: 101 },
      })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('suppresses a late job A success when uncached job B unmounts the detail content', async () => {
    const user = userEvent.setup();
    const response: AiRetryRunResponse = {
      jobId: 1043,
      jobName: 'market_snapshot_ai_retry',
      businessDate: '2026-07-26',
      status: 'RUNNING',
      runMode: 'AI_SUMMARY_RETRY',
      sourceJobId: 101,
      sourcePageId: 501,
      idempotencyKey: 'retry-key-a',
      startedAt: '2026-08-07T08:24:31Z',
    };
    let settleA: (() => void) | undefined;
    const mutate = vi.fn(
      (
        _variables: { jobId: number },
        options?: { onSuccess?: (data: AiRetryRunResponse) => void }
      ) => {
        settleA = () => options?.onSuccess?.(response);
      }
    );
    mockUseRetryAiMutation.mockReturnValue(retryAiReady({ mutate }));
    mockUseBatchJobs.mockReturnValue(
      jobsReady({ rows: [createRow({ id: 101 }), createRow({ id: 202 })] })
    );
    mockUseBatchJobDetail.mockImplementation((jobId) =>
      jobId === 101
        ? detailReady(
            createRow({ id: 101, rawStatus: 'PARTIAL', status: 'PARTIAL' })
          )
        : detailLoading()
    );

    const { rerender } = renderPage(new URLSearchParams('jobId=101'));
    await user.click(screen.getByRole('button', { name: 'AI 요약만 재시도' }));

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        isPending: true,
        mutate,
        variables: { jobId: 101 },
      })
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      settleA?.();
    });
    expect(
      document.querySelector('[aria-live="polite"]')
    ).not.toHaveTextContent('AI 요약 재시도가 접수되었습니다.');

    mockUseRetryAiMutation.mockReturnValue(
      retryAiReady({
        data: response,
        isSuccess: true,
        mutate,
        variables: { jobId: 101 },
      })
    );
    mockUseBatchJobDetail.mockReturnValue(
      detailReady(
        createRow({ id: 202, rawStatus: 'PARTIAL', status: 'PARTIAL' })
      )
    );
    rerender(
      <AnnounceProvider pathname='/test'>
        <BatchOperationsPage searchParams={new URLSearchParams('jobId=202')} />
      </AnnounceProvider>
    );

    expect(
      screen.getByRole('button', { name: 'AI 요약만 재시도' })
    ).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('AI 요약 재시도가 접수되었습니다.')
    ).not.toBeInTheDocument();
  });
});
