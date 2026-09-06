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
    // default range (`ARCHIVE_DEFAULT_RANGE_DAYS`) from this alone.
    await expect(page).toHaveURL(/\/market\/archive\/search$/);
    await expect(page.locator('#from')).not.toHaveValue('2026-07-01');
  });

  test('applies market, keyword, and an independent parent theme without adding child codes', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');

    await page.getByLabel('시장', { exact: true }).selectOption('KR');
    await page.getByLabel('키워드', { exact: true }).fill('rate');
    // 테마 체크박스는 이제 `테마 전체` 트리거가 여는 팝오버 안에 있다.
    await page
      .getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
      .click();
    await page.getByRole('checkbox', { name: '업종', exact: true }).check();
    await page
      .getByRole('checkbox', { name: '투자자 수급', exact: true })
      .check();

    const appliedArchiveRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        request.method() === 'GET' &&
        url.pathname.endsWith('/stock/api/pages/archive') &&
        url.searchParams.get('marketType') === 'KR' &&
        url.searchParams.get('q') === 'rate' &&
        url.searchParams.getAll('theme').length === 2
      );
    });
    const [request] = await Promise.all([
      appliedArchiveRequest,
      page.getByRole('button', { name: '필터 적용' }).click(),
    ]);
    const appliedUrl = new URL(request.url());

    await expect(page).toHaveURL(/market=KR/);
    await expect(page).toHaveURL(/theme=SECTOR/);
    await expect(page).toHaveURL(/theme=MARKET_FLOW_INVESTOR/);
    await expect(page).toHaveURL(/q=rate/);
    await expect(page).not.toHaveURL(/SECTOR_SEMICONDUCTORS/);
    expect(appliedUrl.searchParams.getAll('theme')).toEqual([
      'SECTOR',
      'MARKET_FLOW_INVESTOR',
    ]);
    await expect(page.getByLabel('시장', { exact: true })).toHaveValue('KR');
    await expect(page.getByLabel('키워드', { exact: true })).toHaveValue(
      'rate'
    );
    // 적용 뒤 트리거 바깥을 클릭한 제출 동작이 팝오버를 닫으므로, 체크
    // 상태를 다시 보려면 팝오버를 다시 연다.
    await page
      .getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
      .click();
    await expect(
      page.getByRole('checkbox', { name: '업종', exact: true })
    ).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: '투자자 수급', exact: true })
    ).toBeChecked();
  });

  test('browser Back and Forward restore the advanced archive filters', async ({
    page,
    consoleGuard,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    consoleGuard.allowFailedRequest(/pages\/archive/);
    await page.goto('market/archive/search');

    await page.getByLabel('시장', { exact: true }).selectOption('US');
    await page.getByLabel('키워드', { exact: true }).fill('macro');
    await page
      .getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
      .click();
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
    await expect(page.getByLabel('시장', { exact: true })).toHaveValue('US');
    await expect(page.getByLabel('키워드', { exact: true })).toHaveValue(
      'macro'
    );
    await page
      .getByRole('button', { name: /^테마 (전체|\d+개 선택)$/ })
      .click();
    await expect(
      page.getByRole('checkbox', { name: '업종 / 반도체', exact: true })
    ).toBeChecked();

    await page.goForward();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByLabel('시장', { exact: true })).toHaveValue('US');
    await expect(page.getByLabel('키워드', { exact: true })).toHaveValue(
      'macro'
    );
  });

  test('empty results show the plain explanation once, with the applied market, theme, and keyword filters only in the chips row above', async ({
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
    await expect(page.getByText(/적용 필터\(/)).toHaveCount(0);
    await expect(
      page.getByText(
        '선택한 기간에 생성된 브리프가 없거나, 상태 필터가 결과를 모두 제외했습니다. 기간을 넓히거나 상태 필터를 해제해 보세요.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: '적용된 필터' }).getByText('시장 한국')
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: '적용된 필터' }).getByText('테마 업종')
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: '적용된 필터' }).getByText('검색어 "rate"')
    ).toBeVisible();
  });
});

