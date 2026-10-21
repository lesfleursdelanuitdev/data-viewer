import { test, expect, type Page } from '@playwright/test';

// demo/loading.html: #srv (json adapter, a table, 10 a page, a pager), #cards (json, cards),
// #own (slot="loading" and loading-label), #rows (rows from window.giveRows()). The data comes
// late: each test holds /api/recipes until it lets it go. window.states[id] lists each list's
// drawings as states (loading, bar, list, pager); window.readies lists each dv-ready by id.
type Hold = { release: () => void };
async function holdApi(page: Page): Promise<Hold> {
  let release!: () => void;
  const gate = new Promise<void>((ok) => { release = ok; });
  await page.route('**/api/recipes**', async (route) => { await gate; await route.continue(); });
  return { release };
}
const states = (page: Page, id: string) => page.evaluate((i) => (window as unknown as { states: Record<string, string[]> }).states[i] ?? [], id);
const readies = (page: Page) => page.evaluate(() => (window as unknown as { readies: string[] }).readies);

test('the skeleton shows until the data arrives, then the whole list replaces it in one step', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  const srv = page.locator('#srv');
  await expect(srv.locator('.dv-loading')).toBeVisible();
  await expect(srv.locator('.dv-loading [role=status]')).toHaveText('Loading…');
  await expect(srv.locator('.dv-loading')).toHaveAttribute('aria-busy', 'true');
  await expect(srv.locator('.dv-sk-bar')).toBeVisible();
  expect(await srv.locator('.dv-sk-row').count()).toBeGreaterThan(1);
  // nothing of the real list yet
  await expect(srv.locator('.dv-bar, .dv-search, .dv-table, .lfdln-pagination-nav')).toHaveCount(0);
  await expect(srv).not.toHaveAttribute('ready', /.*/);
  // cards in the cards layout
  await expect(page.locator('#cards .dv-sk-cards .dv-sk-card').first()).toBeVisible();
  expect(await readies(page)).toEqual([]);

  hold.release();
  await expect(srv.locator('.dv-table tbody tr')).toHaveCount(10);
  await expect(srv).toHaveAttribute('ready', '');
  // one step: the loading state, then bar, list and pager together, never part of them
  expect(await states(page, 'srv')).toEqual(['loading', 'bar+list+pager']);
  expect(await states(page, 'cards')).toEqual(['loading', 'bar+list+pager']);
});

test('dv-ready fires once per list; later loads are busy, not the loading state', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  hold.release();
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  await expect.poll(async () => (await readies(page)).filter((id) => id === 'srv')).toEqual(['srv']);
  // a new page and a search: busy while loading, never the skeleton again
  await page.locator('#srv .lfdln-pagination-nav').getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('#srv .dv-table tbody tr').first()).toBeVisible();
  await page.locator('#srv').getByRole('searchbox').fill('Rose');
  await expect(page.locator('#srv .dv-table tbody tr')).toHaveCount(10);
  await expect(page.locator('#srv .dv-loading')).toHaveCount(0);
  expect((await states(page, 'srv'))!.filter((s) => s.includes('loading'))).toEqual(['loading']);
  expect((await readies(page)).filter((id) => id === 'srv')).toEqual(['srv']);
  // and every list got its one
  await page.evaluate(() => (window as unknown as { giveRows: () => void }).giveRows());
  await expect.poll(async () => [...(await readies(page))].sort()).toEqual(['cards', 'own', 'rows', 'srv']);
});

test('rows the page gives later: the loading state until then', async ({ page }) => {
  await page.goto('/loading.html');
  await expect(page.locator('#srv')).toHaveAttribute('ready', '');
  await expect(page.locator('#rows .dv-loading')).toBeVisible();
  await page.evaluate(() => (window as unknown as { giveRows: () => void }).giveRows());
  await expect(page.locator('#rows .dv-table tbody tr')).toHaveCount(2);
  expect(await states(page, 'rows')).toEqual(['loading', 'bar+list+pager']);
});

test('a loading state of the page\'s own (slot="loading") and loading-label', async ({ page }) => {
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  const own = page.locator('#own');
  await expect(own.locator('.dv-loading .own-loading')).toHaveText('Fetching the recipes…');
  await expect(own.locator('.dv-loading [role=status]')).toHaveText('Fetching the recipes');
  await expect(own.locator('.dv-sk-bar, .dv-sk-row')).toHaveCount(0);
  hold.release();
  await expect(own.locator('.dv-table tbody tr')).toHaveCount(5);
  await expect(own.locator('.own-loading')).toHaveCount(0);
});

test('before the script runs, the CSS keeps the space and shows a skeleton', async ({ page }) => {
  await page.goto('/loading.html?late');
  const srv = page.locator('#srv');
  const before = await srv.evaluate((el) => ({
    defined: customElements.get('lfdln-data-viewer') !== undefined,
    height: el.getBoundingClientRect().height,
    image: getComputedStyle(el).backgroundImage,
    columnShown: getComputedStyle(el.querySelector('lfdln-dv-column')!).display,
  }));
  expect(before.defined).toBe(false);
  expect(before.height).toBeGreaterThanOrEqual(200);
  expect(before.image).toContain('gradient');
  expect(before.columnShown).toBe('none');
  // its own loading child shows instead
  await expect(page.locator('#own .own-loading')).toBeVisible();
  await expect(page.locator('#srv')).toHaveAttribute('ready', '', { timeout: 5000 });
});

test('reduced motion: nothing pulses', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const hold = await holdApi(page);
  await page.goto('/loading.html');
  await expect(page.locator('#srv .dv-sk').first()).toBeVisible();
  expect(await page.locator('#srv .dv-sk').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  expect(await page.locator('#srv .dv-sk').first().evaluate((e) => getComputedStyle(e).animationName)).toBe('lfdln-dv-pulse');
  hold.release();
});
