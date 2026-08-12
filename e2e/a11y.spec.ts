import { expect, test } from './fixtures/console-guard';
import { installMockApi } from './fixtures/mock-api';

/**
 * Keyboard coverage: Tab order, skip link, and Drawer/Dialog focus trap,
 * Escape, and return-to-trigger. Both share the same underlying
 * `use-dismissable.ts` hook, so their contracts are identical in shape.
 */

test.describe('skip link', () => {
  // NOTE on approach: this app deliberately auto-focuses `#page-title` (or
  // `#main-content` as a transient fallback while loading) on every route
  // mount — by the time `page.goto()` resolves, something deep
  // in the page already holds focus. Resetting via `document.activeElement
  // ?.blur()` does NOT reliably move Chromium's sequential-focus-navigation
  // cursor back to the true top of the document (verified empirically: a
  // blur + Tab from a focus deep inside `<main>` lands on the next
  // focusable element AFTER that point in DOM order, e.g. a market tab
  // inside the US/KR tablist — not the skip link, which sits BEFORE the
  // nav rail near the very top of `<body>`). So this
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

test.describe('mobile nav Drawer — focus trap / Escape / return', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens with focus on its first focusable element, traps Tab, Escape closes and returns focus to the menu button', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');

    const menuButton = page.getByRole('button', { name: '주요 메뉴 열기' });
    await menuButton.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    // `nav-drawer.tsx`'s own header ("메뉴 닫기" ✕ button) renders BEFORE
    // `NavList` — since `Drawer` has no `initialFocusRef`, `useDismissable`
    // focuses `getFocusableElements(container)[0]`, which is this ✕ button,
    // not the first nav link.
    const closeButton = page.getByRole('button', { name: '메뉴 닫기' });
    await expect(closeButton).toBeFocused();

    // Shift+Tab from the TRUE first focusable element must wrap to the LAST
    // one inside the drawer (focus trap), not escape it.
    await page.keyboard.press('Shift+Tab');
    const lastFocusableInDrawer = drawer.locator('a, button').last();
    await expect(lastFocusableInDrawer).toBeFocused();
    await expect(lastFocusableInDrawer).toContainText('배치 운영');

    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(menuButton).toBeFocused();
  });

  test('overlay click closes the drawer', async ({ page }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');
    await page.getByRole('button', { name: '주요 메뉴 열기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Click the overlay itself (outside the drawer panel) — coordinates near
    // the right edge of a 390px-wide viewport, well past the drawer's own
    // `width: min(84vw, 300px)`.
    await page.mouse.click(370, 400);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Drawer never touches browser history (does not intercept Back)', async ({
    page,
  }) => {
    await installMockApi(page, { scenario: 'ready' });
    await page.goto('market/latest');
    const urlBefore = page.url();

    await page.getByRole('button', { name: '주요 메뉴 열기' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(page.url()).toBe(urlBefore);

    await page.keyboard.press('Escape');
    expect(page.url()).toBe(urlBefore);
  });
});
