import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * B-1 "오늘의 핵심" (`keyPoints`) — covers the block on both Latest and
 * Archive Detail (same shared component, `market-overview-page.tsx`), plus
 * the `KEY_POINTS_GENERATION_FAILED` partial-banner integration
 * (docs/backend-requests-2026-08-12.md#A-2).
 */

test.describe('B-1 오늘의 핵심', () => {
  test('renders the 3 key points in server order on Latest and Archive Detail', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });

    for (const path of ['market/latest', 'market/archive/2026-07-06']) {
      await page.goto(path);

      const heading = page.getByRole('heading', {
        level: 2,
        name: '오늘의 핵심',
      });
      await expect(heading).toBeVisible();

      // Scoped to the keyPoints section: the market analysis block below it
      // has its own, unrelated "관전 포인트" (outlook) heading for the same
      // Korean label, which would otherwise collide with this query.
      const section = page.locator('section', { has: heading });
      await expect(section.getByText('시장 방향')).toBeVisible();
      await expect(section.getByText('주요 원인')).toBeVisible();
      await expect(section.getByText('관전 포인트')).toBeVisible();
      // direction is spelled out as a visible word, not only a color/glyph.
      await expect(section.getByText('혼조')).toBeVisible();
    }
  });

  test('keyPoints 실패: PARTIAL 배너에 전용 메시지가 뜨고 섹션은 렌더되지 않는다', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'keyPointsFailed' });
    await page.goto('market/latest');

    await expect(
      page.getByRole('heading', { name: '오늘의 핵심' })
    ).toHaveCount(0);
    await expect(
      page.getByText('오늘의 핵심 포인트를 준비하지 못했습니다.')
    ).toBeVisible();
  });
});
