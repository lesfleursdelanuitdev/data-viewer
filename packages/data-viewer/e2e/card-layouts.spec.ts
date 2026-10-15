import { test, expect, type Page } from '@playwright/test';

// demo/card-actions.html (see card-actions.spec.ts): #wrap says card-actions="wrap" (the new
// name for "footer"); #row says card-actions="row" with card-actions-max="10" and
// card-more-label="Others" inside #row-box; #mixed's third card says actionsAt: 'row'.
async function open(page: Page) {
  await page.goto('/card-actions.html');
  await expect(page.locator('#row .lfdln-card')).toHaveCount(3);
}
const card = (page: Page, id: string, n = 0) => page.locator(`#${id} .lfdln-card`).nth(n);
const names = (page: Page, id: string, n = 0) =>
  card(page, id, n).locator('.lfdln-card-actions').locator(':scope > button:not([hidden]), :scope > a:not([hidden]), :scope > .lfdln-card-actions-more button.lfdln-menu-button, :scope > .lfdln-card-more:not([hidden]) button.lfdln-menu-button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent!.trim()));
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
const frames = (page: Page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))));

test('wrap is footer under its new name', async ({ page }) => {
  await open(page);
  expect(await names(page, 'wrap')).toEqual(await names(page, 'foot'));
});

test('row: one line, what doesn\'t fit in the More menu ("Others"), the same dv-action', async ({ page }) => {
  await open(page);
  const box = page.locator('#row-box');
  await box.evaluate((b) => { b.style.width = '1000px'; });
  await frames(page);
  // Wide enough for every item (cards are at least 15rem; three to a row here).
  await box.evaluate((b) => { b.style.width = '260px'; });
  await frames(page);
  const shown = await names(page, 'row');
  expect(shown[0]).toBe('Order again');
  expect(shown.at(-1)).toBe('Others');
  expect(shown).not.toContain('🗑️Delete'); // danger goes into More first
  const row = card(page, 'row').locator('.lfdln-card-actions-row');
  expect(await row.evaluate((r) => r.scrollWidth <= r.clientWidth + 1)).toBe(true);
  await row.locator('.lfdln-card-more .lfdln-menu-button').click();
  await row.locator('.lfdln-card-more').getByRole('menuitem', { name: 'Delete' }).click();
  await page.locator('#row dialog.lfdln-menu-confirm').getByRole('button', { name: 'Delete' }).click();
  await expect.poll(() => events(page)).toEqual([{ on: 'row', id: 'delete', row: 1 }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a card can ask for a row of its own', async ({ page }) => {
  await open(page);
  await expect(card(page, 'mixed', 2).locator('.lfdln-card-actions-row')).toHaveCount(1);
  await expect(card(page, 'mixed', 0).locator('.lfdln-card-actions')).toHaveCount(0);
});
