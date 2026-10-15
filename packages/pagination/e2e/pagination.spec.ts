import { test, expect, type Page } from '@playwright/test';

// demo/html-only.html loads only the standalone script: #a (120 rows, page 5 of 10, sizes
// 10/20/50, numbers, label "Plant pages"), #simple (45, Previous / Next), #seven (70, page 4,
// numbers), #solo (one size), #one (5 rows), #past (page 99 of 12), #none (0). window.events keeps
// every page-change. demo/index.html sets #js up from script (200 rows, German words and numbers).
const nav = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-nav`);
const status = (page: Page, id: string) => page.locator(`#${id} [role=status]`);
const numbers = (page: Page, id: string) => page.locator(`#${id} .lfdln-pagination-numbers`);
const events = (page: Page) => page.evaluate(() => (window as unknown as { events: unknown[] }).events);
// What the numbers read, with the current page in [brackets].
const numbersText = (page: Page, id: string) =>
  numbers(page, id).evaluate((g) =>
    [...g.children].map((c) =>
      c.getAttribute('aria-current') === 'page' ? `[${c.querySelector('[aria-hidden]')!.textContent}]` : c.textContent!.trim(),
    ).join(' '));

async function htmlOnly(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto('/html-only.html');
  await expect(status(page, 'a')).toBeVisible();
  return problems;
}

test.describe('HTML only', () => {
  test('the status, the numbers and the picker, from attributes', async ({ page }) => {
    const problems = await htmlOnly(page);
    await expect(nav(page, 'a')).toHaveAttribute('aria-label', 'Plant pages');
    await expect(status(page, 'a')).toHaveAttribute('aria-live', 'polite');
    await expect(status(page, 'a')).toHaveText(/^Showing 41–50 of 120 · ,? ?Page 5 of 12$/);
    await expect(numbers(page, 'a')).toHaveAttribute('role', 'group');
    await expect(numbers(page, 'a')).toHaveAttribute('aria-label', 'Page numbers');
    expect(await numbersText(page, 'a')).toBe('1 … 4 [5] 6 … 12');
    const current = numbers(page, 'a').locator('[aria-current=page]');
    expect(await current.evaluate((e) => e.tagName)).not.toBe('BUTTON');
    await expect(page.locator('#a').getByLabel('Rows per page')).toHaveValue('10');
    await expect(page.locator('#lfdln-pagination-style')).toHaveCount(1);
    expect(problems).toEqual([]);
  });

  test('pressing moves the pager and fires page-change with the page and the size', async ({ page }) => {
    await htmlOnly(page);
    await nav(page, 'a').getByRole('button', { name: 'Next' }).click();
    await expect(status(page, 'a')).toContainText('Showing 51–60 of 120');
    await numbers(page, 'a').getByRole('button', { name: 'Page 12' }).click();
    await expect(status(page, 'a')).toContainText('Showing 111–120 of 120');
    await expect(nav(page, 'a').getByRole('button', { name: 'Next' })).toBeDisabled();
    await nav(page, 'simple').getByRole('button', { name: 'Next' }).click();
    await expect(status(page, 'simple')).toContainText('Showing 21–40 of 45');
    expect(await events(page)).toEqual([
      { on: 'a', page: 6, size: 10 },
      { on: 'a', page: 12, size: 10 },
      { on: 'simple', page: 2, size: 20 },
    ]);
  });

  test('a gap that would hide one page shows that page; one page has no numbers', async ({ page }) => {
    await htmlOnly(page);
    expect(await numbersText(page, 'seven')).toBe('1 2 3 [4] 5 6 7');
    await expect(status(page, 'one')).toContainText('Showing 1–5 of 5');
    await expect(numbers(page, 'one')).toHaveCount(0);
    await expect(nav(page, 'simple').locator('.lfdln-pagination-numbers')).toHaveCount(0);
  });

  test('a list with one size shows no picker; a page past the end shows the last', async ({ page }) => {
    await htmlOnly(page);
    await expect(page.locator('#solo select')).toHaveCount(0);
    await expect(status(page, 'solo')).toContainText('Showing 1–20 of 45');
    await expect(status(page, 'past')).toContainText('Showing 111–120 of 120');
    // Nothing to page: only the live region, saying so to screen readers.
    await expect(status(page, 'none')).toHaveText('Nothing to show.');
    await expect(status(page, 'none')).toHaveCSS('position', 'absolute');
    await expect(nav(page, 'none').getByRole('button')).toHaveCount(0);
  });

  test('a new size keeps the first row on screen', async ({ page }) => {
    await htmlOnly(page);
    const select = page.locator('#a').getByLabel('Rows per page');
    expect(await select.locator('option').allTextContents()).toEqual(['10', '20', '50']);
    await select.selectOption('20');
    // Row 41 is on page 3 of 20.
    await expect(status(page, 'a')).toContainText('Showing 41–60 of 120');
    await select.selectOption('50');
    await expect(status(page, 'a')).toContainText('Showing 1–50 of 120');
    expect(await numbersText(page, 'a')).toBe('[1] 2 3');
    expect(await events(page)).toEqual([{ on: 'a', page: 3, size: 20 }, { on: 'a', page: 1, size: 50 }]);
  });
});

