import { test, expect, type Page } from '@playwright/test';

// demo/select-missing.html: #bare (54 rows, selectable, 20 per page with a 50 choice, search-in,
// a filterable kind, views ''/cheap, url-state "bare") on a page without the select add-on;
// #plain, the same list, not selectable. demo/select-probe.html: #probe (a table), #probecards
// (cards) and #probetpl (custom cards), the rows plus one with no id, and a probe add-on
// registered after 200 ms. window.events collects each dv-select detail.
test.use({ viewport: { width: 1280, height: 900 } });

const NONE = { keys: [], all: false, except: [] };
const MISSING = 'lfdln-data-viewer: selectable needs data-viewer-select.js.';
const NO_KEY = 'lfdln-data-viewer: some rows have no key (row-key="id"), so they can\'t be ticked.';
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
type List = HTMLElement & { selected: (string | number)[]; selectedAll: boolean; clearSelection(): void; rows: unknown[] };
const selected = (page: Page, id: string) => page.evaluate((i) => (document.getElementById(i) as List).selected, id);
const setSelected = (page: Page, id: string, keys: (string | number)[]) =>
  page.evaluate(([i, k]) => { (document.getElementById(i as string) as List).selected = k as string[]; }, [id, keys] as const);

async function openMissing(page: Page) {
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/select-missing.html');
  await expect(page.locator('#bare tbody tr')).toHaveCount(20);
  await expect(page.locator('#plain tbody tr')).toHaveCount(20);
  return warnings;
}

async function openProbe(page: Page) {
  const warnings: string[] = [];
  page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
  await page.goto('/select-probe.html');
  await expect(page.locator('#probe .probe-box').first()).toBeVisible();
  return warnings;
}

test.describe('without the add-on', () => {
  test('selectable without the add-on draws no boxes and warns once', async ({ page }) => {
    const warnings = await openMissing(page);
    await page.locator('#bare thead').getByRole('button', { name: 'Name' }).click();
    await page.locator('#bare').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#bare .lfdln-pagination-nav [role=status]')).toContainText('21');
    await expect(page.locator('#bare .dv-select-cell')).toHaveCount(0);
    await expect(page.locator('#bare input[type=checkbox]')).toHaveCount(0);
    await page.waitForTimeout(100);
    expect(warnings.filter((w) => w === MISSING)).toHaveLength(1);
  });

  test('a list that isn\'t selectable draws as before', async ({ page }) => {
    const warnings = await openMissing(page);
    await expect(page.locator('#plain thead th')).toHaveCount(3 + 1);
    await expect(page.locator('#plain [data-selecting]')).toHaveCount(0);
    await expect(page.locator('#plain .dv-selected')).toHaveCount(0);
    await expect(page.locator('#plain .dv-select-cell')).toHaveCount(0);
    await expect(page.locator('#plain tbody tr').first()).not.toHaveAttribute('class', /./);
    await expect(page.locator('#plain tbody tr').first()).not.toHaveAttribute('aria-selected', /./);
    expect(await selected(page, 'plain')).toEqual([]);
    expect(warnings.filter((w) => w === NO_KEY)).toEqual([]);
  });

  test('selected round-trips keys as strings and fires no event', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', [7, '7', 3, '']);
    expect(await selected(page, 'bare')).toEqual(['7', '3']);
    expect(await events(page)).toEqual([]);
    expect(await page.evaluate(() => (document.getElementById('bare') as List).selectedAll)).toBe(false);
  });

  test('a new search clears the selection and fires dv-select once', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.locator('#bare input[type=search]').fill('rose');
    await expect(page.locator('#bare tbody tr')).toHaveCount(9);
    expect(await selected(page, 'bare')).toEqual([]);
    expect(await events(page)).toEqual([NONE]);
  });

  test('"Search in" clears it', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.locator('#bare').getByRole('combobox', { name: 'Search in' }).selectOption({ label: 'Name' });
    await expect.poll(() => events(page)).toEqual([NONE]);
    expect(await selected(page, 'bare')).toEqual([]);
  });

  test('a filter clears it', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    const dialog = page.locator('#bare [role=dialog]');
    await page.locator('#bare .lfdln-filter-button').click();
    await dialog.getByRole('option', { name: /Herb/ }).click();
    await dialog.getByRole('button', { name: 'Apply filter' }).click();
    await expect(page.locator('#bare tbody tr')).toHaveCount(18);
    expect(await selected(page, 'bare')).toEqual([]);
    expect(await events(page)).toEqual([NONE]);
  });

  test('a view clears it', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.locator('#bare .dv-views').getByRole('link', { name: 'Cheap' }).click();
    await expect(page.locator('#bare .dv-views [aria-current=true]')).toHaveText('Cheap');
    expect(await selected(page, 'bare')).toEqual([]);
    expect(await events(page)).toEqual([NONE]);
  });

  test('sorting, the next page and a new page size keep it', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.locator('#bare thead').getByRole('button', { name: 'Name' }).click();
    await expect(page.locator('#bare thead th[aria-sort=ascending]')).toHaveCount(1);
    await page.locator('#bare').getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#bare .lfdln-pagination-nav [role=status]')).toContainText('21');
    await page.locator('#bare').getByRole('combobox', { name: 'Rows per page' }).selectOption('50');
    await expect(page.locator('#bare tbody tr')).toHaveCount(50);
    expect(await selected(page, 'bare')).toEqual(['1', '2']);
    expect(await events(page)).toEqual([]);
  });

  test('Back to an older search clears it', async ({ page }) => {
    await openMissing(page);
    // Sorting adds a history entry; the search then replaces it, so Back is the blank search.
    await page.locator('#bare thead').getByRole('button', { name: 'Name' }).click();
    await expect(page).toHaveURL(/bare\.sort=name/);
    await page.locator('#bare input[type=search]').fill('rose');
    await expect(page).toHaveURL(/bare\.search=rose/);
    await setSelected(page, 'bare', ['1', '2']);
    await page.goBack();
    await expect(page.locator('#bare tbody tr')).toHaveCount(20);
    expect(await selected(page, 'bare')).toEqual([]);
    expect(await events(page)).toEqual([NONE]);
  });

  test('clearSelection() fires dv-select', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.evaluate(() => (document.getElementById('bare') as List).clearSelection());
    expect(await events(page)).toEqual([NONE]);
    expect(await selected(page, 'bare')).toEqual([]);
  });

  test('browser mode: keys whose rows are gone are dropped, with no event', async ({ page }) => {
    await openMissing(page);
    await setSelected(page, 'bare', ['1', '2']);
    await page.evaluate(() => {
      const list = document.getElementById('bare') as List;
      list.rows = list.rows.filter((r) => (r as { id: number }).id !== 2);
    });
    await expect(page.locator('#bare tbody tr').nth(1)).toContainText('Mint 1');
    expect(await selected(page, 'bare')).toEqual(['1']);
    expect(await events(page)).toEqual([]);
  });
});

