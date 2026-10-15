import { test, expect, type Page } from '@playwright/test';

// demo/menus.html: #rich (table) and #rich-cards show rows whose menus have icons (emoji, and
// one Node given for every row), descriptions, a "Share" heading, a disabled item with both a
// description and a why, and a danger item with confirm. #m1 is a <lfdln-dv-menu> written in
// HTML; #m2 is one set up from script (items, a Node icon, trigger-text). window.menuEvents
// keeps dv-action / dv-menu-open / dv-menu-close.
async function open(page: Page) {
  await page.goto('/menus.html');
  await expect(page.locator('#rich tbody tr')).toHaveCount(2);
  await expect(page.locator('#m1 .dv-menu-button')).toBeVisible();
}
const events = (page: Page) => page.evaluate(() => (window as unknown as { menuEvents: unknown[] }).menuEvents);
const rowMenu = (page: Page, n = 0) => page.locator('#rich tbody tr').nth(n).locator('.dv-menu');
const openRow = async (page: Page, n = 0) => {
  await page.locator('#rich tbody tr').nth(n).locator('.dv-menu-button').click();
  await expect(rowMenu(page, n)).toBeVisible();
};
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.querySelector('.dv-menu-label')?.textContent?.trim() ?? document.activeElement?.className);

test.describe('row menus', () => {
  test('icons go in their own slot; strings are text and a Node is copied for each menu', async ({ page }) => {
    await open(page);
    await openRow(page, 0);
    const rename = rowMenu(page).getByRole('menuitem', { name: 'Rename' });
    await expect(rename.locator('.dv-menu-icon')).toHaveText('✏️');
    await expect(rename.locator('.dv-menu-icon')).toHaveAttribute('aria-hidden', 'true');
    // Every item has the slot, so labels line up.
    const xs = await rowMenu(page).locator('.dv-menu-label').evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().x)));
    expect(new Set(xs).size).toBe(1);
    await page.keyboard.press('Escape');
    expect(await page.locator('#rich .dv-menu svg.star').count()).toBe(2);
    expect(await page.locator('#rich-cards .dv-menu svg.star').count()).toBe(2);
  });

  test('the name is the label; the description describes it', async ({ page }) => {
    await open(page);
    await openRow(page);
    const rename = rowMenu(page).getByRole('menuitem', { name: 'Rename', exact: true });
    await expect(rename).toHaveAccessibleName('Rename');
    await expect(rename).toHaveAccessibleDescription('Give it a new name');
    await expect(rename.locator('.dv-menu-desc')).toBeVisible();
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
    await expect(print.locator('.dv-menu-why')).toHaveText('No printer is set up');
    await expect(print.locator('.dv-menu-desc')).toHaveCount(0);
    await expect(print).toHaveAccessibleDescription('No printer is set up');
  });

  test('a heading labels its group; danger items stay last', async ({ page }) => {
    await open(page);
    await openRow(page);
    const group = rowMenu(page).getByRole('group', { name: 'Share' });
    await expect(group.getByRole('menuitem')).toHaveText([/By email/, /Print/]);
    const labels = await rowMenu(page).locator('.dv-menu-label').allTextContents();
    expect(labels).toEqual(['Rename', 'Star', 'By email', 'Print', 'Delete']);
    // Arrows skip the heading and the line.
    expect(await focusedText(page)).toBe('Rename');
    for (const want of ['Star', 'By email', 'Print', 'Delete', 'Rename']) {
      await page.keyboard.press('ArrowDown');
      expect(await focusedText(page)).toBe(want);
    }
  });
});