test.describe('keyboard', () => {
  test('a number, then focus on the current page; Previous keeps focus; the picker by keys', async ({ page }) => {
    await htmlOnly(page);
    await numbers(page, 'a').getByRole('button', { name: 'Page 6' }).focus();
    await page.keyboard.press('Enter');
    await expect(status(page, 'a')).toContainText('Showing 51–60');
    // The pressed number became the current page (no button): focus moved there, inside the pager.
    await expect(numbers(page, 'a').locator('[aria-current=page]')).toBeFocused();
    await expect(numbers(page, 'a').locator('[aria-current=page]')).toHaveText(/6/);
    await page.keyboard.press('Tab');
    await expect(numbers(page, 'a').getByRole('button', { name: 'Page 7' })).toBeFocused();
    const prev = nav(page, 'a').getByRole('button', { name: 'Previous' });
    await prev.focus();
    await page.keyboard.press('Enter');
    await expect(status(page, 'a')).toContainText('Showing 41–50');
    await expect(prev).toBeFocused();
    const select = page.locator('#a').getByLabel('Rows per page');
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await expect(status(page, 'a')).toContainText('Showing 41–60');
  });
});

test.describe('from script', () => {
  test('properties, words and the locale; the page shows the rows it is told', async ({ page }) => {
    await page.goto('/');
    const js = page.locator('#js');
    await expect(status(page, 'js')).toContainText('26–50 von 200');
    await expect(js.getByRole('button', { name: 'Weiter' })).toBeVisible();
    await expect(page.locator('#rows li').first()).toHaveText('Row 26');
    await js.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.locator('#rows li').first()).toHaveText('Row 51');
    await js.getByLabel('Rows per page').selectOption('100');
    await expect(status(page, 'js')).toContainText('1–100 von 200');
    expect(await events(page)).toEqual([{ page: 3, size: 25 }, { page: 1, size: 100 }]);
    expect(await js.evaluate((el) => [(el as unknown as { size: number }).size, (el as unknown as { pages: number }).pages])).toEqual([100, 2]);
    // The page sets things again: total and page; a new page-size replaces the pick.
    await js.evaluate((el) => {
      const p = el as unknown as { total: number; page: number; pageSize: number };
      p.total = 1234;
      p.pageSize = 50;
      p.page = 3;
    });
    await expect(status(page, 'js')).toContainText('101–150 von 1.234');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('numbers collapse to "Page 5 of 12", targets are 44px, no sideways scroll', async ({ page }) => {
    await htmlOnly(page);
    await expect(numbers(page, 'a')).toBeHidden();
    const now = nav(page, 'a').locator('.lfdln-pagination-now');
    await expect(now).toHaveText('Page 5 of 12');
    const prev = (await nav(page, 'a').getByRole('button', { name: 'Previous' }).boundingBox())!;
    const next = (await nav(page, 'a').getByRole('button', { name: 'Next' }).boundingBox())!;
    const mid = (await now.boundingBox())!;
    expect(mid.x).toBeGreaterThan(prev.x + prev.width - 1);
    expect(mid.x + mid.width).toBeLessThan(next.x + 1);
    // The status doesn't say the page a second time on screen.
    await expect(status(page, 'a').locator('.lfdln-pagination-page')).toHaveCSS('position', 'absolute');
    expect(prev.height).toBeGreaterThanOrEqual(44);
    expect((await page.locator('#a').getByLabel('Rows per page').boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
