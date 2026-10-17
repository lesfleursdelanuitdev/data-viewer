import { test, expect, type Page } from '@playwright/test';

// demo/sort-cards.html: #list, three products in cards (url-state "s"; Name, Price, Added and a
// hidden Test are sortable, Kind is not); #srv, 45 recipes from the fake server in cards (Name and
// Minutes sortable). window.events keeps every dv-query as { on, q }.
type Ev = { on: string; q: Record<string, unknown> };
async function open(page: Page, query = '') {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`/sort-cards.html${query}`);
  await expect(page.locator('#list .lfdln-card').first()).toBeVisible();
  return problems;
}
const picker = (page: Page, id = 'list') => page.locator(`#${id}`).getByRole('combobox', { name: 'Sort by' });
const titles = (page: Page, id = 'list') => page.locator(`#${id} .lfdln-card-title`).allTextContents();

test.use({ viewport: { width: 1280, height: 900 } });

test('cards show a "Sort by" picker, two choices per sortable column, worded by type', async ({ page }) => {
  const problems = await open(page);
  await expect(picker(page).locator('option')).toHaveText([
    'Default order',
    'Name, A to Z', 'Name, Z to A',
    'Price, low to high', 'Price, high to low',
    'Added, oldest first', 'Added, newest first',
    'Test, no first', 'Test, yes first',
  ]);
  await expect(picker(page)).toHaveValue('');
  // As tall as the bar's buttons.
  const [a, b] = await Promise.all([picker(page).boundingBox(), page.locator('#list .dv-layout button').first().boundingBox()]);
  expect(Math.abs(a!.height - b!.height)).toBeLessThanOrEqual(2);
  expect(problems).toEqual([]);
});

test('picking sorts the cards and writes the address; Back restores', async ({ page }) => {
  await open(page);
  await picker(page).selectOption({ label: 'Price, high to low' });
  await expect.poll(() => titles(page)).toEqual(['Tea set', 'Rose box', 'Sample']);
  await expect(page).toHaveURL(/[?&]s\.sort=price/);
  await expect(page).toHaveURL(/[?&]s\.dir=desc/);
  await picker(page).selectOption({ label: 'Added, newest first' });
  await expect.poll(() => titles(page)).toEqual(['Sample', 'Rose box', 'Tea set']);
  await page.goBack();
  await expect.poll(() => titles(page)).toEqual(['Tea set', 'Rose box', 'Sample']);
  await expect(picker(page)).toHaveValue('desc:price');
  await picker(page).selectOption({ label: 'Default order' });
  await expect.poll(() => titles(page)).toEqual(['Rose box', 'Tea set', 'Sample']);
  await expect(page).not.toHaveURL(/s\.sort=/);
});

test('the address sets the picker on load (a hidden column too)', async ({ page }) => {
  await open(page, '?s.sort=test&s.dir=desc');
  await expect(picker(page)).toHaveValue('desc:test');
  await expect.poll(() => titles(page)).toEqual(['Sample', 'Rose box', 'Tea set']);
});

test('a sort by a column with no choice shows that column, not "Default order"', async ({ page }) => {
  await open(page, '?s.sort=kind&s.dir=desc');
  await expect.poll(() => titles(page)).toEqual(['Tea set', 'Rose box', 'Sample']);
  await expect(picker(page)).toHaveValue('desc:kind');
  await expect(picker(page).locator('option:checked')).toHaveText('Kind');
  await picker(page).selectOption({ label: 'Name, A to Z' });
  await expect.poll(() => titles(page)).toEqual(['Rose box', 'Sample', 'Tea set']);
  await expect(picker(page).locator('option')).toHaveCount(9);
});

test('the table has no picker; a header sort shows in the picker after switching to cards', async ({ page }) => {
  await open(page);
  await page.locator('#list').getByRole('button', { name: 'Show a table' }).click();
  await expect(picker(page)).toHaveCount(0);
  await page.locator('#list thead').getByRole('button', { name: 'Name' }).click();
  await page.locator('#list thead').getByRole('button', { name: 'Name' }).click();
  await page.locator('#list').getByRole('button', { name: 'Show cards' }).click();
  await expect(picker(page)).toHaveValue('desc:name');
  await expect.poll(() => titles(page)).toEqual(['Tea set', 'Sample', 'Rose box']);
});

test('server mode: picking fires dv-query with sort and dir', async ({ page }) => {
  await open(page);
  await expect(page.locator('#srv .lfdln-card').first()).toBeVisible();
  await picker(page, 'srv').selectOption({ label: 'Minutes, high to low' });
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { events: Ev[] }).events))
    .filter((e) => e.on === 'srv').at(-1)?.q).toMatchObject({ sort: 'minutes', dir: 'desc', page: 1 });
  await expect(picker(page, 'srv')).toHaveValue('desc:minutes');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test('cards on a phone get the picker, 44 px tall', async ({ page }) => {
    await open(page);
    await expect(picker(page)).toBeVisible();
    expect((await picker(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

// The search box keeps one width whichever layout shows: cards add "Sort by" to the bar, and the
// search never grows into (or gives up) the line's free space for it.
for (const [where, viewport] of [['wide', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  test.describe(`search width (${where})`, () => {
    test.use({ viewport });
    test('the search box is as wide in cards as in the table', async ({ page }) => {
      await open(page);
      const full = page.locator('#full');
      const width = () => full.locator('.dv-search').evaluate((e) => ({
        search: e.getBoundingClientRect().width,
        input: e.querySelector('input')!.getBoundingClientRect().width,
        picker: (() => { const a = e.querySelector('select')!.getBoundingClientRect(); const b = e.querySelector('input')!.getBoundingClientRect(); return a.top < b.bottom && b.top < a.bottom; })(),
      }));
      await expect(full.locator('.dv-table')).toBeVisible();
      const table = await width();
      await full.locator('.dv-layout button').nth(1).click();
      await expect(full.getByRole('combobox', { name: 'Sort by' })).toBeVisible();
      const cards = await width();
      expect(Math.abs(cards.search - table.search)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(cards.input - table.input)).toBeLessThanOrEqual(0.5);
      // On a wide screen "Search in" stays beside the box, in both layouts.
      if (where === 'wide') expect([table.picker, cards.picker]).toEqual([true, true]);
    });
  });
}

// Every dropdown in the list (Search in, Sort by, Rows per page) is the select package's: the gap
// before its text equals the gap after its chevron (±1 px), on a wide screen and on a phone.
for (const [where, viewport] of [['wide', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]] as const) {
  test.describe(`dropdowns (${where})`, () => {
    test.use({ viewport });
    test('each dropdown has even spacing around its text and chevron', async ({ page }) => {
      await open(page);
      const full = page.locator('#full');
      await full.locator('.dv-layout button').nth(1).click();
      const names = ['Search in', 'Sort by', 'Rows per page'];
      for (const name of names) {
        const sel = full.getByRole('combobox', { name });
        await expect(sel).toBeVisible();
        const g = await sel.evaluate((s: HTMLSelectElement) => {
          const cs = getComputedStyle(s);
          const chev = s.parentElement!.querySelector(':scope > .lfdln-select-chevron svg')!.getBoundingClientRect();
          return { appearance: cs.appearance, left: parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), right: s.getBoundingClientRect().right - chev.right };
        });
        expect(g.appearance, name).toBe('none');
        expect(Math.abs(g.left - g.right), `${name}: ${JSON.stringify(g)}`).toBeLessThanOrEqual(1);
      }
    });
  });
}
