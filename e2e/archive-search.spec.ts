import { expect, test } from './fixtures/console-guard';
import { installMockApi, shiftDate, TODAY } from './fixtures/mock-api';

/**
 * Covers filter apply/reset, validation, pagination, browser Back restoration,
 * retry with previous results preserved, and this screen's live regions.
 */

test.describe('filter apply / reset', () => {
  test('typing does not change the URL; 필터 적용 sets query + page=1; 초기화 restores the default range', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    const urlBeforeTyping = page.url();
    await page.locator('#from').fill('2026-07-01');
    await page.locator('#to').fill('2026-07-10');
    expect(page.url(), 'typing must not touch the URL').toBe(urlBeforeTyping);

    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page).toHaveURL(/from=2026-07-01/);
    await expect(page).toHaveURL(/to=2026-07-10/);
    await expect(page).toHaveURL(/page=1/);

    await page.getByRole('button', { name: '초기화' }).click();
    // Bare URL (no from/to/status/page) — `parseListFilters` recomputes the
    // default 14-day range from this alone.
    await expect(page).toHaveURL(/\/market\/archive\/search$/);
    await expect(page.locator('#from')).not.toHaveValue('2026-07-01');
  });

  test('applies market, keyword, and an independent parent theme without adding child codes', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    await page.getByLabel('시장').selectOption('KR');
    await page.getByLabel('키워드').fill('rate');
    await page.getByRole('checkbox', { name: '업종', exact: true }).check();
    await page.getByRole('button', { name: '필터 적용' }).click();

    await expect(page).toHaveURL(/market=KR/);
    await expect(page).toHaveURL(/theme=SECTOR/);
    await expect(page).toHaveURL(/q=rate/);
    await expect(page).not.toHaveURL(/SECTOR_SEMICONDUCTORS/);
    await expect(page.getByLabel('시장')).toHaveValue('KR');
    await expect(page.getByLabel('키워드')).toHaveValue('rate');
    await expect(
      page.getByRole('checkbox', { name: '업종', exact: true })
    ).toBeChecked();
  });

  test('browser Back and Forward restore the advanced archive filters', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    consoleGuard.allowFailedRequest(/pages\/archive/);
    await page.goto('market/archive/search');

    await page.getByLabel('시장').selectOption('US');
    await page.getByLabel('키워드').fill('macro');
    await page
      .getByRole('checkbox', { name: '업종 / 반도체', exact: true })
      .check();
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page).toHaveURL(/market=US/);
    await expect(page).toHaveURL(/theme=SECTOR_SEMICONDUCTORS/);

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=2/);
    await page.goBack();
    await expect(page).toHaveURL(/page=1/);
    await expect(page.getByLabel('시장')).toHaveValue('US');
    await expect(page.getByLabel('키워드')).toHaveValue('macro');
    await expect(
      page.getByRole('checkbox', { name: '업종 / 반도체', exact: true })
    ).toBeChecked();

    await page.goForward();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByLabel('시장')).toHaveValue('US');
    await expect(page.getByLabel('키워드')).toHaveValue('macro');
  });

  test('empty results explain the applied market, theme, and keyword filters', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      archiveSearchMode: 'noResults',
    });
    await page.goto(
      'market/archive/search?market=KR&theme=SECTOR&q=rate&page=1'
    );

    await expect(page.getByText('조건에 맞는 스냅샷이 없습니다')).toBeVisible();
    await expect(
      page.getByText(/적용 필터\(.*시장 KR.*테마 업종.*검색어 rate/)
    ).toBeVisible();
  });
});

test.describe('validation', () => {
  test('future date: URL unchanged, field message shown, focus on the field', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    // Keep this validation assertion independent of the day the suite runs.
    // The app validates against the browser's KST clock, so freeze it to the
    // same fixture date used by the mock and submit the following day.
    await page.clock.setFixedTime(new Date(`${TODAY}T08:24:31+09:00`));
    await page.goto('market/archive/search');
    const urlBefore = page.url();

    await page.locator('#to').fill(shiftDate(TODAY, 1));
    await page.getByRole('button', { name: '필터 적용' }).click();

    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('#to-error')).toContainText(
      '미래 날짜는 선택할 수 없습니다'
    );
    await expect(page.locator('#to')).toBeFocused();
    await expect(page.locator('#to')).toHaveAttribute('aria-invalid', 'true');
  });

  test('reversed range: URL unchanged, error attached to the from field, focus on it', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');
    const urlBefore = page.url();

    await page.locator('#from').fill('2026-07-20');
    await page.locator('#to').fill('2026-07-10');
    await page.getByRole('button', { name: '필터 적용' }).click();

    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('#from-error')).toContainText(
      '시작일이 종료일보다 늦습니다'
    );
    await expect(page.locator('#from')).toBeFocused();
  });

  test('bad format (cleared field): URL unchanged, format message shown, focus on it', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');
    const urlBefore = page.url();

    await page.locator('#to').fill('');
    await page.getByRole('button', { name: '필터 적용' }).click();

    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('#to-error')).toContainText(
      '날짜 형식이 올바르지 않습니다'
    );
    await expect(page.locator('#to')).toBeFocused();
  });
});

