import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Phase 9 §16 items 4 (Batch pagination), 5 (browser Back — jobId selection +
 * scroll), 9 (Retry — list/detail independence), 12 (live region — the
 * subset this screen owns).
 *
 * `BATCH_ALL` (mock-api.ts) seeds 27 jobs; `jobStatusFor(i)`: i=0 -> RUNNING,
 * i%9===2 -> PARTIAL, i%9===5 -> FAILED, else SUCCESS. `jobId = 1042 - i`.
 * Page 1 (first 20, i=0..19) contains exactly one FAILED row at i=5 ->
 * jobId 1037 — the page's own `fallbackJobId` logic (first FAILED, else
 * first row) selects this by default with no `?jobId=` in the URL.
 */

test.describe('§16-4 pagination (Batch: 27/20 -> 2 pages)', () => {
  test('paginates through both pages and reflects `page` in the URL', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches');

    // "1–20 / 27" appears twice by design (the list header's own count span
    // AND the shared `Pagination` component's range text) — `.first()`
    // rather than a stricter locator since both instances are correct.
    await expect(
      page.getByText('1–20 / 27', { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText('1 / 2', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByText('21–27 / 27', { exact: true }).first()
    ).toBeVisible();
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

    // Applying a filter keeps the current `jobId` in the URL (goTo() only
    // overrides `jobId` when explicitly asked to), so the detail query key
    // is untouched by this — the list failing is independent of it.
    await page.locator('#batch-status-trigger').click();
    await page.getByRole('option', { name: 'SUCCESS · 성공' }).click();
    await page.getByRole('button', { name: '필터 적용' }).click();

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
