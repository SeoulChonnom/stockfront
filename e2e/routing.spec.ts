import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Covers route/query parsing, deep links, and route-focus management.
 *
 * Paths are relative (no leading `/`) so Playwright resolves them against
 * `baseURL` (`http://127.0.0.1:4173/stock/`) — see
 * `responsive-overflow.spec.ts`'s comment for why a leading slash would
 * silently drop the `/stock/` base.
 */

const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';
const FAILED_JOB_ID = 1037; // jobStatusFor(5) in mock-api.ts's BATCH_ALL seed -> 'FAILED', jobId 1042-5.

test.describe('route / query parsing', () => {
  test('all 6 routes render their own page-title heading', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });

    // `#page-title` is now the promoted global headline (`decision-header-card.tsx`),
    // not the old "최신 시장 브리프"/"<date> 시장 브리프" label — the mock
    // API's `ready` scenario returns the same `globalHeadline` for both the
    // latest and archive-detail pages (`pageFixture` in mock-api.ts), so both
    // cases below expect that literal headline text.
    const READY_HEADLINE =
      '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목';

    const cases: Array<{ path: string; expectHeadingText: string | RegExp }> = [
      { path: '', expectHeadingText: READY_HEADLINE }, // '/' -> replace-redirects to /market/latest
      { path: 'market/latest', expectHeadingText: READY_HEADLINE },
      { path: 'market/archive/search', expectHeadingText: '아카이브' },
      {
        path: 'market/archive/2026-07-06',
        expectHeadingText: READY_HEADLINE,
      },
      { path: `market/cluster/${CLUSTER_ID}`, expectHeadingText: /.+/ },
      { path: 'ops/batches', expectHeadingText: '배치 운영' },
    ];

    for (const { path, expectHeadingText } of cases) {
      await page.goto(path);
      await expect(
        page.locator('#page-title'),
        `route "${path}" should render a #page-title heading`
      ).toHaveText(expectHeadingText, { timeout: 10_000 });
    }
  });

  test('malformed business date -> 404 (operator sees the badge)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'admin' });
    // app-state.ts's archiveMarketRoutePattern requires `\d{4}-\d{2}-\d{2}`;
    // "2026-7-6" (unpadded month/day) does not match it.
    await page.goto('market/archive/2026-7-6');
    await expect(page.locator('#page-title')).toHaveText(
      '이 주소에 해당하는 화면이 없습니다'
    );
    await expect(page.getByText('404 · ROUTE_NOT_FOUND')).toBeVisible();
  });

  test('malformed business date -> 404 (regular user does not see the badge)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'user' });
    await page.goto('market/archive/2026-7-6');
    await expect(page.locator('#page-title')).toHaveText(
      '이 주소에 해당하는 화면이 없습니다'
    );
    await expect(page.getByText('404 · ROUTE_NOT_FOUND')).toHaveCount(0);
  });

  test('malformed cluster UUID -> 404 (operator sees the badge)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'admin' });
    await page.goto('market/cluster/not-a-real-uuid');
    await expect(page.locator('#page-title')).toHaveText(
      '이 주소에 해당하는 화면이 없습니다'
    );
    await expect(page.getByText('404 · ROUTE_NOT_FOUND')).toBeVisible();
  });

  test('unknown pathname -> 404', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('this/route/does/not/exist');
    await expect(page.locator('#page-title')).toHaveText(
      '이 주소에 해당하는 화면이 없습니다'
    );
  });
});

