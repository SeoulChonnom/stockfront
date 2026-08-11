import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Covers batch pagination, browser Back restoration for selection/scroll,
 * independent list/detail retries, and this screen's live regions.
 *
 * `BATCH_ALL` (mock-api.ts) seeds 27 business dates × 2 job types = 54 jobs,
 * interleaved newest-first. The list page size is 20, so the unfiltered list
 * has 3 pages. Tests that care which job is selected pass an explicit
 * `?jobId=` rather than relying on the first-row fallback.
 *
 * The batch screen intentionally has no 시작일/종료일/상태 filter form.
 * The UI changes `status` through the attention banner's 실패만 보기/부분
 * 실패만 보기 quick filters or clears it from the list header.
 */

test.describe('pagination (Batch: 54/20 -> 3 pages)', () => {
  test('paginates through all pages and reflects `page` in the URL', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches');

    // The item range lives only in the list header. Unlike Archive, Ops does
    // not duplicate it or add a trailing "N / M" beside the pager.
    await expect(page.getByText('1–20 / 54', { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+ \/ \d+$/)).not.toBeVisible();

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('21–40 / 54', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByText('41–54 / 54', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});

test.describe('browser Back (Batch jobId selection + scroll)', () => {
  test('Back restores the previous job selection', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches?jobId=1042');
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();

    await page.getByRole('button', { name: /job 1037 상세 선택/ }).click();
    await expect(page).toHaveURL(/jobId=1037/);
    await expect(page.getByRole('heading', { name: 'job 1037' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/jobId=1042/);
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();
  });

  test('Back restores scroll position', async ({ page, consoleGuard }) => {
    // Going Back immediately after the URL changes can cancel the detail
    // query before its response arrives. React Query forwards that expected
    // navigation cancellation through the request's AbortSignal.
    consoleGuard.allowFailedRequest(
      /GET .*\/stock\/api\/batch\/jobs\/1037 — net::ERR_ABORTED$/
    );

    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto('ops/batches');

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);

    await page.getByRole('button', { name: /job 1037 상세 선택/ }).click();
    await expect(page).toHaveURL(/jobId=1037/);

    await page.goBack();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(300);
  });
});

test.describe('Retry (Batch list/detail independence)', () => {
  test('a failing list refetch does not disturb the (unrelated-query) detail panel; retry recovers the list only', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches?jobId=1042');
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();

    let listShouldFail = true;
    consoleGuard.allowConsoleError(/Failed to load resource.*500/);
    await page.route(/\/stock\/api\/batch\/jobs(\?.*)?$/, async (route) => {
      if (!listShouldFail) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '서버가 요청을 처리하지 못했습니다.',
          },
        }),
      });
    });

    // The attention banner's quick filter navigates immediately (no
    // separate apply step) and keeps the current `jobId` in the URL
    // (goTo() only overrides `jobId` when explicitly asked to), so the
    // detail query key is untouched by this — the list failing is
    // independent of it. `BATCH_ALL`'s seed guarantees FAILED rows exist
    // (i%9===5), so the attention banner is showing. `exact: true` since
    // "실패만 보기" is otherwise a substring match of the sibling "부분 실패만
    // 보기" button too.
    await page
      .getByRole('button', { name: '실패만 보기', exact: true })
      .click();
    await expect(page).toHaveURL(/status=FAILED/);

    await expect(
      page.getByText('배치 목록을 불러오지 못했습니다')
    ).toBeVisible();
    // Detail panel: still job 1042, unaffected.
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();

    listShouldFail = false;
    await page.getByRole('button', { name: '목록 다시 시도' }).click();
    await expect(
      page.getByText('배치 목록을 불러오지 못했습니다')
    ).not.toBeVisible();
  });

  test('a failing detail refetch does not disturb the list; retry recovers the detail panel only', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches?jobId=1042');
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();

    let detailShouldFail = true;
    consoleGuard.allowConsoleError(/Failed to load resource.*500/);
    await page.route(/\/stock\/api\/batch\/jobs\/\d+$/, async (route) => {
      if (!detailShouldFail) {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: '서버가 요청을 처리하지 못했습니다.',
          },
        }),
      });
    });

    await page.getByRole('button', { name: /job 1037 상세 선택/ }).click();
    await expect(
      page.getByText('이 작업의 상세를 불러오지 못했습니다')
    ).toBeVisible();
    // List: unaffected — still shows every row (including job 1042 itself).
    await expect(
      page.getByRole('button', { name: /job 1042 상세 선택/ })
    ).toBeVisible();

    detailShouldFail = false;
    await page.getByRole('button', { name: '상세 다시 시도' }).click();
    await expect(
      page.getByText('이 작업의 상세를 불러오지 못했습니다')
    ).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'job 1037' })).toBeVisible();
  });
});

test.describe('live region (Batch)', () => {
  const LIVE_REGION = '[aria-live="polite"]';

  test('announces row selection and page moves', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches');

    await page.getByRole('button', { name: /job 1037 상세 선택/ }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(
      'job 1037 상세를 표시합니다.'
    );

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(
      '2페이지를 불러옵니다.'
    );
  });
});

test.describe('pipeline step history (retries, ordered)', () => {
  test('renders a failed-then-succeeded AI retry as two ordered rows with duration only on the successful one', async ({
    page,
  }) => {
    // jobId 1036 (mock-api.ts's `batchDetailFixture`) is seeded with a real
    // AI-summary retry: `AI_RETRY_GENERATE` first FAILED, then SUCCEEDED
    // (`durationMs: 4210`). `PipelineStages` must render both rows, in that
    // order, with `-` on the failed row and `4.21초` only on the successful
    // one — no dedup, no inference from job-level status.
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches?jobId=1036');
    await expect(page.getByRole('heading', { name: 'job 1036' })).toBeVisible();

    const retryRows = page.locator('li').filter({ hasText: 'AI 요약 재처리' });
    await expect(retryRows).toHaveCount(2);

    const failedRow = retryRows.nth(0);
    const succeededRow = retryRows.nth(1);
    await expect(failedRow).toContainText('실패');
    await expect(failedRow).not.toContainText('4.21초');
    await expect(succeededRow).toContainText('성공');
    await expect(succeededRow).toContainText('4.21초');
  });
});

test.describe('AI summary retry', () => {
  test('submits one accepted retry-ai request for a PARTIAL job', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', retryAiMode: 'success' });
    await page.goto('ops/batches?jobId=1038');

    const retryButton = page.getByRole('button', {
      name: 'AI 요약만 재시도',
    });
    await expect(retryButton).toBeVisible();

    const requestPromise = page.waitForRequest((request) =>
      request.url().endsWith('/stock/api/batch/jobs/1038/retry-ai')
    );
    await retryButton.click();
    const request = await requestPromise;

    expect(request.method()).toBe('POST');
    expect(request.postData()).toBeNull();
    expect(request.headers()['idempotency-key']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    await expect(
      page.getByRole('heading', { name: 'AI 요약 재시도가 접수되었습니다.' })
    ).toBeVisible();
  });

  test('renders the conflict response as an accessible detail alert', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      retryAiMode: 'conflict409',
    });
    consoleGuard.allowConsoleError(/Failed to load resource.*409/);
    await page.goto('ops/batches?jobId=1038');

    await page.getByRole('button', { name: 'AI 요약만 재시도' }).click();
    await expect(page.getByRole('alert')).toContainText(
      'AI 요약 재시도가 이미 진행 중입니다.'
    );
  });
});
