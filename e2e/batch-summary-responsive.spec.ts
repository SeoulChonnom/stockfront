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
