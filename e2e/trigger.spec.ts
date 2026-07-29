import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Phase 9 §16-10 — Manual Trigger lifecycle (README §7-7), plus the Trigger
 * slice of §16-12 (live region outcomes).
 *
 * `installMockApi`'s POST `/stock/api/batch/market-daily` handler
 * (`e2e/fixtures/mock-api.ts`) adds a 300ms artificial delay before resolving
 * so the "pending" state is actually observable, and a `triggerMode` option
 * that maps 1:1 to `triggerResult()`'s modes.
 */

async function openTriggerDialog(page: import('@playwright/test').Page) {
  await page.goto('ops/batches');
  await page.getByRole('button', { name: '수동 실행' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#trigger-date')).toBeFocused();
}

test.describe('§16-10 Trigger lifecycle — success path', () => {
  test('idle -> pending -> success, with duplicate submit structurally impossible', async ({
    page,
  }) => {
    let postCount = 0;
    await installMockApi(page, { scenario: 'ready', triggerMode: 'success' });
    await page.route('**/stock/api/batch/market-daily', async (route) => {
      postCount += 1;
      await route.fallback();
    });

    await openTriggerDialog(page);
    await page.locator('#trigger-date').fill('2026-07-20');
    await page.getByRole('button', { name: '실행', exact: true }).click();

    // Pending: form replaced entirely — no submit button to double-click.
    await expect(page.getByText('실행 요청을 보내고 있습니다')).toBeVisible();
    await expect(
      page.getByRole('button', { name: '실행', exact: true })
    ).toHaveCount(0);

    await expect(page.getByText('실행을 시작했습니다')).not.toBeVisible();
    await expect(page.getByText('job 1043').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole('button', { name: '작업 상세 보기' })
    ).toBeVisible();
    expect(postCount, 'exactly one POST must have been sent').toBe(1);

    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toContainText(
      'job 1043 실행을 시작했습니다. 상태 RUNNING.'
    );
  });

  test("작업 상세 보기 closes the dialog and opens that job's detail panel", async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', triggerMode: 'success' });
    await openTriggerDialog(page);
    await page.getByRole('button', { name: '실행', exact: true }).click();
    await page.getByRole('button', { name: '작업 상세 보기' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'job 1043' })).toBeVisible();
  });

  test('closing a success leaves a persistent banner on the list page', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready', triggerMode: 'success' });
    await openTriggerDialog(page);
    await page.getByRole('button', { name: '실행', exact: true }).click();
    await expect(page.getByText('job 1043').first()).toBeVisible({
      timeout: 10_000,
    });
    // Two elements are named "닫기" inside the dialog: the header's icon-only
    // ✕ button (`aria-label="닫기"`) and the success state's own "닫기"
    // button below it — `.last()` targets the latter (it renders after the
    // header in DOM order).
    await page
      .getByRole('dialog')
      .getByRole('button', { name: '닫기' })
      .last()
      .click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Exact "실행을 시작했습니다" also appears as a substring of the (now
    // stale, harmless) live-region announcement — `.first()` targets the
    // banner's own paragraph, which is what this assertion is actually about.
    await expect(
      page.getByText('실행을 시작했습니다', { exact: true }).first()
    ).toBeVisible();
  });
});

test.describe('§16-10 Trigger lifecycle — error paths', () => {
  const cases: Array<{
    triggerMode: Parameters<typeof installMockApi>[1]['triggerMode'];
    expectedCode: string;
    expectedMessage: string | RegExp;
  }> = [
    {
      triggerMode: 'conflict409',
      expectedCode: '409',
      expectedMessage: /배치가 이미 실행 중입니다\./,
    },
    {
      triggerMode: 'forbidden403',
      expectedCode: '403',
      expectedMessage: '수동 실행 권한이 없습니다. 관리자(ADMIN) 권한이 필요합니다.',
    },
    {
      triggerMode: 'validation422',
      expectedCode: '422',
      expectedMessage: '미래 날짜는 실행할 수 없습니다.',
    },
    {
      triggerMode: 'rate429',
      expectedCode: '429',
      expectedMessage: '요청이 너무 많습니다. 60초 후 다시 시도해 주세요.',
    },
    {
      triggerMode: 'error500',
      expectedCode: '500',
      expectedMessage: '배치 실행 요청을 처리하지 못했습니다.',
    },
    {
      triggerMode: 'offline',
      expectedCode: '0',
      expectedMessage: '네트워크에 연결할 수 없습니다.',
    },
  ];

  for (const { triggerMode, expectedCode, expectedMessage } of cases) {
    test(`${triggerMode} -> error state with input preserved`, async ({
      page,
      consoleGuard,
    }) => {
      await installMockApi(page, { scenario: 'ready', triggerMode });
      if (triggerMode === 'offline') {
        consoleGuard.allowFailedRequest(/batch\/market-daily/);
        consoleGuard.allowConsoleError(/ERR_INTERNET_DISCONNECTED/);
      } else {
        consoleGuard.allowConsoleError(
          new RegExp(`Failed to load resource.*${expectedCode}`)
        );
      }

      await openTriggerDialog(page);
      await page.locator('#trigger-date').fill('2026-07-15');
      await page.getByRole('button', { name: '실행', exact: true }).click();

      await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('alert')).toContainText(expectedCode);
      await expect(page.getByRole('alert')).toContainText(expectedMessage);
      await expect(page.getByText('입력값은 그대로 유지됩니다')).toBeVisible();

      await page.getByRole('button', { name: '입력으로 돌아가기' }).click();
      await expect(page.locator('#trigger-date')).toHaveValue('2026-07-15');
    });
  }

  test('409 offers "job 1042 열기" to the existing job', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowConsoleError(/Failed to load resource.*409/);
    await installMockApi(page, {
      scenario: 'ready',
      triggerMode: 'conflict409',
    });
    await openTriggerDialog(page);
    await page.getByRole('button', { name: '실행', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'job 1042 열기' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'job 1042' })).toBeVisible();
  });

  test('422 flags the date field as invalid on return to input', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowConsoleError(/Failed to load resource.*422/);
    await installMockApi(page, {
      scenario: 'ready',
      triggerMode: 'validation422',
    });
    await openTriggerDialog(page);
    await page.getByRole('button', { name: '실행', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: '입력으로 돌아가기' }).click();
    await expect(page.locator('#trigger-date')).toHaveAttribute(
      'aria-describedby',
      'trigger-date-error'
    );
    await expect(
      page.getByText('미래 날짜는 실행할 수 없습니다.')
    ).toBeVisible();
  });
});

test.describe('§16-12 live region — Trigger outcomes', () => {
  test('announces the pending request and the eventual error', async ({
    page,
    consoleGuard,
  }) => {
    consoleGuard.allowConsoleError(/Failed to load resource.*409/);
    await installMockApi(page, {
      scenario: 'ready',
      triggerMode: 'conflict409',
    });
    await openTriggerDialog(page);
    await page.getByRole('button', { name: '실행', exact: true }).click();

    await expect(page.locator('[aria-live="polite"]')).toContainText(
      '배치 실행을 요청하고 있습니다.'
    );
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
  });
});
