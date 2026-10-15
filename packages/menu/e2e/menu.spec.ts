import { test, expect, type Page } from '@playwright/test';

// demo/index.html: #m1 is a <lfdln-menu> written in HTML (items with their own svg, an href, a
// "Share" heading, a disabled item with a description and a why, a line, and a danger item with
// confirm); #m2 is one set up from script (items, a Node icon, trigger-text). window.menuEvents
// keeps menu-action / menu-open / menu-close. demo/html-only.html loads only the standalone script.
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('#m1 .lfdln-menu-button')).toBeVisible();
}
const events = (page: Page) => page.evaluate(() => (window as unknown as { menuEvents: unknown[] }).menuEvents);
const focusedText = (page: Page) => page.evaluate(() => document.activeElement?.querySelector('.lfdln-menu-label')?.textContent?.trim() ?? document.activeElement?.className);

test.describe('<lfdln-menu>', () => {
  test('HTML only: the trigger, and items from children (with their own markup)', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .lfdln-menu-button');
    await expect(trigger).toHaveAccessibleName('More for this page');
    await expect(trigger).toHaveAttribute('title', 'More for this page');
    await expect(trigger).toHaveText('⋯');
    await trigger.click();
    const menu = page.locator('#m1 .lfdln-menu-list');
    await expect(menu).toBeVisible();
    const edit = menu.getByRole('menuitem', { name: 'Edit', exact: true });
    // A leading <svg> of the item's own goes in the icon slot, so labels line up.
    await expect(edit.locator('.lfdln-menu-icon svg.pen')).toHaveCount(1);
    await expect(edit.locator('.lfdln-menu-label')).toHaveText('Edit');
    await expect(edit).toHaveAccessibleDescription('Change the words and pictures');
    await expect(menu.getByRole('group', { name: 'Share' })).toBeVisible();
    await expect(menu.locator('[role=separator]')).toHaveCount(1);
    // The children were read once; the page's own svg is still only in the menu.
    await expect(page.locator('#m1 lfdln-menu-item')).toHaveCount(0);
  });

  test('keyboard: Enter, Space, arrows, Home, End, Escape, and focus back on the trigger', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .lfdln-menu-button');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#m1 .lfdln-menu-list')).toBeVisible();
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
    await expect(page.locator('#m1 .lfdln-menu-list')).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press(' ');
    await expect(page.locator('#m1 .lfdln-menu-list')).toBeVisible();
    await expect.poll(() => focusedText(page)).toBe('Edit');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await focusedText(page)).toBe('By email');
    await page.keyboard.press('Enter');
    await expect(trigger).toBeFocused();
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'menu-action'))
      .toEqual([{ type: 'menu-action', id: 'mail', item: 'By email', on: 'm1' }]);
  });

  test('open and close events', async ({ page }) => {
    await open(page);
    await page.locator('#m1 .lfdln-menu-button').click();
    await page.keyboard.press('Escape');
    await expect.poll(async () => (await events(page)).map((e) => (e as { type: string }).type)).toEqual(['menu-open', 'menu-close']);
  });

  test('disabled says why and does nothing; href is a link', async ({ page }) => {
    await open(page);
    await page.locator('#m1 .lfdln-menu-button').click();
    const print = page.locator('#m1').getByRole('menuitem', { name: 'Print' });
    await expect(print).toHaveAttribute('aria-disabled', 'true');
    await expect(print.locator('.lfdln-menu-why')).toHaveText('No printer is set up');
    await print.click({ force: true }); // aria-disabled: Playwright would wait for it otherwise
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'menu-action')).toEqual([]);
    const link = page.locator('#m1 a[role=menuitem]');
    await expect(link).toHaveAttribute('href', /#history$/);
    await link.click();
    await expect(page).toHaveURL(/#history$/);
  });

  test('confirm: Cancel fires nothing, OK fires menu-action', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .lfdln-menu-button');
    await trigger.click();
    await page.locator('#m1').getByRole('menuitem', { name: 'Delete' }).click();
    const dialog = page.locator('#m1 dialog.lfdln-menu-confirm');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Delete this page?');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator('#m1').getByRole('menuitem', { name: 'Delete' }).click();
    await dialog.getByRole('button', { name: 'Delete' }).click();
    // The dialog's close event comes a moment later.
    await expect.poll(async () => (await events(page)).filter((e) => (e as { type: string }).type === 'menu-action'))
      .toEqual([{ type: 'menu-action', id: 'delete', item: 'Delete', on: 'm1' }]);
  });

  test('never drawn anywhere but under its button, not even for the first frame', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m1 .lfdln-menu-button');
    // Every frame from the click until the menu is placed: either not drawn, or under the button.
    await page.evaluate(() => {
      const list = document.querySelector('#m1 .lfdln-menu-list') as HTMLElement;
      const w = window as unknown as { seen: string[] };
      w.seen = [];
      list.addEventListener('beforetoggle', () => {
        const look = (n: number) => requestAnimationFrame(() => {
          const r = list.getBoundingClientRect();
          w.seen.push(getComputedStyle(list).visibility === 'hidden' ? 'hidden' : `${Math.round(r.top)}`);
          if (n) look(n - 1);
        });
        look(3);
      });
    });
    await trigger.click();
    await expect(page.locator('#m1 .lfdln-menu-list')).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { seen: string[] }).seen.length)).toBe(4);
    const below = Math.round((await trigger.boundingBox())!.y + (await trigger.boundingBox())!.height + 4);
    for (const s of await page.evaluate(() => (window as unknown as { seen: string[] }).seen)) {
      expect(s === 'hidden' || Math.abs(Number(s) - below) <= 1, `a frame drew the menu at top ${s}`).toBe(true);
    }
  });

  test('from script: items, a Node icon and trigger-text', async ({ page }) => {
    await open(page);
    const trigger = page.locator('#m2 .lfdln-menu-button');
    await expect(trigger.locator('svg.star')).toHaveCount(1);
    await expect(trigger).toContainText('Sort by');
    await expect(trigger).toHaveAccessibleName('Sort by');
    await trigger.click();
    await page.locator('#m2').getByRole('menuitem', { name: 'Date' }).click();
    expect((await events(page)).filter((e) => (e as { type: string }).type === 'menu-action'))
      .toEqual([{ type: 'menu-action', id: 'date', item: 'Date', on: 'm2' }]);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });
    test('44px targets, and the menu stays on screen', async ({ page }) => {
      await open(page);
      const trigger = page.locator('#m1 .lfdln-menu-button');
      const t = (await trigger.boundingBox())!;
      expect(t.width).toBeGreaterThanOrEqual(44);
      expect(t.height).toBeGreaterThanOrEqual(44);
      await trigger.click();
      for (const item of await page.locator('#m1 [role=menuitem]').all()) {
        expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      const m = (await page.locator('#m1 .lfdln-menu-list').boundingBox())!;
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x + m.width).toBeLessThanOrEqual(390);
    });
  });
});

test.describe('HTML only, from the standalone script', () => {
  test('a trigger with its own icon and words, and the confirm', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.goto('/html-only.html');
    const trigger = page.locator('#plain .lfdln-menu-button');
    await expect(trigger).toHaveAccessibleName('More for this page');
    await expect(trigger.locator('.lfdln-menu-trigger-icon')).toHaveText('☰');
    await expect(trigger.locator('.lfdln-menu-trigger-text')).toHaveText('More for this page');
    await expect(page.locator('#lfdln-menu-style')).toHaveCount(1);
    const fired = page.evaluate(() => new Promise((ok) => document.addEventListener('menu-action', (e) => ok((e as CustomEvent).detail.id), { once: true })));
    await trigger.click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.locator('#plain dialog.lfdln-menu-confirm').getByRole('button', { name: 'Delete' }).click();
    expect(await fired).toBe('delete');
    expect(problems).toEqual([]);
  });
});