test.describe('pagination (Archive: 46/20 -> 3 pages)', () => {
  test('paginates through all 3 pages and reflects `page` in the URL', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    await expect(page.getByText('46건')).toBeVisible();
    await expect(page.getByText('1 / 3', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('2 / 3', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByText('3 / 3', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});

test.describe('browser Back (Archive Search)', () => {
  test('Back restores filters, page, and scroll position', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('market/archive/search');

    await page.getByRole('button', { name: '다음' }).click(); // page=2
    await expect(page).toHaveURL(/page=2/);

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(50);
    const scrollYBeforeNavigation = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeNavigation).toBeGreaterThan(0);

    const firstRowLink = page
      .locator('table tbody tr')
      .first()
      .locator('a')
      .first();
    // The row is above the current viewport; Playwright's click action would
    // scroll it into view before dispatching the event and overwrite the
    // position this test is meant to verify. Dispatch the click in place so
    // the app sees the true pre-navigation offset.
    await firstRowLink.dispatchEvent('click');
    // `#page-title` now renders the promoted headline text rather than a
    // "<date> 시장 브리프" label, so the archive-detail waypoint is checked
    // via its "아카이브 스냅샷" badge instead of the old heading text.
    await expect(page.getByText('아카이브 스냅샷')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/page=2/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(scrollYBeforeNavigation);
  });

  test('Back after applying a filter restores the applied filter', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    // Rapid Back navigations cancel whichever `pages/archive` fetch was still
    // in-flight for the page being navigated away from (React Query's
    // `AbortSignal` wired through `queryFn`) — a real, expected
    // `net::ERR_ABORTED`, not an app bug, so it is allow-listed rather than
    // silenced globally.
    consoleGuard.allowFailedRequest(/pages\/archive/);
    await page.goto('market/archive/search');

    await page.locator('#from').fill('2026-07-01');
    await page.locator('#to').fill('2026-07-15');
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page).toHaveURL(/from=2026-07-01/);

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page).toHaveURL(/page=2/);

    await page.goBack();
    await expect(page).toHaveURL(/page=1/);
    await expect(page).toHaveURL(/from=2026-07-01/);

    await page.goBack();
    await expect(page).not.toHaveURL(/from=2026-07-01/);
  });
});

test.describe('Retry (Archive Search)', () => {
  test('a failed re-fetch keeps filters + previous rows visible; retry recovers', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search?status=READY&page=1');
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    // Just the pageId subline — robust against the responsive collapse of
    // the "생성 시각" column into a subline at narrower widths, unlike a
    // whole-row text comparison.
    const firstPageIdBefore = await page
      .locator('table tbody tr')
      .first()
      .getByText(/pageId \d+/)
      .innerText();

    let shouldFail = true;
    // The deliberately-injected 500 response below makes Chromium itself log
    // a "Failed to load resource: ... 500" console error for that request —
    // expected fallout from this test's own fault injection, not an app bug.
    consoleGuard.allowConsoleError(/Failed to load resource.*500/);
    await page.route('**/stock/api/pages/archive**', async (route) => {
      if (!shouldFail) {
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

    // A new filter (status changes) issues a NEW query key, which is the
    // request forced to fail above.
    await page.locator('#status').selectOption('PARTIAL');
    await page.getByRole('button', { name: '필터 적용' }).click();

    await expect(page.getByText('데이터를 불러오지 못했습니다')).toBeVisible();
    // Filters and previous rows stay visible through a failed refresh.
    await expect(
      page
        .locator('table tbody tr')
        .first()
        .getByText(/pageId \d+/)
    ).toHaveText(firstPageIdBefore);
    await expect(page.locator('#status')).toHaveValue('PARTIAL');

    shouldFail = false;
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(
      page.getByText('데이터를 불러오지 못했습니다')
    ).not.toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });
});

test.describe('live region (Archive Search)', () => {
  const LIVE_REGION = '[aria-live="polite"]';

  test('announces result count on apply, and page moves', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    await page.locator('#status').selectOption('READY');
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(/건을 찾았습니다\./);

    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(
      '2페이지를 불러옵니다.'
    );
  });

  test('announces a validation failure and a reset', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    await page.locator('#to').fill('');
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(
      '필터를 적용하지 못했습니다. 입력 오류 1건을 확인해 주세요.'
    );

    await page.getByRole('button', { name: '초기화' }).click();
    await expect(page.locator(LIVE_REGION)).toContainText(
      '필터를 기본값으로 초기화했습니다.'
    );
  });
});
