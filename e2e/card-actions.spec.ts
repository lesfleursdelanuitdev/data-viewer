import { test, expect, type Page } from '@playwright/test';

// demo/card-actions.html: every card has a primary action ("Order again") and the menu
// [Delete (danger, confirm), Edit, heading, Share, Archive (disabled, why), line, See its page
// (href)]. #foot: card-actions="footer" (3 at most); #foot-all: card-actions-max="10";
// #mixed: the default menu, but card 2 says actionsAt: 'footer'; #tbl: a table with
// card-actions="footer". window.events keeps dv-action.
async function open(page: Page) {
  await page.goto('/card-actions.html');
  await expect(page.locator('#foot .dv-card')).toHaveCount(3);
}
const card = (page: Page, id: string, n = 0) => page.locator(`#${id} .dv-card`).nth(n);
const footerNames = (page: Page, id: string, n = 0) =>
  card(page, id, n).locator('.dv-card-actions').locator(':scope > button, :scope > a, :scope > .dv-card-actions-more > .dv-menu-wrap > button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent!.trim()));
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);

test('the footer holds the primary action first, then the items, the rest in ⋯', async ({ page }) => {
  await open(page);
  await expect(card(page, 'foot').locator('.dv-card-head .dv-menu-button')).toHaveCount(0);
  expect(await footerNames(page, 'foot')).toEqual(['Order again', '✏️Edit', 'Share', 'Archive', 'More for First thing']);
  const more = card(page, 'foot').locator('.dv-card-actions-more');
  await more.locator('.dv-menu-button').click();
  const menu = more.locator('.dv-menu');
  await expect(menu).toBeVisible();
  // Danger still last, after its own line.
  const kids = await menu.evaluate((el) => [...el.children].map((c) => (c.getAttribute('role') === 'separator' ? '---' : c.querySelector('.dv-menu-label')!.textContent)));
  expect(kids).toEqual(['See its page', '---', 'Delete']);
});

test('all in the footer: danger last and styled, no headings or lines', async ({ page }) => {
  await open(page);
  expect(await footerNames(page, 'foot-all')).toEqual(['Order again', '✏️Edit', 'Share', 'Archive', 'See its page', '🗑️Delete']);
  await expect(card(page, 'foot-all').locator('.dv-card-actions .dv-card-actions-more')).toHaveCount(0);
  await expect(card(page, 'foot-all').locator('.dv-card-actions [role=separator], .dv-card-actions .dv-menu-heading')).toHaveCount(0);
  const del = card(page, 'foot-all').locator('.dv-card-actions').getByRole('button', { name: 'Delete' });
  await expect(del).toHaveClass(/dv-danger/);
  await expect(del.locator('[aria-hidden=true]')).toHaveText('🗑️');
});

test('the same dv-action from a footer button', async ({ page }) => {
  await open(page);
  await card(page, 'foot', 1).locator('.dv-card-actions').getByRole('button', { name: 'Edit' }).click();
  await card(page, 'foot', 1).locator('.dv-card-actions').getByRole('button', { name: 'Order again' }).click();
  expect(await events(page)).toEqual([{ on: 'foot', id: 'edit', row: 2 }, { on: 'foot', id: 'again', row: 2 }]);
});

test('disabled stays visible, says why, and does nothing', async ({ page }) => {
  await open(page);
  const archive = card(page, 'foot').locator('.dv-card-actions').getByRole('button', { name: 'Archive' });
  await expect(archive).toBeVisible();
  await expect(archive).toHaveAttribute('aria-disabled', 'true');
  await expect(archive).toHaveAttribute('title', 'Only the owner can archive it.');
  await expect(archive).toHaveAccessibleDescription('Only the owner can archive it.');
  await archive.click({ force: true });
  expect(await events(page)).toEqual([]);
});

test('confirm asks first; href is a link', async ({ page }) => {
  await open(page);
  const actions = card(page, 'foot-all').locator('.dv-card-actions');
  const del = actions.getByRole('button', { name: 'Delete' });
  await del.click();
  const dialog = page.locator('#foot-all dialog.dv-confirm');
  await expect(dialog).toContainText('Delete this thing?');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => events(page)).toEqual([{ on: 'foot-all', id: 'delete', row: 1 }]);
  await expect(del).toBeFocused();
  await expect(actions.getByRole('link', { name: 'See its page' })).toHaveAttribute('href', /#view$/);
});

test('a card can ask for the other placement', async ({ page }) => {
  await open(page);
  await expect(card(page, 'mixed', 0).locator('.dv-card-head .dv-menu-button')).toHaveCount(1);
  await expect(card(page, 'mixed', 0).locator('.dv-card-actions')).toHaveCount(0);
  await expect(card(page, 'mixed', 1).locator('.dv-card-head .dv-menu-button')).toHaveCount(0);
  await expect(card(page, 'mixed', 1).locator('.dv-card-actions')).toHaveCount(1);
});

test('a table keeps its ⋯ column', async ({ page }) => {
  await open(page);
  await expect(page.locator('#tbl tbody tr').first().locator('.dv-row-menu .dv-menu-button')).toHaveCount(1);
  await expect(page.locator('#tbl .dv-card-actions')).toHaveCount(0);
});

test('keyboard: the title, then the footer buttons, then the next card', async ({ page }) => {
  await open(page);
  await card(page, 'foot', 0).locator('.dv-card-link').focus();
  const order: string[] = [];
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => {
      const a = document.activeElement!;
      return a.classList.contains('dv-card-link') ? `title ${a.textContent!.trim()}` : (a.getAttribute('aria-label') ?? a.textContent!.trim());
    }));
  }
  expect(order).toEqual(['Order again', '✏️Edit', 'Share', 'Archive', 'More for First thing', 'title Second thing']);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('footer buttons wrap, are 44px tall, and nothing scrolls sideways', async ({ page }) => {
    await open(page);
    const c = card(page, 'foot-all');
    const cb = (await c.boundingBox())!;
    for (const b of await c.locator('.dv-card-actions').locator('button, a').all()) {
      const box = (await b.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(cb.x);
      expect(box.x + box.width).toBeLessThanOrEqual(cb.x + cb.width + 0.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
