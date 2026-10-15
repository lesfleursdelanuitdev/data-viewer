import { test, expect, type Page } from '@playwright/test';

// demo/adapters.html: viewers that load their own rows through adapter= and src=, from the
// demo server's fake data source (45 recipes: 20 "Spiced …", 20 "Rose …", 5 "Lemon …").
// #srv and #stubborn answer a "rose" search after 800 ms and anything else after 50 ms;
// #stubborn's adapter ignores the abort signal. #all gets a plain array, #flaky fails while
// the dv-fail cookie is set, #pammy uses the pammy adapter, whose script loads late.
async function open(page: Page) {
  await page.goto('/adapters.html');
  await expect(page.locator('#srv tbody tr')).toHaveCount(20);
}
const status = (page: Page, id: string) => page.locator(`#${id} .dv-pages [role=status]`);
const names = (page: Page, id: string) => page.locator(`#${id} tbody th[scope=row]`).allTextContents();

test('server mode: an answer with total pages on the server', async ({ page }) => {
  await open(page);
  await expect(status(page, 'srv')).toContainText('Showing 1–20 of 45');
  const asked = page.waitForRequest((r) => r.url().includes('/api/recipes?slow=rose&page=2'));
  await page.locator('#srv .dv-pages').getByRole('button', { name: 'Next' }).click();
  await asked;
  await expect(status(page, 'srv')).toContainText('Showing 21–40 of 45');
  await expect(page.locator('#srv tbody th[scope=row]').first()).toHaveText('Rose tea');
});

test('browser mode: an array answer is paged and searched in the browser', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { if (r.url().includes('all=1')) asked.push(r.url()); });
  await open(page);
  await expect(status(page, 'all')).toContainText('Showing 1–20 of 45');
  await page.locator('#all input[type=search]').fill('lemon');
  await expect(page.locator('#all tbody tr')).toHaveCount(5);
  await page.locator('#all thead').getByRole('button', { name: 'Name' }).click();
  await expect(page.locator('#all tbody th[scope=row]').first()).toHaveText('Lemon cake');
  // Loaded once; searching and sorting asked nothing more.
  expect(asked).toHaveLength(1);
});

test('failure keeps the last rows', async ({ page, context }) => {
  await open(page);
  await expect(page.locator('#flaky tbody tr')).toHaveCount(20);
  const before = await names(page, 'flaky');
  await context.addCookies([{ name: 'dv-fail', value: '1', url: 'http://localhost:4179' }]);
  await page.locator('#flaky input[type=search]').fill('lemon');
  const box = page.locator('#flaky .dv-error');
  await expect(box).toContainText("Couldn't load this list.");
  await expect(box).toHaveAttribute('role', 'alert');
  await expect(page.locator('#flaky .dv-root')).toHaveAttribute('aria-busy', 'false');
  expect(await names(page, 'flaky')).toEqual(before);
  await context.clearCookies();
  await box.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('#flaky tbody tr')).toHaveCount(5);
  await expect(page.locator('#flaky .dv-error')).toHaveCount(0);
  await expect(status(page, 'flaky')).toContainText('of 5');
});

for (const id of ['srv', 'stubborn']) {
  test(`out-of-order answers (${id})`, async ({ page }) => {
    await open(page);
    await expect(page.locator(`#${id} tbody tr`)).toHaveCount(20);
    const search = page.locator(`#${id} input[type=search]`);
    // The slow query goes out first, then the fast one overtakes it.
    const slow = page.waitForRequest((r) => r.url().includes('search=rose'));
    await search.fill('rose');
    await slow;
    await search.fill('lemon');
    await expect(page.locator(`#${id} tbody tr`)).toHaveCount(5);
    // Long after the slow answer would have come, the newer rows are still shown.
    await page.waitForTimeout(1200);
    await expect(page.locator(`#${id} tbody tr`)).toHaveCount(5);
    for (const name of await names(page, id)) expect(name).toMatch(/^Lemon /);
    await expect(status(page, id)).toContainText('of 5');
    await expect(page.locator(`#${id} .dv-root`)).toHaveAttribute('aria-busy', 'false');
  });
}

test('pammy adapter: waits for its script, sends per, reads items and total', async ({ page }) => {
  const asked = page.waitForRequest((r) => r.url().includes('/_pammy/api/data/postgres/demo/recipes'));
  await open(page);
  const url = new URL((await asked).url());
  expect(url.searchParams.get('per')).toBe('10');
  await expect(page.locator('#pammy tbody tr')).toHaveCount(10);
  await expect(status(page, 'pammy')).toContainText('Showing 1–10 of 45');
  await page.locator('#pammy thead').getByRole('button', { name: 'Name' }).click();
  await expect(page.locator('#pammy tbody th[scope=row]').first()).toHaveText('Lemon cake');
});

test('dv-query events still fire for listeners', async ({ page }) => {
  await open(page);
  await page.locator('#srv .dv-pages').getByRole('button', { name: 'Next' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { heard: number[] }).heard)).toContain(2);
});

test('an adapter that needs no src works without one', async ({ page }) => {
  await page.goto('/adapters.html');
  await expect(page.locator('#all tbody tr').first()).toBeVisible();
  await page.evaluate(async () => {
    const built = '/data-viewer.standalone.js';
    const { registerAdapter } = await import(/* @vite-ignore */ built);
    registerAdapter('fixed', { load: async (_q: unknown, o: { src: string }) => ({ rows: [{ name: `src=[${o.src}]` }] }) });
    const el = document.createElement('lfdln-data-viewer');
    el.id = 'nosrc';
    el.setAttribute('adapter', 'fixed');
    el.setAttribute('layout', 'table');
    el.innerHTML = '<lfdln-dv-column key="name" label="Name"></lfdln-dv-column>';
    document.body.prepend(el);
  });
  await expect(page.locator('#nosrc tbody th[scope=row]')).toHaveText(['src=[]']);
});