test.describe('with a probe add-on', () => {
  test('an add-on registered later draws the boxes', async ({ page }) => {
    await openProbe(page);
    await expect(page.locator('#probe .probe-box')).toHaveCount(21);
    await expect(page.locator('#probe thead th').first()).toHaveClass('dv-select-cell');
    await expect(page.locator('#probe tbody tr').first().locator('td').first()).toHaveClass('dv-select-cell');
  });

  test('ticking a box fires dv-select, and the add-on\'s bar replaces .dv-bar', async ({ page }) => {
    await openProbe(page);
    const first = page.locator('#probe tbody tr').first();
    await first.locator('.probe-box').check();
    expect(await events(page)).toEqual([{ keys: ['1'], all: false, except: [] }]);
    await expect(page.locator('#probe .probe-bar')).toHaveText('1');
    await expect(page.locator('#probe .dv-bar')).toHaveCount(0);
    await expect(page.locator('#probe > .dv-root')).toHaveAttribute('data-selecting', '');
    await expect(first).toHaveClass('dv-selected');
    await expect(first).toHaveAttribute('aria-selected', 'true');
  });

  test('unticking the last box clears the selection and brings .dv-bar back', async ({ page }) => {
    await openProbe(page);
    const box = page.locator('#probe tbody tr').first().locator('.probe-box');
    await box.check();
    await expect(page.locator('#probe .probe-bar')).toHaveText('1');
    await box.uncheck();
    expect(await events(page)).toEqual([{ keys: ['1'], all: false, except: [] }, NONE]);
    await expect(page.locator('#probe .dv-bar')).toHaveCount(1);
    await expect(page.locator('#probe .probe-bar')).toHaveCount(0);
    await expect(page.locator('#probe > .dv-root')).not.toHaveAttribute('data-selecting', /.*/);
    await expect(page.locator('#probe tbody tr').first()).not.toHaveAttribute('aria-selected', /./);
  });

  test('the header box ticks the page\'s tickable rows', async ({ page }) => {
    await openProbe(page);
    await page.locator('#probe thead .probe-box').check();
    await expect(page.locator('#probe .probe-bar')).toHaveText('19');
    await expect(page.locator('#probe tbody tr.dv-selected')).toHaveCount(19);
  });

  // The warning is the real add-on's (it is given where the boxes are drawn): select.spec.ts.
  test('a row without a key gets a disabled box, and the viewer itself says nothing', async ({ page }) => {
    const warnings = await openProbe(page);
    await expect(page.locator('#probe .probe-box[aria-label="No id"]')).toBeDisabled();
    await expect(page.locator('#probe .probe-box[aria-label="Rose 1"]')).toBeEnabled();
    await page.waitForTimeout(100);
    expect(warnings.filter((w) => w === NO_KEY)).toEqual([]);
  });

  test('the built-in card draws headStart first and cls on the card', async ({ page }) => {
    await openProbe(page);
    const card = page.locator('#probecards li.lfdln-card').first();
    const box = card.locator('.lfdln-card-head > .probe-box');
    await expect(box).toHaveCount(1);
    expect(await card.locator('.lfdln-card-head').evaluate((h) => h.firstElementChild?.className)).toBe('probe-box');
    await expect(card).toHaveAttribute('class', 'lfdln-card');
    // The probe's box has no CSS of its own, so the title's ::after covers it: click it directly.
    await box.evaluate((b: HTMLInputElement) => b.click());
    await expect(card).toHaveAttribute('class', 'lfdln-card dv-selected');
    await expect(page.locator('#probecards .probe-bar')).toHaveText('1');
  });

  test('custom cards get the box in a slot of the viewer\'s own', async ({ page }) => {
    await openProbe(page);
    const card = page.locator('#probetpl li.dv-card-custom').first();
    expect(await card.evaluate((li) => li.firstElementChild?.className)).toBe('dv-select-slot');
    await expect(card).toContainText('Rose 1');
    await card.locator('.dv-select-slot > .probe-box').check();
    await expect(card).toHaveClass(/\bdv-selected\b/);
    await card.locator('.dv-select-slot > .probe-box').uncheck();
    await expect(card).not.toHaveClass(/\bdv-selected\b/);
  });
});
