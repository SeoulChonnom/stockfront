import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * B-4 유사 기사 그룹 (docs/backend-requests-2026-08-12.md#A-5).
 *
 * The live server currently returns `articleGrouping.status: 'UNAVAILABLE'`
 * for every cluster with every article as its own singleton group (A-5
 * "현재 서버 동작"), so `READY` multi-article groups can only be exercised
 * through `mock-api.ts`'s `articleGroupingReady` fixture, not the real
 * backend — mirrors `cluster-analysis.spec.ts`'s note for B-2.
 *
 * Fixture shapes (see `clusterFixture` in `fixtures/mock-api.ts`):
 * - `articleGroupingReady`: articles[0..2] share one group — articles[0] is
 *   the server representative (`exactDuplicateCount: 2`), articles[1] is a
 *   non-representative member with `exactDuplicateCount: 0` (must render no
 *   badge) and is also the article B-2's "impact" section cites
 *   (`altSourceId`), articles[2] is a non-representative member with
 *   `exactDuplicateCount: 1`. articles[3] is a singleton with
 *   `exactDuplicateCount: 3`. articles[4..7] are plain singletons.
 * - `articleGroupingUnavailable`: `articleGrouping.status: 'UNAVAILABLE'`,
 *   every article a singleton, articles[0] keeps `exactDuplicateCount: 2`.
 */

const CLUSTER_ID = '51f0d9a0-9fc5-4f15-a4f9-62856f128683';

const REP_TITLE = '외국인 수급 개선에 지수 상승 폭 확대 (1)';
const MEMBER_TITLE_2 = '외국인 수급 개선에 지수 상승 폭 확대 (2)';
const MEMBER_TITLE_3 = '외국인 수급 개선에 지수 상승 폭 확대 (3)';
const SINGLETON_TITLE_4 = '외국인 수급 개선에 지수 상승 폭 확대 (4)';

test.describe('B-4 유사 기사 그룹', () => {
  test('READY 다건 그룹: 기본 접힘 상태에서 펼치면 그룹 내 다른 기사가 드러난다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingReady',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const articlesSection = page.getByRole('region', { name: '관련 기사' });
    const repRow = articlesSection.locator('li').filter({ hasText: REP_TITLE });
    const toggle = repRow.getByRole('button', { name: /유사 기사/ });

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveText('유사 기사 2건 더 보기');
    await expect(articlesSection.getByText(MEMBER_TITLE_2)).toHaveCount(0);
    await expect(articlesSection.getByText(MEMBER_TITLE_3)).toHaveCount(0);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveText('유사 기사 접기');
    await expect(articlesSection.getByText(MEMBER_TITLE_2)).toBeVisible();
    await expect(articlesSection.getByText(MEMBER_TITLE_3)).toBeVisible();
  });

  test('exactDuplicateCount: 0이면 배지가 없고, 양수면 "원문 중복 N건"으로 표시된다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingReady',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const articlesSection = page.getByRole('region', { name: '관련 기사' });

    // Representative (exactDuplicateCount: 2) is visible without expanding.
    await expect(articlesSection.getByText('원문 중복 2건')).toBeVisible();

    // Reveal the collapsed group members to check both of their counts.
    await articlesSection.getByRole('button', { name: /유사 기사/ }).click();

    const member2Row = articlesSection
      .locator('li')
      .filter({ hasText: MEMBER_TITLE_2 });
    const member3Row = articlesSection
      .locator('li')
      .filter({ hasText: MEMBER_TITLE_3 });

    // exactDuplicateCount: 0 -> never a "0건" badge, and no dangling badge at all.
    await expect(member2Row.getByText(/원문 중복/)).toHaveCount(0);
    // exactDuplicateCount: 1 -> shown.
    await expect(member3Row.getByText('원문 중복 1건')).toBeVisible();
  });

  test('보이는 기사가 1건뿐인(단독) 그룹에는 접기 토글이 없다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingReady',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const articlesSection = page.getByRole('region', { name: '관련 기사' });
    const singletonRow = articlesSection
      .locator('li')
      .filter({ hasText: SINGLETON_TITLE_4 });

    // The singleton still shows its own duplicate badge...
    await expect(singletonRow.getByText('원문 중복 3건')).toBeVisible();
    // ...but never a collapse toggle — nothing to expand.
    await expect(
      singletonRow.getByRole('button', { name: /유사 기사/ })
    ).toHaveCount(0);
  });

  test('키보드로 그룹 토글을 조작할 수 있고 ARIA 확장 상태가 갱신된다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingReady',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const articlesSection = page.getByRole('region', { name: '관련 기사' });
    const toggle = articlesSection.getByRole('button', {
      name: /유사 기사/,
    });

    await toggle.focus();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(articlesSection.getByText(MEMBER_TITLE_2)).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(articlesSection.getByText(MEMBER_TITLE_2)).toHaveCount(0);
  });

  test('B-2 근거 기사 인용이 접힌 그룹 안의 기사로도 도달해 포커스를 옮긴다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingReady',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    // articles[1] (MEMBER_TITLE_2) is a non-representative member of the
    // collapsed group, and is exactly the article B-2's "impact" sentence
    // cites (readySections' altSourceId) — confirms grouping never breaks
    // citation jumps (article-focus-event.ts's whole reason for existing).
    // The "outlook" sentence cites the same article again, so two matching
    // citation buttons exist; either one exercises the same collapsed row.
    const analysisSection = page.getByRole('region', { name: 'AI 심층 분석' });
    const citation = analysisSection
      .getByRole('button', {
        name: `근거 기사로 이동: ${MEMBER_TITLE_2}`,
      })
      .first();
    await citation.click();

    const articlesSection = page.getByRole('region', { name: '관련 기사' });
    await expect(articlesSection.getByText(MEMBER_TITLE_2)).toBeVisible();
    const toggle = articlesSection.getByRole('button', {
      name: /유사 기사/,
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const focused = page.locator(':focus');
    await expect(focused).toHaveAttribute('id', /^cluster-article-/);
  });

  test('UNAVAILABLE: 접기 UI 없이 평면 렌더되고 비차단 안내가 하나만 뜬다', async ({
    page,
  }) => {
    await installMockApi(page, {
      scenario: 'ready',
      clusterMode: 'articleGroupingUnavailable',
    });
    await page.goto(`market/cluster/${CLUSTER_ID}`);

    const articlesSection = page.getByRole('region', { name: '관련 기사' });

    // Exactly one non-blocking notice, not a page/analysis failure surface.
    await expect(
      articlesSection.getByText('유사 기사 묶음을 생성하지 못했습니다.')
    ).toHaveCount(1);
    await expect(articlesSection.getByRole('alert')).toHaveCount(0);

    // No collapse toggle anywhere — flat rendering.
    await expect(
      articlesSection.getByRole('button', { name: /유사 기사/ })
    ).toHaveCount(0);

    // exactDuplicateCount stays valid and keeps displaying even though
    // grouping itself is UNAVAILABLE (A-5).
    await expect(articlesSection.getByText('원문 중복 2건')).toBeVisible();

    // The rest of the page (B-2 analysis) is unaffected — grouping failure
    // is isolated to this cluster's article list, never the whole page.
    const analysisSection = page.getByRole('region', { name: 'AI 심층 분석' });
    await expect(analysisSection.getByRole('heading', { level: 3 })).toHaveText(
      ['발생 배경', '시장 영향', '향후 관전 포인트']
    );
  });
});
