import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Phase 9 §16-11 — permissions. Drives the role through the REAL
 * integration path: `installMockApi(page, {role: 'viewer'|'operator'})`
 * makes the mocked `POST /api/users/token` response body carry a `role`
 * field, which `auth-bootstrap.ts#readRole()` parses and
 * `capabilities.ts#getRole()` consumes ahead of its own default — not a
 * test-only override of `capabilities.ts` internals.
 *
 * §16-11 requires asserting ABSENCE from the DOM, not mere invisibility —
 * `expect(locator).toHaveCount(0)` (not `.not.toBeVisible()`) is used
 * throughout for that reason.
 */

test.describe('§16-11 Viewer permissions', () => {
  test('the ops nav item is absent from the DOM (desktop rail and mobile drawer)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'viewer' });
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

  test('direct entry to /ops/batches renders the 403 screen, with trigger/log/detail nodes absent from the DOM', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'viewer' });
    await page.goto('ops/batches');

    await expect(page.getByText('403 · FORBIDDEN')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: '이 화면에 접근할 권한이 없습니다' })
    ).toBeVisible();
    await expect(page.getByText('현재 계정은 Viewer입니다')).toBeVisible();

    // Absent from the DOM, not merely hidden.
    await expect(page.locator('#trigger-btn')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('실행 이력')).toHaveCount(0);
    await expect(page.getByText('실행 로그')).toHaveCount(0);
    await expect(page.getByText(/job \d+/)).toHaveCount(0);

    await page.getByRole('button', { name: '최신 브리프로 이동' }).click();
    await expect(page).toHaveURL(/market\/latest/);
  });

  test('a Viewer never issues a batch-jobs/batch-job-detail request from /ops/batches', async ({
    page,
  }) => {
    const requestedPaths: string[] = [];
    await installMockApi(page, { scenario: 'ready', role: 'viewer' });
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

test.describe('§16-11 Operator permissions (control group)', () => {
  test('the ops nav item and trigger button ARE present, and /ops/batches renders the Operator screen', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', role: 'operator' });
    await page.goto('market/latest');

    await expect(page.getByRole('link', { name: '배치 운영' })).toBeVisible();

    await page.getByRole('link', { name: '배치 운영' }).click();
    await expect(
      page.getByRole('heading', { name: '배치 운영' })
    ).toBeVisible();
    await expect(page.locator('#trigger-btn')).toBeVisible();
    await expect(page.getByText('403 · FORBIDDEN')).toHaveCount(0);
  });
});
