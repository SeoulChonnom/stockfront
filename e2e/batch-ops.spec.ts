import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Phase 9 §16 items 4 (Batch pagination), 5 (browser Back — jobId selection +
 * scroll), 9 (Retry — list/detail independence), 12 (live region — the
 * subset this screen owns).
 *
 * `BATCH_ALL` (mock-api.ts) seeds 27 business dates × 2 job types = 54 jobs,
 * interleaved newest-first. The list page size is 20, so the unfiltered list
 * has 3 pages. Tests that care which job is selected pass an explicit
 * `?jobId=` rather than relying on the first-row fallback.
 *
 * Design parity cycle 1 (E1) also removed the 시작일/종료일/상태 filter FORM
 * (`BatchFilterBar`) — there is no `#batch-status-trigger`/필터 적용 flow
 * anymore. The only way to change `status` from the UI is the attention
 * banner's 실패만 보기/부분 실패만 보기 quick filters (see
 * `batch-attention-banner.tsx`) or the list header's 필터 해제 button.
 */

test.describe('§16-4 pagination (Batch: 54/20 -> 3 pages)', () => {
  test('paginates through all pages and reflects `page` in the URL', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches');

    // The "1–20 / 27" range lives only in the list header (design parity
    // cycle 1, D5) — the shared `Pagination` component no longer renders a
    // range next to the pager. E7 (cycle 2): Ops's pager also has no
    // trailing "N / M" indicator at all (unlike Archive's, which does) —
    // this screen only has the range in the header, nothing beside 다음.
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

test.describe('§16-5 browser Back (Batch jobId selection + scroll)', () => {
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

  test('Back restores scroll position', async ({ page }) => {
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

test.describe('§16-9 Retry (Batch list/detail independence)', () => {
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

test.describe('§16-12 live region (Batch)', () => {
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