test.describe('range presets', () => {
  test('clicking a preset navigates immediately with the preset range, keeps other filters, resets page to 1, and updates the pressed state', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.clock.setFixedTime(new Date(`${TODAY}T08:24:31+09:00`));
    // 프리셋 하나(지난 30일)와 이미 겹치는 기본값 대신, 확실히 구별되는
    // 범위·다른 필터·1이 아닌 페이지로 시작해 프리셋 클릭의 효과(범위
    // 교체, 나머지 필터 보존, page=1 복귀)를 분명히 드러낸다.
    await page.goto(
      'market/archive/search?from=2026-01-01&to=2026-01-05&page=3&market=KR&q=rate'
    );

    await page.getByRole('button', { name: '지난 7일' }).click();

    await expect(page).toHaveURL(new RegExp(`from=${shiftDate(TODAY, -7)}`));
    await expect(page).toHaveURL(new RegExp(`to=${TODAY}`));
    await expect(page).toHaveURL(/market=KR/);
    await expect(page).toHaveURL(/q=rate/);
    await expect(page).toHaveURL(/page=1/);
    await expect(page).not.toHaveURL(/page=3/);
    await expect(
      page.getByRole('button', { name: '지난 7일' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      '기간을 지난 7일로 바꿔 검색했습니다.'
    );
  });
});

test.describe('month group header', () => {
  test('clicking a month group header navigates immediately to that month, resets to page=1, and keeps other filters', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.clock.setFixedTime(new Date(`${TODAY}T08:24:31+09:00`));
    await page.goto('market/archive/search');

    await page.getByLabel('시장', { exact: true }).selectOption('KR');
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(page).toHaveURL(/market=KR/);

    // 목(mock) 응답은 from/to로 필터링하지 않고 항상 같은 46개 행을
    // 반환하며, 그 최신 20개 행은 전부 7월이라 한 그룹뿐이다. 7월은 아직
    // 끝나지 않은 "이번 달"이라 말일(31일) 대신 오늘(TODAY=2026-07-27)로
    // 클램프된 범위를 기대한다.
    await page.getByRole('button', { name: '2026년 7월만 보기' }).click();

    await expect(page).toHaveURL(/from=2026-07-01/);
    await expect(page).toHaveURL(new RegExp(`to=${TODAY}`));
    await expect(page).toHaveURL(/market=KR/);
    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      '기간을 2026년 7월로 좁혔습니다.'
    );
  });
});

test.describe('filter chips', () => {
  test('removing a filter via its chip drops only that filter and keeps the date range', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto(
      'market/archive/search?from=2026-07-13&to=2026-07-27&market=KR&theme=SECTOR&q=rate'
    );

    await expect(page.getByText('시장 한국')).toBeVisible();

    await page.getByRole('button', { name: '시장 한국 필터 해제' }).click();

    await expect(page).toHaveURL(/from=2026-07-13/);
    await expect(page).toHaveURL(/to=2026-07-27/);
    await expect(page).not.toHaveURL(/market=KR/);
    await expect(page).toHaveURL(/theme=SECTOR/);
    await expect(page).toHaveURL(/q=rate/);
    await expect(page).toHaveURL(/page=1/);
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      '시장 필터를 해제했습니다.'
    );

    await page.getByRole('button', { name: '전체 해제' }).click();

    await expect(page).toHaveURL(/from=2026-07-13/);
    await expect(page).toHaveURL(/to=2026-07-27/);
    await expect(page).not.toHaveURL(/theme=SECTOR/);
    await expect(page).not.toHaveURL(/q=rate/);
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      '모든 필터를 해제했습니다.'
    );
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

  test('missing date (cleared field): URL unchanged, selection message shown, focus on it', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');
    const urlBefore = page.url();

    await page.locator('#to').fill('');
    await page.getByRole('button', { name: '필터 적용' }).click();

    expect(page.url()).toBe(urlBefore);
    await expect(page.locator('#to-error')).toContainText(
      '기준일을 선택해 주세요.'
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

  test('loading an out-of-range page self-corrects the URL and never shows a reversed range', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    // Only 3 pages exist for the default filters (46 rows / size 20); page=5
    // is bookmarkable but out of range.
    await page.goto('market/archive/search?page=5');

    await expect(page).toHaveURL(/page=3/);
    await expect(page).not.toHaveURL(/page=5/);
    await expect(page.getByText('46건')).toBeVisible();
    await expect(page.getByText('3 / 3', { exact: true })).toBeVisible();
    // Page 3 of 46 rows / size 20 truthfully spans 41–46; the old
    // `(page-1)*SIZE+1`–`min(page*SIZE, totalCount)` formula would have
    // rendered a reversed "81–46" for the originally requested page=5.
    await expect(page.getByText('41–46 / 46', { exact: true })).toBeVisible();
    await expect(page.locator('table tbody tr:has(td)').first()).toBeVisible();
  });
});

