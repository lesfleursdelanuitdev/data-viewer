import { test, expect, type Page } from '@playwright/test';

// demo/config.html: viewers set up by config modules in demo/config/. list-object.js is an object
// (12 rows, 5 a page, a "Water it" menu item, and a typo key `colums`); list-function.js is a
// function whose load() answers 3 rows after 300 ms; missing.js doesn't exist; load-fails.js's
// load() throws. Their dv-action handlers push to window.heard.
async function open(page: Page) {
  await page.goto('/config.html');
  await expect(page.locator('#obj tbody tr')).toHaveCount(5);
}
const heard = (page: Page) => page.evaluate(() => (window as unknown as { heard: string[] }).heard);
async function act(page: Page, id: string, item: string) {
  await page.locator(`#${id} tbody tr`).first().locator('.dv-menu-button').click();
  await page.locator(`#${id} .dv-menu`).getByRole('menuitem', { name: item }).click();
}

test('an object config sets the list up, and its on handlers hear events', async ({ page }) => {
  await open(page);
  await expect(page.locator('#obj table')).toHaveAttribute('aria-label', 'Plants (object)');
  await expect(page.locator('#obj .dv-pages [role=status]')).toContainText('Showing 1–5 of 12');
  await act(page, 'obj', 'Water it');
  expect(await heard(page)).toEqual(['object obj water Plant 1']);
});

test('unknown keys are warned about once per page', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  await open(page);
  await expect(page.locator('#sw tbody tr')).toHaveCount(5);
  // #obj and #sw both use list-object.js.
  expect(warnings.filter((w) => w.includes('colums'))).toHaveLength(1);
});

test('a function config gets the element, and load() fills the rows while busy', async ({ page }) => {
  await page.goto('/config.html');
  const fn = page.locator('#fn');
  await expect(fn).toHaveAttribute('busy', '');
  await expect(fn.locator('.dv-empty')).toHaveCount(0);
  await expect(fn.locator('tbody tr')).toHaveCount(3);
  await expect(fn).not.toHaveAttribute('busy');
  await expect(fn).toHaveAttribute('data-saw', 'fn');
  await act(page, 'fn', 'Prune it');
  expect(await heard(page)).toContain('function fn prune Fern');
});

test('a file that fails to load shows the error box naming it', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await open(page);
  const box = page.locator('#bad .dv-error');
  await expect(box).toBeVisible();
  await expect(box).toContainText('./config/missing.js');
  await expect(page.locator('#bad')).not.toHaveAttribute('busy');
  expect(errors.some((e) => /missing\.js|Failed to fetch|import/i.test(e))).toBe(true);
});

test('load() that throws shows the usual error box', async ({ page }) => {
  await open(page);
  await expect(page.locator('#fails .dv-error')).toContainText("Couldn't load this list.");
});

test('a new config replaces the old one and its handlers', async ({ page }) => {
  await open(page);
  await page.locator('#sw').evaluate((el) => el.setAttribute('config', './config/list-function.js'));
  await expect(page.locator('#sw table')).toHaveAttribute('aria-label', 'Plants (function)');
  await expect(page.locator('#sw tbody tr')).toHaveCount(3);
  await page.evaluate(() => { (window as unknown as { heard: string[] }).heard.length = 0; });
  await act(page, 'sw', 'Prune it');
  expect(await heard(page)).toEqual(['function sw prune Fern']);
});

test('after a reconnect, handlers are not doubled and the config is not applied again', async ({ page }) => {
  await open(page);
  // Set after the config loaded: this wins, and stays after a reconnect.
  await page.locator('#obj').evaluate((el) => {
    (el as unknown as { rows: unknown[] }).rows = [{ name: 'Set by the page', n: 1 }];
    const parent = el.parentElement!;
    el.remove();
    parent.append(el);
  });
  await expect(page.locator('#obj tbody tr')).toHaveCount(1);
  await expect(page.locator('#obj tbody tr').first()).toContainText('Set by the page');
  await act(page, 'obj', 'Water it');
  expect(await heard(page)).toEqual(['object obj water Set by the page']);
});

test('configure() applies the same object or function from script', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const { configure, defineList } = (window as unknown as { dv: { configure: (el: Element, c: unknown) => Promise<void>; defineList: (c: unknown) => unknown } }).dv;
    const el = document.querySelector('#js')!;
    await configure(el, defineList({ columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'A' }, { name: 'B' }] }));
  });
  await expect(page.locator('#js tbody tr')).toHaveCount(2);
  await page.evaluate(async () => {
    const { configure } = (window as unknown as { dv: { configure: (el: Element, c: unknown) => Promise<void> } }).dv;
    await configure(document.querySelector('#js')!, (list: { label: string }) => { list.label = 'Named by a function'; });
  });
  await expect(page.locator('#js table')).toHaveAttribute('aria-label', 'Named by a function');
});

test('a relative config is read against the page, from the built standalone script', async ({ page }) => {
  await page.goto('/sub/config.html');
  await expect(page.locator('#here tbody tr')).toHaveCount(1);
  await expect(page.locator('#here tbody tr').first()).toContainText('Beside the page');
});