test.describe('<lfdln-dv-menu>', () => {
  test('HTML only: the trigger, and items from children (with their own markup)', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .dv-menu-button');
    await expect(trigger).toHaveAccessibleName('More for this page');
    await expect(trigger).toHaveAttribute('title', 'More for this page');
    await expect(trigger).toHaveText('⋯');
    await trigger.click();
    const menu = page.locator('#m1 .dv-menu');
    await expect(menu).toBeVisible();
    const edit = menu.getByRole('menuitem', { name: 'Edit', exact: true });
    // A leading <svg> of the item's own goes in the icon slot, so labels line up.
    await expect(edit.locator('.dv-menu-icon svg.pen')).toHaveCount(1);
    await expect(edit.locator('.dv-menu-label')).toHaveText('Edit');
    await expect(edit).toHaveAccessibleDescription('Change the words and pictures');
    await expect(menu.getByRole('group', { name: 'Share' })).toBeVisible();
    await expect(menu.locator('[role=separator]')).toHaveCount(1);
    // The children were read once; the page's own svg is still only in the menu.
    await expect(page.locator('#m1 lfdln-dv-menu-item')).toHaveCount(0);
  });

  test('keyboard: Enter, Space, arrows, Home, End, Escape, and focus back on the trigger', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .dv-menu-button');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#m1 .dv-menu')).toBeVisible();
    expect(await focusedText(page)).toBe('Edit');
    await page.keyboard.press('End');
    expect(await focusedText(page)).toBe('Delete');
    await page.keyboard.press('Home');
    expect(await focusedText(page)).toBe('Edit');
    await page.keyboard.press('ArrowUp');
    expect(await focusedText(page)).toBe('Delete');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focusedText(page)).toBe('See its history');
    await page.keyboard.press('Escape');
    await expect(page.locator('#m1 .dv-menu')).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press(' ');
    await expect(page.locator('#m1 .dv-menu')).toBeVisible();
    await expect.poll(() => focusedText(page)).toBe('Edit');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focusedText(page)).toBe('By email');
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'dv-action'))
      .toEqual([{ type: 'dv-action', id: 'mail', item: 'By email', on: 'm1' }]);
  });

  test('open and close events', async ({ page }) => {
    await open(page);
    await page.locator('#m1 .dv-menu-button').click();
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await events(page)).map((e) => (e as { type: string }).type)).toEqual(['dv-menu-open', 'dv-menu-close']);
  });

  test('disabled says why and does nothing; href is a link', async ({ page }) => {
    await open(page);
    await page.locator('#m1 .dv-menu-button').click();
    const print = page.locator('#m1').getByRole('menuitem', { name: 'Print' });
    await expect(print).toHaveAttribute('aria-disabled', 'true');
    await expect(print.locator('.dv-menu-why')).toHaveText('No printer is set up');
    await print.click({ force: true }); // aria-disabled: Playwright would wait for it otherwise
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'dv-action')).toEqual([]);
    const link = page.locator('#m1 a[role=menuitem]');
    await expect(link).toHaveAttribute('href', /#history$/);
    await link.click();
    await expect(page).toHaveURL(/#history$/);
  });

  test('confirm: Cancel fires nothing, OK fires dv-action', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .dv-menu-button');
    await trigger.click();
    await page.locator('#m1').getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.locator('#m1 dialog.dv-confirm');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete this page?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator('#m1').getByRole('menuitem', { name: 'Delete' }).click();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    // The dialog's close event comes a moment later.
    await expect.poll(async () => (await events(page)).filter((e) => (e as { type: string }).type === 'dv-action'))
      .toEqual([{ type: 'dv-action', id: 'delete', item: 'Delete', on: 'm1' }]);
  });

  test('from script: items, a Node icon and trigger-text', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m2 .dv-menu-button');
    await expect(trigger.locator('svg.star')).toHaveCount(1);
    await expect(trigger).toContainText('Sort by');
    await expect(trigger).toHaveAccessibleName('Sort by');
    await trigger.click();
    await page.locator('#m2').getByRole('menuitem', { name: 'Date' }).click();
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'dv-action'))
      .toEqual([{ type: 'dv-action', id: 'date', item: 'Date', on: 'm2' }]);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('44px targets, and the menu stays on screen', async ({ page }) => {
      await open(page);
      const trigger = page.locator('#m1 .dv-menu-button');
      const t = (await trigger.boundingBox())!;
      expect(t.width).toBeGreaterThanOrEqual(44);
      expect(t.height).toBeGreaterThanOrEqual(44);
      await trigger.click();
      for (const item of await page.locator('#m1 [role=menuitem]').all()) {
        expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      const m = (await page.locator('#m1 .dv-menu').boundingBox())!;
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x + m.width).toBeLessThanOrEqual(390);
    });
  });
});
