import { test, expect, type Page } from '@playwright/test';

// demo/menus.html: #rich (table) and #rich-cards show rows whose menus have icons (emoji, and
// one Node given for every row), descriptions, a "Share" heading, a disabled item with both a
// description and a why, and a danger item with confirm. (The menu on its own, <lfdln-menu>, is
// tested in the menu package.)
async function open(page: Page) {
  await page.goto('/menus.html');
  await expect(page.locator('#rich tbody tr')).toHaveCount(2);
}
const rowMenu = (page: Page, n = 0) => page.locator('#rich tbody tr').nth(n).locator('.lfdln-menu-list');
const openRow = async (page: Page, n = 0) => {
  await page.locator('#rich tbody tr').nth(n).locator('.lfdln-menu-button').click();
  await expect(rowMenu(page, n)).toBeVisible();
};
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.querySelector('.lfdln-menu-label')?.textContent?.trim() ?? document.activeElement?.className);

test.describe('row menus', () => {
  test('icons go in their own slot; strings are text and a Node is copied for each menu', async ({ page }) => {
    await open(page);
    await openRow(page, 0);
    const rename = rowMenu(page).getByRole('menuitem', { name: 'Rename' });
    await expect(rename.locator('.lfdln-menu-icon')).toHaveText('✏️');
    await expect(rename.locator('.lfdln-menu-icon')).toHaveAttribute('aria-hidden', 'true');
    // Every item has the slot, so labels line up.
    const xs = await rowMenu(page).locator('.lfdln-menu-label').evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
    await page.keyboard.press('Escape');
    expect(await page.locator('#rich .lfdln-menu-list svg.star').count()).toBe(2);
    expect(await page.locator('#rich-cards .lfdln-menu-list svg.star').count()).toBe(2);
  });

  test('the name is the label; the description describes it', async ({ page }) => {
    await open(page);
    await openRow(page);
    const rename = rowMenu(page).getByRole('menuitem', { name: 'Rename', exact: true });
    await expect(rename).toHaveAccessibleName('Rename');
    await expect(rename).toHaveAccessibleDescription('Give it a new name');
    await expect(rename.locator('.lfdln-menu-desc')).toBeVisible();
  });

  test('menu text starts at the left, also inside the right-aligned ⋯ column', async ({ page }) => {
    await open(page);
    await openRow(page);
    await expect(rowMenu(page)).toHaveCSS('text-align', 'left');
  });

  test('a disabled item shows why in place of its description', async ({ page }) => {
    await open(page);
    await openRow(page);
    const print = rowMenu(page).getByRole('menuitem', { name: 'Print' });
    await expect(print).toHaveAttribute('aria-disabled', 'true');
    await expect(print.locator('.lfdln-menu-why')).toHaveText('No printer is set up');
    await expect(print.locator('.lfdln-menu-desc')).toHaveCount(0);
    await expect(print).toHaveAccessibleDescription('No printer is set up');
  });

  test('a heading labels its group; danger items stay last', async ({ page }) => {
    await open(page);
    await openRow(page);
    const group = rowMenu(page).getByRole('group', { name: 'Share' });
    await expect(group.getByRole('menuitem')).toHaveText([/By email/, /Print/]);
    const labels = await rowMenu(page).locator('.lfdln-menu-label').allTextContents();
    expect(labels).toEqual(['Rename', 'Star', 'By email', 'Print', 'Delete']);
    // Arrows skip the heading and the line.
    expect(await focusedText(page)).toBe('Rename');
    for (const want of ['Star', 'By email', 'Print', 'Delete', 'Rename']) {
      await page.keyboard.press('ArrowDown');
      expect(await focusedText(page)).toBe(want);
    }
  });
});
