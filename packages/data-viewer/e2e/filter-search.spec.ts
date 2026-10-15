import { test, expect, type Page } from '@playwright/test';

// demo/filter-search.html: #plants (12 plants in the browser, name and notes searchable,
// search-in, six filterable columns, url-state "plants", 5 per page); #orders (30 orders from a
// page-played server that sends facets for status; owner has neither facets nor options; kind has
// options A, B); #quiet (the plants with filter-chips="off" and search-submit-label="Go");
// #pammy (the pammy adapter, which supports one exact value per column). window.events keeps
// every dv-query as { on, q }.
type Ev = { on: string; q: Record<string, unknown> };
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: Ev[] }).events);
const lastQuery = async (page: Page, on: string) => (await events(page)).filter((e) => e.on === on).at(-1)?.q;
const names = (page: Page, id: string) => page.locator(`#${id} tbody th[scope=row]`).allTextContents();
const box = (page: Page, id: string) => page.locator(`#${id} input[type=search]`).first();
const filterButton = (page: Page, id: string) => page.locator(`#${id} .lfdln-filter-button`);
const filterLabel = (page: Page, id: string) => page.locator(`#${id} .lfdln-filter-button-text`);
const dialog = (page: Page, id: string) => page.locator(`#${id} [role=dialog]`);
const row = (page: Page, id: string, name: string) => dialog(page, id).locator('.lfdln-filter-row', { hasText: name });
const status = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-nav [role=status]`);

async function open(page: Page, query = '') {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`/filter-search.html${query}`);
  await expect(page.locator('#plants tbody tr').first()).toBeVisible();
  return problems;
}

async function applyStatus(page: Page, id: string, ...options: string[]) {
  await filterButton(page, id).click();
  await row(page, id, 'Status').click();
  for (const o of options) await dialog(page, id).getByRole('option', { name: o }).click();
  await dialog(page, id).getByRole('button', { name: 'Apply filter' }).click();
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the bar: search and its picker, then the filter button, then the layout switch', async ({ page }) => {
    const problems = await open(page);
    const parts = await page.locator('#plants .dv-bar > *').evaluateAll((els) => els.map((e) => e.className));
    expect(parts).toEqual(['dv-search', 'dv-filter', 'dv-layout']);
    await expect(page.locator('#plants .dv-search').getByRole('combobox', { name: 'Search in' }).locator('option'))
      .toHaveText(['All fields', 'Name', 'Notes']);
    await expect(filterLabel(page, 'plants')).toHaveText('Filter');
    await expect(page.locator('#plants .lfdln-filter-chips')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('search looks only at the marked columns; "Search in" narrows it to one', async ({ page }) => {
    await open(page);
    await box(page, 'plants').fill('rose');
    await expect.poll(() => names(page, 'plants')).toEqual(['Rose', 'Mint', 'Rosemary']); // Fern's owner is Rose Smith: not searched
    await page.locator('#plants').getByRole('combobox', { name: 'Search in' }).selectOption({ label: 'Notes' });
    await expect.poll(() => names(page, 'plants')).toEqual(['Mint']);
    expect(await lastQuery(page, 'plants')).toMatchObject({ search: 'rose', searchIn: 'notes', page: 1 });
  });

  test('Apply narrows the rows, goes to page 1 and fires dv-query with the filters; chips under the bar', async ({ page }) => {
    await open(page);
    await page.locator('#plants .lfdln-pagination-nav').getByRole('button', { name: 'Next' }).click();
    await expect(status(page, 'plants')).toContainText('Showing 6–10 of 12');
    await applyStatus(page, 'plants', 'sold');
    await expect.poll(() => names(page, 'plants')).toEqual(['Mint', 'Ivy']);
    await expect(status(page, 'plants')).toContainText('Showing 1–2 of 2');
    expect(await lastQuery(page, 'plants')).toMatchObject({ page: 1, filters: { status: ['sold'] } });
    await expect(filterLabel(page, 'plants')).toHaveText('sold');
    const chips = page.locator('#plants .dv-bar + .lfdln-filter-chips .lfdln-filter-chip');
    await expect(chips).toHaveText(['sold']);
    await page.locator('#plants').getByRole('button', { name: 'Remove sold' }).click();
    await expect(status(page, 'plants')).toContainText('of 12');
    await expect(page.locator('#plants .lfdln-filter-chips')).toHaveCount(0);
    expect((await lastQuery(page, 'plants'))!.filters).toBeUndefined();
  });

  test('messy values: prices as text, a year as a date, tags from a comma string', async ({ page }) => {
    await open(page);
    await filterButton(page, 'plants').click();
    await row(page, 'plants', 'Price').click();
    await dialog(page, 'plants').getByRole('textbox', { name: 'From' }).fill('3.5');
    await dialog(page, 'plants').getByRole('textbox', { name: 'To' }).fill('5');
    await row(page, 'plants', 'Planted').click();
    await dialog(page, 'plants').getByRole('button', { name: 'Recent', exact: true }).click();
    await dialog(page, 'plants').getByRole('button', { name: 'Apply filter' }).click();
    await expect.poll(() => names(page, 'plants')).toEqual(['Mint', 'Basil']); // Thyme's 3 is under 3.5; Sage and Rosemary are older
    await filterButton(page, 'plants').click();
    await row(page, 'plants', 'Tags').click();
    await expect(dialog(page, 'plants').getByRole('option')).toHaveText([/^flower\s*0$/, /^herb\s*2$/, /^shade\s*0$/, /^sun\s*1$/, /^tree\s*0$/]);
  });

  test('option counts follow the search', async ({ page }) => {
    await open(page);
    await filterButton(page, 'plants').click();
    await expect(dialog(page, 'plants').getByRole('option', { name: /^Ana/ }).locator('.lfdln-filter-count')).toHaveText('4');
    await page.keyboard.press('Escape');
    await box(page, 'plants').fill('ro');
    await expect.poll(() => names(page, 'plants')).toEqual(['Rose', 'Mint', 'Rosemary']);
    await filterButton(page, 'plants').click();
    await expect(dialog(page, 'plants').getByRole('option', { name: /^Ana/ }).locator('.lfdln-filter-count')).toHaveText('2');
    await expect(dialog(page, 'plants').getByRole('option', { name: /^Mei/ })).toHaveClass(/lfdln-filter-zero/);
  });

  test('url-state writes f.* and in; a reload restores them and the chips', async ({ page }) => {
    await open(page);
    await page.locator('#plants').getByRole('combobox', { name: 'Search in' }).selectOption({ label: 'Name' });
    await applyStatus(page, 'plants', 'growing', 'resting');
    const url = new URL(page.url());
    expect(url.searchParams.get('plants.in')).toBe('name');
    expect(url.searchParams.get('plants.f.status')).toBe('growing,resting');
    await page.reload();
    await expect(page.locator('#plants .lfdln-filter-chip')).toHaveText(['growing', 'resting']);
    await expect(page.locator('#plants').getByRole('combobox', { name: 'Search in' })).toHaveValue('name');
    await expect(status(page, 'plants')).toContainText('of 9');
    await expect(filterLabel(page, 'plants')).toHaveText('growing, resting');
  });

  test('server mode: facet counts, options without counts, no section without either', async ({ page }) => {
    await open(page);
    await expect(filterLabel(page, 'orders')).toHaveText('Narrow down');
    await filterButton(page, 'orders').click();
    await expect(dialog(page, 'orders').locator('.lfdln-filter-row-label')).toHaveText(['Status', 'Kind']);
    await expect(dialog(page, 'orders').getByRole('option', { name: /^Paid/ }).locator('.lfdln-filter-count')).toHaveText('10');
    await row(page, 'orders', 'Kind').click();
    await expect(dialog(page, 'orders').getByRole('option')).toHaveText(['A', 'B']);
    await expect(dialog(page, 'orders').locator('.lfdln-filter-count')).toHaveCount(0);
    await dialog(page, 'orders').getByRole('option', { name: 'B' }).click();
    await dialog(page, 'orders').getByRole('button', { name: 'Apply filter' }).click();
    expect(await lastQuery(page, 'orders')).toMatchObject({ page: 1, filters: { kind: ['B'] } });
    await expect(status(page, 'orders')).toContainText('of 8');
    await filterButton(page, 'orders').click();
    await expect(dialog(page, 'orders').getByRole('option', { name: /^Paid/ }).locator('.lfdln-filter-count')).toHaveText('3');
  });

  test('filter-chips="off" hides the chips; search-submit-label="Go" waits for Go', async ({ page }) => {
    await open(page);
    await applyStatus(page, 'quiet', 'sold');
    await expect.poll(() => names(page, 'quiet')).toEqual(['Mint', 'Ivy']);
    await expect(page.locator('#quiet .lfdln-filter-chips')).toHaveCount(0);
    const before = (await events(page)).length;
    await box(page, 'quiet').pressSequentially('iv', { delay: 30 });
    await page.waitForTimeout(600);
    expect((await events(page)).length).toBe(before);
    await page.locator('#quiet').getByRole('button', { name: 'Go' }).click();
    await expect.poll(() => names(page, 'quiet')).toEqual(['Ivy']);
  });

  test('an adapter that supports one exact value: no picker, no ranges, single choices', async ({ page }) => {
    await open(page);
    await expect(page.locator('#pammy tbody tr').first()).toBeVisible();
    await expect(page.locator('#pammy').getByRole('combobox', { name: 'Search in' })).toHaveCount(0);
    await filterButton(page, 'pammy').click();
    await expect(dialog(page, 'pammy').locator('.lfdln-filter-row-label')).toHaveText(['Cuisine']);
    await expect(dialog(page, 'pammy').getByRole('listbox')).not.toHaveAttribute('aria-multiselectable', 'true');
    const asked = page.waitForRequest((r) => r.url().includes('where.cuisine=French'));
    await dialog(page, 'pammy').getByRole('option', { name: 'French' }).click();
    await dialog(page, 'pammy').getByRole('button', { name: 'Apply filter' }).click();
    const url = new URL((await asked).url());
    expect([...url.searchParams.keys()].filter((k) => k === 'in' || k.startsWith('f.'))).toEqual([]);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the filter opens as a sheet from the list\'s button', async ({ page }) => {
    await open(page);
    await filterButton(page, 'plants').click();
    const sheet = page.locator('#plants dialog.lfdln-filter-sheet');
    await expect(sheet).toBeVisible();
    await row(page, 'plants', 'Status').click();
    await sheet.getByRole('option', { name: 'sold' }).click();
    await sheet.getByRole('button', { name: 'Apply filter' }).click();
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('#plants .lfdln-filter-chip')).toHaveText(['sold']);
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(scrolls).toBe(false);
  });
});