test.describe('deep link', () => {
  test("?jobId=&view=detail opens that job's detail panel directly", async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto(`ops/batches?jobId=${FAILED_JOB_ID}&view=detail`);
    await expect(
      page.getByRole('heading', { name: `job ${FAILED_JOB_ID}` })
    ).toBeVisible();
  });

  test('?pageId= on Archive Detail loads the page directly', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/2026-07-06?pageId=481');
    // Same promoted-headline contract as the routing sweep above.
    await expect(page.locator('#page-title')).toHaveText(
      '금리 경계 속 기술주 강세, 아시아는 반도체 수급 개선에 주목'
    );
    await expect(page.getByText('아카이브 스냅샷')).toBeVisible();
  });

  test("origin= on Cluster Detail drives the breadcrumb's first segment", async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });

    await page.goto(`market/cluster/${CLUSTER_ID}?origin=2026-07-06`);
    await expect(page.getByRole('navigation', { name: '위치' })).toContainText(
      '아카이브 2026-07-06'
    );

    await page.goto(`market/cluster/${CLUSTER_ID}?origin=latest`);
    await expect(page.getByRole('navigation', { name: '위치' })).toContainText(
      '최신 브리프'
    );

    // No `origin` at all -> falls back to the cluster's own business-date
    // archive snapshot, not a bare "no info" dead end.
    await page.goto(`market/cluster/${CLUSTER_ID}`);
    await expect(page.getByText(/진입 경로 정보가 없어/)).toBeVisible();
  });

  // `?market=`의 의미가 "그 시장만 보이기"에서 "그 시장으로 이동"으로
  // 바뀌었다. 딥링크 계약(값 형식, 왕복)은 그대로 살아 있고, 달라진 것은
  // 반대편 시장이 더 이상 사라지지 않는다는 점이다.
  test('?market=kr on Latest scrolls to the Korean section, keeping both markets', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest?market=kr');

    const korea = page.getByRole('heading', { level: 2, name: '한국 증시' });
    const usa = page.getByRole('heading', { level: 2, name: '미국 증시' });
    await expect(korea).toBeVisible();
    // 예전 탭 구조에서는 이 단언이 불가능했다 — 선택 안 된 시장은 마운트조차
    // 되지 않았다.
    await expect(usa).toBeAttached();

    // 이동 대상 섹션의 제목이 포커스를 받는다(탭이 하던 포커스 역할 승계).
    await expect(korea).toBeFocused();
  });

  test('markets render Korea first even though the API returns [US, KR]', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');

    const sectionHeadings = page.getByRole('heading', { level: 2 });
    await expect(sectionHeadings.nth(1)).toHaveText('두 시장 한눈에');
    await expect(sectionHeadings.nth(2)).toHaveText('한국 증시');
    await expect(sectionHeadings.nth(3)).toHaveText('미국 증시');
  });
});

test.describe('Archive Detail — adjacent snapshot navigation', () => {
  // The daily page response's embedded `navigation` block (B-5) is derived
  // from the same 46-contiguous-day `ARCHIVE_ALL` seed (`mock-api.ts`),
  // ending at 2026-07-26. Since this page loads successfully, the app reads
  // `navigation` straight off that response — it never calls the standalone
  // `GET /pages/navigation` endpoint for an already-loaded page (A-6 "어느
  // 경로를 쓸 것인가"). 2026-07-26 is the newest day in that fixture, so it
  // has a real previous neighbour (2026-07-25) but no next one — exercising
  // both the "enable with the real date" and "no snapshot -> stay disabled"
  // paths from a single page, without fabricating a date arithmetic would
  // have guessed at.
  test('enables the real previous date and disables next when no newer snapshot exists', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/2026-07-26');

    const prevButton = page.getByRole('button', { name: '이전 2026-07-25' });
    const nextButton = page.getByRole('button', { name: '다음 브리프 없음' });

    await expect(prevButton).toBeEnabled();
    await expect(nextButton).toBeDisabled();

    // Confirm the enabled button actually lands on a real snapshot, not
    // just that it carries the right label — this is the loop the task
    // exists to break.
    await prevButton.click();
    await expect(page).toHaveURL(/market\/archive\/2026-07-25$/);
    // Confirms this landed on a real snapshot, not another dead end.
    await expect(page.getByText('아카이브 스냅샷')).toBeVisible();
  });

  test('error shell requests standalone navigation with one businessDate key', async ({
    page,
    consoleGuard,
  }) => {
    // This scenario deliberately returns 500 for every mocked API response;
    // the request URL remains the assertion under test.
    consoleGuard.allowConsoleError(/Failed to load resource.*500/);
    await installMockApi(page, { scenario: 'error5xx' });

    const navigationRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return (
        request.method() === 'GET' &&
        url.pathname.endsWith('/stock/api/pages/navigation')
      );
    });
    await page.goto('market/archive/2026-07-26');
    const request = await navigationRequest;
    const url = new URL(request.url());

    expect(url.searchParams.getAll('businessDate')).toEqual(['2026-07-26']);
    await expect(
      page.getByRole('button', { name: '이전 확인 불가' })
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: '다음 확인 불가' })
    ).toBeDisabled();
  });
});

