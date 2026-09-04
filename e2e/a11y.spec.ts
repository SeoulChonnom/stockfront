import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * 키보드 커버리지: 스킵 링크와 헤더 사이트맵의 Tab 순서.
 *
 * 좌측 레일과 모바일 드로어가 사라지면서 내비게이션은 헤더 중앙의 버튼 그룹
 * 하나가 됐다. 열고 닫는 단계가 없으므로 목적지 링크는 어느 폭에서든 항상
 * 문서에 있고 바로 Tab으로 도달한다.
 */

test.describe('skip link', () => {
  // NOTE on approach: this app deliberately auto-focuses `#page-title` (or
  // `#main-content` as a transient fallback while loading) on every route
  // mount — by the time `page.goto()` resolves, something deep
  // in the page already holds focus. Resetting via `document.activeElement
  // ?.blur()` does NOT reliably move Chromium's sequential-focus-navigation
  // cursor back to the true top of the document (verified empirically: a
  // blur + Tab from a focus deep inside `<main>` lands on the next
  // focusable element AFTER that point in DOM order, e.g. a row inside the
  // 두 시장 한눈에 band — not the skip link, which sits BEFORE the
  // header near the very top of `<body>`). So this
  // exercises the skip link's own contract directly (it receives focus,
  // becomes visible, and activating it moves focus to `#main-content`)
  // rather than asserting a literal "first Tab stop from a cold load"
  // invariant that this app's legitimate auto-focus feature makes
  // untestable via raw Tab simulation.
  test('the skip link is keyboard-focusable, and activating it focuses #main-content', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');

    const skipLink = page.getByRole('link', { name: '본문으로 바로가기' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('desktop Tab order proceeds forward through the primary nav in order', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('market/latest');

    await page.getByRole('link', { name: '최신 브리프' }).focus();
    await expect(page.getByRole('link', { name: '최신 브리프' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '아카이브' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '배치 운영' })).toBeFocused();
  });
});

test.describe('narrow-viewport sitemap', () => {
  // 예전에는 이 폭에만 드로어라는 별도 UI가 있었다. 이제는 데스크톱과 같은
  // 버튼 그룹 하나만 뜨고, `sm` 아래에서 라벨만 시각적으로 접힌다.
  test.use({ viewport: { width: 390, height: 844 } });

  test('every destination stays reachable and named, with no menu to open', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');

    const nav = page.getByRole('navigation', { name: '주요 메뉴' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveCount(3);

    // 라벨이 `sr-only`로 접혀도 접근 가능한 이름은 남는다 — 아이콘만 보이는
    // 버튼이 이름 없는 버튼이 되면 스크린리더에서 목적지를 구분할 수 없다.
    await page.getByRole('link', { name: '아카이브' }).focus();
    await expect(page.getByRole('link', { name: '아카이브' })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '배치 운영' })).toBeFocused();
  });

  test('the sitemap never touches browser history on its own', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');
    const urlBefore = page.url();

    await page.getByRole('link', { name: '최신 브리프' }).focus();
    await page.keyboard.press('Escape');
    expect(page.url()).toBe(urlBefore);
  });
});

test.describe('market compare band — keyboard-only navigation', () => {
  test('reaches a market section from the band using the keyboard alone', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');

    // 탭 위젯이 사라지면서 roving tabindex도 함께 사라졌다. 이제 밴드의 각
    // 행은 평범한 버튼이고, 접근성 계약은 "키보드만으로 도달해 활성화하면
    // 해당 시장 섹션의 제목이 실제 DOM 포커스를 받는다"로 옮겨졌다.
    // 포커스가 옮겨가지 않으면 스크린리더 사용자는 이동했다는 사실 자체를
    // 알 수 없다.
    const band = page.getByRole('region', { name: '두 시장 한눈에' });
    const koreaRow = band.getByRole('button').first();

    await koreaRow.focus();
    await expect(koreaRow).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/market=kr/);
    await expect(
      page.getByRole('heading', { level: 2, name: '한국 증시' })
    ).toBeFocused();

    // 이동일 뿐이므로 반대편 시장은 문서에 그대로 남아 있어야 한다 —
    // 스크린리더 브라우즈 모드가 브리프 전체를 훑을 수 있다는 뜻이다.
    await expect(
      page.getByRole('heading', { level: 2, name: '미국 증시' })
    ).toBeAttached();
  });
});
