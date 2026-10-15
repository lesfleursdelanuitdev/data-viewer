import { test, expect, type Page } from '@playwright/test';

// demo/paging.html: #np pages 120 rows in the browser with pager="numbers" and
// page-sizes="10,20,50" (page-size 10, url-state np, remember-as np-layout); #sp is the same from
// a server that answers after 100 ms (window.queries keeps what it was asked); #ad uses the json
// adapter; #one has 5 rows; #simple has page-sizes "15, junk, 5,-3,5" and page-size 10;
// #bad has page-sizes with nothing valid.
async function open(page: Page, query = '') {
  await page.goto(`/paging.html${query}`);
  await expect(page.locator('#np tbody tr').first()).toBeVisible();
}
const pages = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-nav`);
const status = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-nav [role=status]`);
const numbers = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-numbers`);
const picker = (page: Page, id: string) => page.locator(`#${id}`).getByLabel('Rows per page');
// What the numbers read, with the current page in [brackets].
const numbersText = (page: Page, id: string) =>
  numbers(page, id).evaluate((g) =>
    [...g.children].map((c) =>
      c.getAttribute('aria-current') === 'page' ? `[${c.querySelector('[aria-hidden]')!.textContent}]` : c.textContent!.trim(),
    ).join(' '));

test.describe('numbered pages', () => {
  test('first, last, current and neighbours, with gaps', async ({ page }) => {
    await open(page);
    const group = numbers(page, 'np');
    await expect(group).toHaveAttribute('role', 'group');
    await expect(group).toHaveAttribute('aria-label', 'Page numbers');
    expect(await numbersText(page, 'np')).toBe('[1] 2 … 12');
    await group.getByRole('button', { name: 'Page 12' }).click();
    await expect(status(page, 'np')).toContainText('Showing 111–120 of 120');
    expect(await numbersText(page, 'np')).toBe('1 … 11 [12]');
    await open(page, '?np.page=5');
    expect(await numbersText(page, 'np')).toBe('1 … 4 [5] 6 … 12');
    await group.getByRole('button', { name: 'Page 6' }).click();
    await expect(status(page, 'np')).toContainText('Showing 51–60 of 120');
    expect(page.url()).toContain('np.page=6');
  });

  test('the current page is marked and is not a button', async ({ page }) => {
    await open(page, '?np.page=5');
    const current = numbers(page, 'np').locator('[aria-current=page]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveText(/5/);
    expect(await current.evaluate((e) => e.tagName)).not.toBe('BUTTON');
    await expect(numbers(page, 'np').getByRole('button', { name: 'Page 5' })).toHaveCount(0);
    // Previous and Next stay, and the status is still the polite live region.
    await expect(pages(page, 'np').getByRole('button', { name: 'Previous' })).toBeEnabled();
    await expect(pages(page, 'np').getByRole('button', { name: 'Next' })).toBeEnabled();
    await expect(status(page, 'np')).toHaveAttribute('aria-live', 'polite');
    await expect(status(page, 'np')).toContainText('Page 5 of 12');
  });

  test('after pressing a number, focus stays in the pager', async ({ page }) => {
    await open(page);
    await numbers(page, 'np').getByRole('button', { name: 'Page 2' }).click();
    await expect(status(page, 'np')).toContainText('Showing 11–20');
    const focused = await page.evaluate(() => document.activeElement?.closest('.lfdln-pagination-nav') !== null);
    expect(focused).toBe(true);
  });

  test('one page means no numbers', async ({ page }) => {
    await open(page);
    await expect(status(page, 'one')).toContainText('Showing 1–5 of 5');
    await expect(numbers(page, 'one')).toHaveCount(0);
  });

  test('the simple pager has no numbers', async ({ page }) => {
    await open(page);
    await expect(numbers(page, 'simple')).toHaveCount(0);
    await expect(pages(page, 'simple').getByRole('button', { name: 'Next' })).toBeVisible();
  });

  test('server mode: numbers come from the total', async ({ page }) => {
    await open(page);
    await expect(status(page, 'sp')).toContainText('Showing 1–10 of 120');
    await numbers(page, 'sp').getByRole('button', { name: 'Page 12' }).click();
    await expect(status(page, 'sp')).toContainText('Showing 111–120 of 120');
    const last = await page.evaluate(() => (window as unknown as { queries: { page: number; size: number }[] }).queries.at(-1));
    expect(last).toMatchObject({ page: 12, size: 10 });
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('numbers collapse to "Page 5 of 12", targets are 44px, no sideways scroll', async ({ page }) => {
    await open(page, '?np.page=5');
    await expect(numbers(page, 'np')).toBeHidden();
    const now = pages(page, 'np').locator('.lfdln-pagination-now');
    await expect(now).toBeVisible();
    await expect(now).toHaveText('Page 5 of 12');
    // It sits between Previous and Next.
    const prev = (await pages(page, 'np').getByRole('button', { name: 'Previous' }).boundingBox())!;
    const next = (await pages(page, 'np').getByRole('button', { name: 'Next' }).boundingBox())!;
    const mid = (await now.boundingBox())!;
    expect(mid.x).toBeGreaterThan(prev.x + prev.width - 1);
    expect(mid.x + mid.width).toBeLessThan(next.x + 1);
    // The status doesn't say the page a second time on screen.
    await expect(status(page, 'np').locator('.lfdln-pagination-page')).toHaveCSS('position', 'absolute');
    expect(prev.height).toBeGreaterThanOrEqual(44);
    expect((await picker(page, 'np').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe('the page-size picker', () => {
  test('is labelled and lists the sizes', async ({ page }) => {
    await open(page);
    const select = picker(page, 'np');
    await expect(select).toHaveValue('10');
    expect(await select.locator('option').allTextContents()).toEqual(['10', '20', '50']);
    // A messy list is cleaned and page-size is added in order.
    expect(await picker(page, 'simple').locator('option').allTextContents()).toEqual(['5', '10', '15']);
    await expect(picker(page, 'simple')).toHaveValue('10');
    // Nothing valid, or no page-sizes: no picker.
    await expect(page.locator('#bad select')).toHaveCount(0);
    await expect(page.locator('#one select')).toHaveCount(0);
  });

  test('keeps the first row on screen', async ({ page }) => {
    await open(page, '?np.page=5');
    await expect(status(page, 'np')).toContainText('Showing 41–50 of 120');
    await picker(page, 'np').selectOption('20');
    // Row 41 is on page 3 of 20.
    await expect(status(page, 'np')).toContainText('Showing 41–60 of 120');
    await expect(page.locator('#np tbody tr')).toHaveCount(20);
    await picker(page, 'np').selectOption('50');
    await expect(status(page, 'np')).toContainText('Showing 1–50 of 120');
    expect(await numbersText(page, 'np')).toBe('[1] 2 3');
  });

  test('goes in the address, and leaves it at the starting size', async ({ page }) => {
    await open(page);
    await picker(page, 'np').selectOption('20');
    await expect(status(page, 'np')).toContainText('Showing 1–20');
    expect(new URL(page.url()).searchParams.get('np.size')).toBe('20');
    await picker(page, 'np').selectOption('10');
    await expect(status(page, 'np')).toContainText('Showing 1–10');
    expect(new URL(page.url()).searchParams.has('np.size')).toBe(false);
    // Back comes back to 20, forward to 10.
    await page.goBack();
    await expect(picker(page, 'np')).toHaveValue('20');
    await expect(status(page, 'np')).toContainText('Showing 1–20');
    await page.goForward();
    await expect(picker(page, 'np')).toHaveValue('10');
  });

  test('is restored from the address, which is checked against the list', async ({ page }) => {
    await open(page, '?np.size=50&np.page=2');
    await expect(picker(page, 'np')).toHaveValue('50');
    await expect(status(page, 'np')).toContainText('Showing 51–100 of 120');
    await open(page, '?np.size=33');
    await expect(picker(page, 'np')).toHaveValue('10');
    await expect(status(page, 'np')).toContainText('Showing 1–10 of 120');
  });

  test('with remember-as it is kept, and the address wins', async ({ page }) => {
    await open(page);
    await picker(page, 'np').selectOption('50');
    expect(await page.evaluate(() => localStorage.getItem('np-layout.size'))).toBe('50');
    await open(page);
    await expect(picker(page, 'np')).toHaveValue('50');
    await expect(status(page, 'np')).toContainText('Showing 1–50');
    // The remembered size is put in the address, so Back returns to what was on screen.
    expect(new URL(page.url()).searchParams.get('np.size')).toBe('50');
    await open(page, '?np.size=20');
    await expect(picker(page, 'np')).toHaveValue('20');
    // A list without remember-as remembers nothing.
    await picker(page, 'sp').selectOption('20');
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.endsWith('.size')))).toEqual(['np-layout.size']);
  });

  test('server mode: a new dv-query with the size', async ({ page }) => {
    await open(page, '?sp.page=3');
    await expect(status(page, 'sp')).toContainText('Showing 21–30 of 120');
    await picker(page, 'sp').selectOption('20');
    await expect(status(page, 'sp')).toContainText('Showing 21–40 of 120');
    await expect(page.locator('#sp tbody tr')).toHaveCount(20);
    const queries = await page.evaluate(() => (window as unknown as { queries: unknown[] }).queries);
    expect(queries.at(-1)).toEqual({ page: 2, search: '', sort: '', dir: 'asc', view: '', size: 20 });
    // Every query says its size.
    for (const q of queries) expect(q).toHaveProperty('size');
    expect(new URL(page.url()).searchParams.get('sp.size')).toBe('20');
  });

  test('server mode: a size from the address asks the host for it', async ({ page }) => {
    await open(page, '?sp.size=50');
    await expect(status(page, 'sp')).toContainText('Showing 1–50 of 120');
    await expect(picker(page, 'sp')).toHaveValue('50');
  });

  test('adapter: the new size is sent', async ({ page }) => {
    await open(page);
    await expect(status(page, 'ad')).toContainText('Showing 1–20 of 45');
    const asked = page.waitForRequest((r) => r.url().includes('/api/recipes?size=50'));
    await picker(page, 'ad').selectOption('50');
    await asked;
    await expect(status(page, 'ad')).toContainText('Showing 1–45 of 45');
    await expect(numbers(page, 'ad')).toHaveCount(0);
  });
});
