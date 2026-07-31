import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceProvider } from '@/components/shell/announce-context';
import {
  resetRoleOverrideForTesting,
  setRoleOverride,
} from '@/lib/capabilities';

import type { BatchJobsParams } from './../lib/api/batch';
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

const {
  mockUseBatchJobs,
  mockUseBatchJobDetail,
  mockUseStartBatchRunMutation,
} = vi.hoisted(() => ({
  mockUseBatchJobs: vi.fn<(params: BatchJobsParams) => BatchJobsQueryResult>(),
  mockUseBatchJobDetail:
    vi.fn<(jobId: number | null) => BatchJobDetailQueryResult>(),
  mockUseStartBatchRunMutation: vi.fn(),
}));

vi.mock('@/lib/query-hooks', () => ({
  useBatchJobs: mockUseBatchJobs,
  useBatchJobDetail: mockUseBatchJobDetail,
  useStartBatchRunMutation: mockUseStartBatchRunMutation,
}));

function createRow(overrides: Partial<BatchRunRow> = {}): BatchRunRow {
  return {
    id: 101,
    jobName: 'market_daily_batch',
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
    ...overrides,
  };
}

function jobsReady(
  overrides: Partial<NonNullable<BatchJobsQueryResult['data']>> = {}
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
    refetch: vi.fn(),
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
  mockUseStartBatchRunMutation.mockReset();
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

  it('renders the header, and passes page/status/size through to the batch query', () => {
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage(new URLSearchParams('page=2&status=FAILED'));

    expect(
      screen.getByRole('heading', { level: 1, name: '배치 운영' })
    ).toBeInTheDocument();
    expect(mockUseBatchJobs).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, status: 'FAILED', size: 20 })
    );
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

  it('list error keeps filters and the previous selection, while detail keeps working', () => {
    mockUseBatchJobs.mockReturnValue({
      data: undefined,
      error: new Error('boom'),
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow({ id: 202 })));

    renderPage(new URLSearchParams('jobId=202&status=FAILED'));

    expect(
      screen.getByText(
        '배치 목록을 불러오지 못했습니다. 필터와 이전 선택은 그대로 유지됩니다.'
      )
    ).toBeInTheDocument();
    // E1: the 시작일/종료일/상태 filter form is gone — the applied status
    // filter is now shown as plain muted text in the list header (E3: always
    // present, "· <label>") instead of a `<select>` value.
    expect(screen.getByText('· FAILED · 생성 실패')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'job 202' })
    ).toBeInTheDocument();
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

  it('opens the Manual Trigger dialog from the header button', async () => {
    const user = userEvent.setup();
    mockUseBatchJobs.mockReturnValue(jobsReady());
    mockUseBatchJobDetail.mockReturnValue(detailReady(createRow()));

    renderPage();

    await user.click(screen.getByRole('button', { name: '수동 실행' }));

    expect(
      screen.getByRole('dialog', { name: '수동 실행' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기준일 (KST)')).toBeInTheDocument();
  });
});
