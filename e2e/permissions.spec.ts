import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Permission coverage drives the role through the real
 * integration path: `installMockApi(page, {role: 'user'|'admin'})` makes
 * the mocked `POST /api/users/token` response body carry a `roleList`
 * field, which `auth-bootstrap.ts#readRoleList()` parses and
 * `capabilities.ts#getRole()` consumes ahead of its own default — not a
 * test-only override of `capabilities.ts` internals.
 *
 * Privileged controls must be absent from the DOM, not merely invisible, so
 * `expect(locator).toHaveCount(0)` is used instead of `.not.toBeVisible()`.
 */

test.describe('non-admin user permissions', () => {
  test('the ops nav item is absent from the DOM (desktop rail and mobile drawer)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'user' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('market/latest');

    await expect(page.getByRole('link', { name: '배치 운영' })).toHaveCount(0);
    await expect(page.getByText('운영', { exact: true })).toHaveCount(0);

    // Mobile drawer renders the SAME nav-items module — assert there too.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole('button', { name: '주요 메뉴 열기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('link', { name: '배치 운영' })).toHaveCount(0);
  });

  test('direct entry to /ops/batches renders the 403 screen, with ops nodes absent from the DOM', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'user' });
    await page.goto('ops/batches');

    await expect(page.getByText('403 · FORBIDDEN')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '이 화면에 접근할 권한이 없습니다' })
    ).toBeVisible();
    await expect(page.getByText('현재 계정은 일반 사용자입니다')).toBeVisible();

    // Absent from the DOM, not merely hidden.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('실행 이력')).toHaveCount(0);
    await expect(page.getByText('실행 로그')).toHaveCount(0);
    await expect(page.getByText(/job \d+/)).toHaveCount(0);

    await page.getByRole('button', { name: '최신 브리프로 이동' }).click();
    await expect(page).toHaveURL(/market\/latest/);
  });

  test('a non-admin user never issues a batch-jobs/batch-job-detail request from /ops/batches', async ({
    page,
  }) => {
    const requestedPaths: string[] = [];
    await installMockApi(page, { scenario: 'ready', role: 'user' });
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/stock/api/batch')) {
        requestedPaths.push(url.pathname);
      }
    });

    await page.goto('ops/batches');
    await expect(page.getByText('403 · FORBIDDEN')).toBeVisible();
    expect(requestedPaths).toEqual([]);
  });
});

test.describe('admin permissions (control group)', () => {
  test('the ops nav item is present and /ops/batches renders the admin screen', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'admin' });
    await page.goto('market/latest');

    await expect(page.getByRole('link', { name: '배치 운영' })).toBeVisible();

    await page.getByRole('link', { name: '배치 운영' }).click();
    await expect(
      page.getByRole('heading', { name: '배치 운영' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: '수동 실행' })).toHaveCount(
      0
    );
    await expect(page.getByText('403 · FORBIDDEN')).toHaveCount(0);
  });
});

test.describe('regular-user copy isolation', () => {
  // `src/lib/audience-copy.ts` gates operator vocabulary and raw error
  // codes behind `canViewOps`. `provider` is deliberately checkable only on
  // these `ready`/`error5xx` scenarios: it also appears inside the raw
  // per-market `partialMessage` text the `partial` scenario renders to
  // every audience by design (Task 5's ruling, tracked as backend
  // dependency D-13 in `.superpowers/sdd/.../progress.md`) — that is
  // documented, accepted behavior, not a regression this suite should flag.
  const OPERATOR_TERMS = ['운영 콘솔', '배치 운영', '재실행', 'provider'];

  // The English badge codes `errorCodeCopy` (`audience-copy.ts`) composes
  // for operators only, drawn from `error-presentation.ts`,
  // `archive-search-page.tsx`, and `cluster-detail-page.tsx`.
  const ERROR_CODES = [
    'PAGE_NOT_FOUND',
    'NETWORK_ERROR',
    'INTERNAL_ERROR',
    'SESSION_EXPIRED',
    'RATE_LIMITED',
    'MALFORMED_RESPONSE',
    'REQUEST_FAILED',
    'ROUTE_NOT_FOUND',
  ];

  const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';

  // The three routes a regular user can actually reach — `/ops/batches`
  // renders the 403 screen for this role (covered above) and is excluded.
  const ROUTES: ReadonlyArray<{ name: string; path: string }> = [
    { name: 'latest', path: 'market/latest' },
    { name: 'archive search', path: 'market/archive/search' },
    { name: 'cluster detail', path: `market/cluster/${CLUSTER_ID}` },
  ];

  for (const { name, path } of ROUTES) {
    test(`never shows operator vocabulary to a regular user (${name})`, async ({
      page,
    }) => {
      await installMockApi(page, { scenario: 'ready', role: 'user' });
      await page.goto(path);
      // `#page-title` is the shared ready-state heading id across all three
      // routes (see `routing.spec.ts`'s "all 6 routes render their own
      // page-title heading") — waiting on it confirms the ready content, not
      // a loading skeleton, is what got scanned below.
      await expect(page.locator('#page-title')).toBeVisible();

      const body = await page.locator('body').innerText();
      for (const term of OPERATOR_TERMS) {
        expect(body).not.toContain(term);
      }
    });
  }

  for (const { name, path } of ROUTES) {
    test(`never shows an English error code to a regular user (${name} / 5xx)`, async ({
      page,
      consoleGuard,
    }) => {
      // The deliberately-injected 500 makes Chromium log its own "Failed to
      // load resource ... 500" console error — expected fallout from this
      // test's own fault injection, not an app bug (same allow-list idiom
      // as `archive-search.spec.ts`/`batch-ops.spec.ts`).
      consoleGuard.allowConsoleError(/Failed to load resource.*500/);
      await installMockApi(page, { scenario: 'error5xx', role: 'user' });
      await page.goto(path);
      // Every scoped error state in this app (`MarketOverviewErrorPanel`,
      // `ArchiveSearchPage`'s `InlineAlert`, `ClusterDetailErrorState`) uses
      // `role="alert"` — waiting on it confirms the error branch actually
      // rendered before the body is scanned.
      await expect(page.getByRole('alert')).toBeVisible();

      const body = await page.locator('body').innerText();
      for (const code of ERROR_CODES) {
        expect(body).not.toContain(code);
      }
      for (const term of OPERATOR_TERMS) {
        expect(body).not.toContain(term);
      }
    });
  }
});
