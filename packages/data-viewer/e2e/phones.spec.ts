import { test, expect, type Page } from '@playwright/test';

// demo/phones.html: #wide has layout="table"; #keep has layout="table" phone-layout="table"; #mem
// has layout="cards" remember-as="mem"; #memkeep has phone-layout="table" remember-as="memkeep".
// window.layouts collects every dv-layout detail. Phones are 640 px wide or less.
const phone = { width: 390, height: 844 };
const wide = { width: 1280, height: 900 };

async function open(page: Page) {
  await page.goto('/phones.html');
  await expect(page.locator('#memkeep .dv-root')).toHaveCount(1);
}
const layouts = (page: Page) => page.evaluate(() => (window as unknown as { layouts: unknown[] }).layouts);
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);

test('layout="table" shows cards at 390 px', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#wide .dv-cards')).toBeVisible();
  await expect(page.locator('#wide .dv-table')).toHaveCount(0);
});

test('phone-layout="table" keeps a table at 390 px', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#keep .dv-table')).toBeVisible();
});

test('crossing 640 px switches both ways, with no dv-layout', async ({ page }) => {
  await page.setViewportSize(wide);
  await open(page);
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  await page.setViewportSize({ width: 600, height: 900 });
  await expect(page.locator('#wide .dv-cards')).toBeVisible();
  await expect(page.locator('#wide .dv-table')).toHaveCount(0);
  await page.setViewportSize(wide);
  await expect(page.locator('#wide .dv-table')).toBeVisible();
  await expect(page.locator('#wide .dv-cards')).toHaveCount(0);
  expect(await layouts(page)).toEqual([]);
});

test('the switch shows the layout drawn', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#wide .dv-layout').getByRole('button', { name: 'Show cards' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#wide .dv-layout').getByRole('button', { name: 'Show a table' })).toHaveAttribute('aria-pressed', 'false');
});

test('a choice is kept per mode', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#mem .dv-cards')).toBeVisible();
  await page.locator('#mem .dv-layout').getByRole('button', { name: 'Show a table' }).click();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  expect(await stored(page, 'mem.phone')).toBe('table');
  expect(await stored(page, 'mem')).toBeNull();
  expect(await layouts(page)).toEqual([{ layout: 'table' }]);

  // Wide: the list's own layout (cards), until a press there.
  await page.setViewportSize(wide);
  await expect(page.locator('#mem .dv-cards')).toBeVisible();
  await page.locator('#mem .dv-layout').getByRole('button', { name: 'Show a table' }).click();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  expect(await stored(page, 'mem')).toBe('table');

  await page.setViewportSize(phone);
  await page.reload();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
  await page.setViewportSize(wide);
  await page.reload();
  await expect(page.locator('#mem .dv-table')).toBeVisible();
});

test('a stored choice wins over phone-layout for its mode', async ({ page }) => {
  await page.setViewportSize(phone);
  await open(page);
  await expect(page.locator('#memkeep .dv-table')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('memkeep.phone', 'cards'));
  await page.reload();
  await expect(page.locator('#memkeep .dv-cards')).toBeVisible();
  await expect(page.locator('#memkeep .dv-table')).toHaveCount(0);
});
