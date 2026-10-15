import { test, expect, type Page } from '@playwright/test';

// demo/index.html loads only the standalone script: #plain (search as you type), #in (search-in,
// fields from <option> children), #submit (search-in, submit-label="Search", fields from script),
// #icon (submit, a magnifier button), #inform (inside a page's <form>). window.events keeps every
// search-change as { on, search, in }.
type Ev = { on: string; search: string; in: string };
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: Ev[] }).events);
const box = (page: Page, id: string) => page.locator(`#${id} input[type=search]`);

async function open(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/');
  await expect(box(page, 'plain')).toBeVisible();
  return problems;
}

test('typing fast fires one search-change after the pause', async ({ page }) => {
  const problems = await open(page);
  await expect(box(page, 'plain')).toHaveAccessibleName('Search');
  await expect(box(page, 'plain')).toHaveAttribute('placeholder', 'Search plants');
  await box(page, 'plain').pressSequentially('fox', { delay: 40 });
  await page.waitForTimeout(150);
  expect(await events(page)).toEqual([]); // still typing, as far as it knows
  await expect.poll(() => events(page)).toEqual([{ on: 'plain', search: 'fox', in: '' }]);
  await page.waitForTimeout(500);
  expect(await events(page)).toHaveLength(1); // once
  await expect(page.locator('#lfdln-search-style')).toHaveCount(1);
  expect(problems).toEqual([]);
});

test('Enter fires at once', async ({ page }) => {
  await open(page);
  await box(page, 'plain').fill('rose');
  await box(page, 'plain').press('Enter');
  expect(await events(page)).toEqual([{ on: 'plain', search: 'rose', in: '' }]);
  await page.waitForTimeout(500);
  expect(await events(page)).toHaveLength(1); // the pending one was dropped
});

test('× empties the box, fires an empty search and keeps focus in the box', async ({ page }) => {
  await open(page);
  await box(page, 'plain').fill('rose');
  await box(page, 'plain').press('Enter');
  const clear = page.locator('#plain').getByRole('button', { name: 'Clear' });
  await clear.click();
  await expect(box(page, 'plain')).toHaveValue('');
  await expect(box(page, 'plain')).toBeFocused();
  await expect(clear).toHaveCount(0);
  expect((await events(page)).at(-1)).toEqual({ on: 'plain', search: '', in: '' });
});

test('Esc with text clears it too', async ({ page }) => {
  await open(page);
  await box(page, 'plain').fill('rose');
  await box(page, 'plain').press('Escape');
  await expect(box(page, 'plain')).toHaveValue('');
  expect(await events(page)).toEqual([{ on: 'plain', search: '', in: '' }]);
});

test('with submit-label, typing fires nothing; Enter or the button fires once', async ({ page }) => {
  await open(page);
  await box(page, 'submit').pressSequentially('fern', { delay: 20 });
  await page.waitForTimeout(600);
  expect(await events(page)).toEqual([]);
  await box(page, 'submit').press('Enter');
  expect(await events(page)).toEqual([{ on: 'submit', search: 'fern', in: '' }]);
  await box(page, 'submit').fill('moss');
  await page.locator('#submit').getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForTimeout(400);
  expect(await events(page)).toEqual([
    { on: 'submit', search: 'fern', in: '' },
    { on: 'submit', search: 'moss', in: '' },
  ]);
});

test('the picker lists "All fields" and the fields; picking with text fires at once', async ({ page }) => {
  await open(page);
  const picker = page.locator('#in').getByRole('combobox', { name: 'Search in' });
  await expect(picker.locator('option')).toHaveText(['All fields', 'Name', 'Owner', 'Notes']);
  await expect(picker).toHaveValue('');
  await box(page, 'in').fill('rose');
  await box(page, 'in').press('Enter');
  await picker.selectOption({ label: 'Name' });
  expect(await events(page)).toEqual([
    { on: 'in', search: 'rose', in: '' },
    { on: 'in', search: 'rose', in: 'name' },
  ]);
  // From script too (fields property), and `in` set from script shows in the picker.
  const scripted = page.locator('#submit').getByRole('combobox', { name: 'Search in' });
  await expect(scripted.locator('option')).toHaveText(['All fields', 'Name', 'Owner']);
  await page.evaluate(() => { document.querySelector('#submit')!.setAttribute('in', 'owner'); });
  await expect(scripted).toHaveValue('owner');
});

test('with a submit button and no text, the picker fires nothing; without one it always fires', async ({ page }) => {
  await open(page);
  await page.locator('#submit').getByRole('combobox', { name: 'Search in' }).selectOption('owner');
  expect(await events(page)).toEqual([]);
  await page.locator('#in').getByRole('combobox', { name: 'Search in' }).selectOption('notes');
  expect(await events(page)).toEqual([{ on: 'in', search: '', in: 'notes' }]);
});

test('the icon button is named "Search" and fires', async ({ page }) => {
  await open(page);
  const button = page.locator('#icon .lfdln-search-submit');
  await expect(button).toHaveAccessibleName('Search');
  await expect(button.locator('svg')).toHaveCount(1);
  await box(page, 'icon').fill('ivy');
  await button.click();
  expect(await events(page)).toEqual([{ on: 'icon', search: 'ivy', in: '' }]);
});

test('Enter inside a page form searches and does not submit the form', async ({ page }) => {
  await open(page);
  await box(page, 'inform').fill('oak');
  await box(page, 'inform').press('Enter');
  expect(await events(page)).toEqual([{ on: 'inform', search: 'oak', in: '' }]);
  expect(await page.evaluate(() => (window as unknown as { submitted?: boolean }).submitted)).toBeUndefined();
  await expect(page).toHaveURL(/\/$/);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the picker sits under the box; targets are at least 44px; inputs are 16px', async ({ page }) => {
    await open(page);
    const field = await page.locator('#submit .lfdln-search-field').boundingBox();
    const picker = await page.locator('#submit .lfdln-search-in').boundingBox();
    const button = await page.locator('#submit .lfdln-search-submit').boundingBox();
    expect(picker!.y).toBeGreaterThanOrEqual(field!.y + field!.height - 1);
    expect(Math.abs(button!.y - field!.y)).toBeLessThan(2); // the button stays beside the box
    for (const b of [field!, picker!, button!]) expect(b.height).toBeGreaterThanOrEqual(44);
    expect(button!.width).toBeGreaterThanOrEqual(44);
    await box(page, 'submit').fill('x');
    const clear = await page.locator('#submit .lfdln-search-clear').boundingBox();
    expect(clear!.height).toBeGreaterThanOrEqual(44);
    expect(clear!.width).toBeGreaterThanOrEqual(44);
    expect(await box(page, 'submit').evaluate((e) => getComputedStyle(e).fontSize)).toBe('16px');
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(scrolls).toBe(false);
  });
});