test.describe('route focus', () => {
  test('a pathname navigation focuses #page-title', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');
    await expect(page.locator('#page-title')).toBeVisible();
    await expect(page.locator('#page-title')).toBeFocused();

    // Click a real primary-nav link (pathname change) rather than page.goto —
    // This checks the app's own focus management reacting to `navigate()`,
    // not to a fresh document load.
    await page.getByRole('link', { name: '아카이브' }).click();
    await expect(page.locator('#page-title')).toHaveText('아카이브');
    await expect(page.locator('#page-title')).toBeFocused();
  });

  test('a query-only change does NOT refocus #page-title — the page owns it', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/archive/search');
    await expect(page.locator('#page-title')).toBeFocused();

    // Apply a filter: same pathname, query-only change. Per App.tsx's
    // route-focus effect (keyed on `url.pathname` alone), this must NOT
    // refocus #page-title -- the page moves focus to its own results
    // heading instead (`archive-search-page.tsx`'s `resultsHeadingRef`).
    await page.getByRole('button', { name: '필터 적용' }).click();
    await expect(
      page.getByRole('heading', { name: '검색 결과' })
    ).toBeFocused();
    await expect(page.locator('#page-title')).not.toBeFocused();

    // pathname itself never changed during that transition.
    expect(new URL(page.url()).pathname).toBe('/stock/market/archive/search');
  });

  test('selecting a market (adding ?market=) does NOT refocus #page-title', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');
    await expect(page.locator('#page-title')).toBeFocused();

    // App.tsx's route-focus effect is keyed on `pathname` only (see its own
    // comment), so a `?market=` query-only change must not pull focus back to
    // #page-title. 포커스는 대신 이동 대상 섹션 제목으로 간다.
    const band = page.getByRole('region', { name: '두 시장 한눈에' });
    await band.getByRole('button').first().click();
    await expect(page).toHaveURL(/market=kr/);
    await expect(page.locator('#page-title')).not.toBeFocused();
    await expect(
      page.getByRole('heading', { level: 2, name: '한국 증시' })
    ).toBeFocused();
  });
});

test.describe('browser Back (market selection)', () => {
  test('Back from a cluster detail page restores the selected market and scroll position', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('market/latest');

    // Scroll-restoration keys on pathname + search (`buildScrollKey`), so
    // `?market=kr` must be part of the key the whole way through this flow.
    await page
      .getByRole('region', { name: '두 시장 한눈에' })
      .getByRole('button')
      .first()
      .click();
    await expect(page).toHaveURL(/market=kr/);

    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(50);
    const scrollYBeforeNavigation = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeNavigation).toBeGreaterThan(0);

    // The 이슈 상세 button was removed (Task 8) — the issue title link is now
    // the sole detail entry point, so click it directly.
    const clusterLink = page
      .getByRole('article')
      .first()
      .locator('a[href*="/market/cluster/"]')
      .first();
    // `locator.click()` may scroll a partially visible target into view before
    // dispatching the click, changing the position this test is meant to save.
    await clusterLink.dispatchEvent('click');
    await expect(page).toHaveURL(/market\/cluster\//);
    // Let the detail request settle before Back so the network smoke does not
    // turn an in-flight fetch cancellation into the assertion under test.
    await expect(
      page.getByRole('heading', { name: 'AI 심층 분석' })
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/market=kr/);
    // 저장된 스크롤 위치가 있으면 앵커 이동이 아니라 복원이 이긴다 —
    // 두 스크롤이 부딪히면 이 단언이 먼저 깨진다.
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBe(scrollYBeforeNavigation);
  });
});