test.describe('browser Back (Archive Search)', () => {
  test('Back restores filters, page, and scroll position', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('market/archive/search');

    await page.getByRole('button', { name: '다음' }).click(); // page=2
    await expect(page).toHaveURL(/page=2/);

    // 표는 이제 월별로 묶인다 — 각 월 밴드가 그룹 헤더(columnheader)로
    // 노출되는지 여기서 함께 확인한다.
    await expect(
      page.getByRole('columnheader', { name: /년 \d+월/ }).first()
    ).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(50);
    const scrollYBeforeNavigation = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeNavigation).toBeGreaterThan(0);

    const firstRowLink = page
      .locator('table tbody tr:has(td)')
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
    await expect(page.locator('table tbody tr:has(td)').first()).toBeVisible();
    // Just the pageId subline — robust against the responsive collapse of
    // the "생성 시각" column into a subline at narrower widths, unlike a
    // whole-row text comparison.
    const firstPageIdBefore = await page
      .locator('table tbody tr:has(td)')
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
        .locator('table tbody tr:has(td)')
        .first()
        .getByText(/pageId \d+/)
    ).toHaveText(firstPageIdBefore);
    await expect(page.locator('#status')).toHaveValue('PARTIAL');

    shouldFail = false;
    await page.getByRole('button', { name: '다시 시도' }).click();

    await expect(
      page.getByText('데이터를 불러오지 못했습니다')
    ).not.toBeVisible();
    await expect(page.locator('table tbody tr:has(td)').first()).toBeVisible();
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

test.describe('mobile theme picker (< 641px)', () => {
  // Pixel 5 관측치(393×851)와 같은 폭 — `useIsWide`의 641px 경계 아래라
  // FilterBar가 접힘으로 시작하고, ArchiveThemeSelect는 팝오버 대신
  // 인라인 패널로 펼쳐진다.
  test('opening the theme picker leaves 종료일/생성 상태/시장/키워드 visible and unobstructed', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('market/archive/search');

    await page.getByRole('button', { name: '조건 바꾸기' }).click();

    const themeTrigger = page.getByRole('button', {
      name: /^테마 (전체|\d+개 선택)$/,
    });
    await expect(themeTrigger).toHaveAttribute('aria-expanded', 'false');
    await themeTrigger.click();
    await expect(themeTrigger).toHaveAttribute('aria-expanded', 'true');

    // 팝오버(오버레이)라면 아래 필드를 덮어 이 상호작용들이 실패했을
    // 것이다 — Playwright의 액션 대기는 대상이 다른 요소에 가려지면
    // (pointer-events 수신 검사) 그 지점에서 멈춘다.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('#to').fill('2026-07-20');
    await expect(page.locator('#to')).toHaveValue('2026-07-20');
    await page.getByLabel('생성 상태', { exact: true }).selectOption('READY');
    await expect(page.getByLabel('생성 상태', { exact: true })).toHaveValue(
      'READY'
    );
    await page.getByLabel('시장', { exact: true }).selectOption('KR');
    await expect(page.getByLabel('시장', { exact: true })).toHaveValue('KR');
    await page.getByLabel('키워드', { exact: true }).fill('rate');
    await expect(page.getByLabel('키워드', { exact: true })).toHaveValue(
      'rate'
    );

    // The four fields are still on-screen while the panel is open.
    await expect(page.locator('#to')).toBeVisible();
    await expect(page.getByLabel('생성 상태', { exact: true })).toBeVisible();
    await expect(page.getByLabel('시장', { exact: true })).toBeVisible();
    await expect(page.getByLabel('키워드', { exact: true })).toBeVisible();
  });

  test('Escape closes the inline panel and returns focus to the trigger', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('market/archive/search');

    await page.getByRole('button', { name: '조건 바꾸기' }).click();
    const themeTrigger = page.getByRole('button', {
      name: /^테마 (전체|\d+개 선택)$/,
    });
    await themeTrigger.click();

    const searchInput = page.getByRole('searchbox', {
      name: '테마 이름으로 좁히기',
    });
    await searchInput.focus();
    await page.keyboard.press('Escape');

    await expect(themeTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(searchInput).toHaveCount(0);
    await expect(themeTrigger).toBeFocused();
  });
});
