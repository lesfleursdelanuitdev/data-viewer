import { test, expect, type Page } from '@playwright/test';

// demo/paging.html: #np has the default text switch; #icons has layout-switch="icons"; #both has
// layout-switch="both" with table-label="Rows" and cards-label="Tiles"; #custom has icons from
// script: table is the string '<b>T</b>', cards is one <i class="my-icon"> Node. Only #np and
// #none have remember-as; #none has layout-switch="none"; #odd has layout-switch="sideways".
async function open(page: Page) {
  await page.goto('/paging.html');
  await expect(page.locator('#custom .dv-layout button')).toHaveCount(2);
}
const sw = (page: Page, id: string) => page.locator(`#${id} .dv-layout`);

test('the default switch is words, as before', async ({ page }) => {
  await open(page);
  await expect(sw(page, 'np').getByRole('button', { name: 'Show a table' })).toHaveAttribute('aria-pressed', 'true');
  await expect(sw(page, 'np').locator('.dv-layout-text')).toHaveText(['Show a table', 'Show cards']);
  await expect(sw(page, 'np').locator('.dv-layout-icon')).toHaveCount(0);
  await expect(sw(page, 'np').locator('button').first()).not.toHaveAttribute('title');
});

test('icons only: the words are still the name and the title', async ({ page }) => {
  await open(page);
  const table = sw(page, 'icons').getByRole('button', { name: 'Show a table' });
  const cards = sw(page, 'icons').getByRole('button', { name: 'Show cards' });
  await expect(table).toHaveAttribute('title', 'Show a table');
  await expect(cards).toHaveAttribute('title', 'Show cards');
  const icon = table.locator('.dv-layout-icon');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon.locator('svg')).toHaveCount(1);
  // The words are there for screen readers only.
  await expect(table.locator('.dv-layout-text')).toHaveCSS('position', 'absolute');
  await expect(table).toHaveAttribute('aria-pressed', 'true');
  await cards.click();
  await expect(cards).toHaveAttribute('aria-pressed', 'true');
  await expect(table).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#icons .dv-cards')).toBeVisible();
});

test('both: the icon before words of its own', async ({ page }) => {
  await open(page);
  const table = sw(page, 'both').getByRole('button', { name: 'Rows', exact: true });
  await expect(table).toBeVisible();
  await expect(sw(page, 'both').getByRole('button', { name: 'Tiles' })).toBeVisible();
  const order = await table.evaluate((b) => [...b.children].map((c) => c.className));
  expect(order).toEqual(['dv-layout-icon', 'dv-layout-text']);
  await expect(table.locator('.dv-layout-text')).toBeVisible();
  await expect(table.locator('.dv-layout-text')).toHaveCSS('position', 'static');
  await expect(table).not.toHaveAttribute('title');
});

test('icons from script: strings are text, a Node is copied for each button', async ({ page }) => {
  await open(page);
  const table = sw(page, 'custom').getByRole('button', { name: 'Show a table' });
  const cards = sw(page, 'custom').getByRole('button', { name: 'Show cards' });
  await expect(table.locator('.dv-layout-icon')).toHaveText('<b>T</b>');
  await expect(table.locator('b')).toHaveCount(0);
  await expect(cards.locator('.my-icon')).toHaveCount(1);
  await cards.click();
  await table.click();
  await expect(cards.locator('.my-icon')).toHaveCount(1);
  await expect(table).toHaveAttribute('aria-pressed', 'true');
});

test('the switch shows without remember-as, which only decides whether the choice is kept', async ({ page }) => {
  await open(page);
  const cards = sw(page, 'sp').getByRole('button', { name: 'Show cards' });
  await cards.click();
  await expect(cards).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#sp .dv-cards')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  // With remember-as the choice is kept.
  await sw(page, 'np').getByRole('button', { name: 'Show cards' }).click();
  expect(await page.evaluate(() => localStorage.getItem('np-layout'))).toBe('cards');
});

test('layout-switch="none" shows no switch, and a saved choice still applies', async ({ page }) => {
  await open(page);
  await expect(page.locator('#none .dv-layout')).toHaveCount(0);
  await expect(page.locator('#none .dv-table')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('none-layout', 'cards'));
  await open(page);
  await expect(page.locator('#none .dv-cards')).toBeVisible();
  await expect(page.locator('#none .dv-layout')).toHaveCount(0);
});

test('an unknown layout-switch value means words', async ({ page }) => {
  await open(page);
  await expect(sw(page, 'odd').locator('.dv-layout-text')).toHaveText(['Show a table', 'Show cards']);
  await expect(sw(page, 'odd').locator('.dv-layout-icon')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('icon buttons are at least 44 by 44', async ({ page }) => {
    await open(page);
    for (const b of await sw(page, 'icons').locator('button').all()) {
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
