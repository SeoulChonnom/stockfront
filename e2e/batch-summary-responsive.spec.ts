import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';
import { expectNoDocumentOverflow } from './utils/overflow';

for (const width of [320, 390]) {
  test(`batch summary tiles stay readable in one row at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('ops/batches');

    await expect(
      page.getByRole('heading', { level: 1, name: '배치 운영' })
    ).toBeVisible();

    const group = page.getByRole('group', { name: '배치 실행 요약' });
    const tiles = group.locator(':scope > div');
    await expect(tiles).toHaveCount(3);

    // Wait for the ready fixture's summary response rather than measuring the
    // zero-valued fallback rendered while useBatchJobs is still pending.
    const failedValues = group.getByText('6', { exact: true });
    await expect(failedValues).toHaveCount(2);
    await expect(failedValues.nth(0)).toBeVisible();
    await expect(failedValues.nth(1)).toBeVisible();
    await expect(group.getByText('41', { exact: true })).toBeVisible();
    await expect(
      group.getByText('스냅샷 미생성 · 재실행 필요', { exact: true })
    ).toBeVisible();
    await expect(
      group.getByText('일부 지수·요약 누락', { exact: true })
    ).toBeVisible();
    await expect(
      group.getByText('평균 소요 2분 49초', { exact: true })
    ).toBeVisible();

    const geometry = await tiles.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        const paragraphs = Array.from(element.querySelectorAll('p')).map(
          (paragraph) => {
            const paragraphRect = paragraph.getBoundingClientRect();
            return {
              bottom: paragraphRect.bottom,
              clientWidth: paragraph.clientWidth,
              left: paragraphRect.left,
              right: paragraphRect.right,
              scrollWidth: paragraph.scrollWidth,
              top: paragraphRect.top,
            };
          }
        );

        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          paragraphs,
          label: element.querySelector('p')?.textContent,
        };
      })
    );

    expect(geometry.map((tile) => tile.label)).toEqual([
      '실패',
      '부분 실패',
      '성공',
    ]);
    expect(Math.max(...geometry.map((tile) => tile.top))).toBeLessThanOrEqual(
      Math.min(...geometry.map((tile) => tile.top)) + 1
    );
    expect(geometry.map((tile) => tile.left)).toEqual(
      [...geometry.map((tile) => tile.left)].sort((a, b) => a - b)
    );
    expect(geometry.every((tile) => tile.right <= width + 1)).toBe(true);
    expect(
      geometry.every((tile) =>
        tile.paragraphs.every(
          (paragraph) =>
            paragraph.scrollWidth <= paragraph.clientWidth + 1 &&
            paragraph.left >= tile.left - 1 &&
            paragraph.right <= tile.right + 1 &&
            paragraph.top >= tile.top - 1 &&
            paragraph.bottom <= tile.bottom + 1
        )
      )
    ).toBe(true);

    await expectNoDocumentOverflow(page, `${width}px · batch summary tiles`);
  });
}
