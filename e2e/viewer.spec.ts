import { test, expect, type Page } from '@playwright/test';

// The demo page: #local has 60 recipes paged in the browser, #remote is answered by demo JS.
async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('#local .dv-root')).toBeVisible();
}

test('table has a real header and aria-sort', async ({ page }) => {
  await open(page);
  const th = page.locator('#local table.dv-table thead th', { hasText: 'Name' });
  await expect(th).not.toHaveAttribute('aria-sort');
  await th.getByRole('button').click();
  await expect(th).toHaveAttribute('aria-sort', 'ascending');
  await th.getByRole('button').click();
  await expect(th).toHaveAttribute('aria-sort', 'descending');
  // The first column is each row's header.
  await expect(page.locator('#local tbody tr').first().locator('th[scope=row]')).toHaveCount(1);
  // The last header is the (hidden) "What you can do" column.
  await expect(page.locator('#local thead th').last()).toHaveText('What you can do');
});

test('search waits, then filters', async ({ page }) => {
  await open(page);
  const status = page.locator('#local .dv-pages [role=status]');
  await expect(status).toContainText('Showing 1–20 of 60');
  await page.locator('#local input[type=search]').fill('rose');
  // Not yet: the search waits 300ms after typing stops.
  await page.waitForTimeout(100);
  await expect(status).toContainText('of 60');
  await expect(status).toContainText('Showing 1–20 of 20');
  await expect(page.locator('#local tbody tr')).toHaveCount(20);
  for (const name of await page.locator('#local tbody th[scope=row]').allTextContents()) {
    expect(name.toLowerCase()).toContain('rose');
  }
});

test('pages', async ({ page }) => {
  await open(page);
  const status = page.locator('#local .dv-pages [role=status]');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toContainText('Showing 1–20 of 60');
  await page.locator('#local .dv-pages').getByRole('button', { name: 'Next' }).click();
  await expect(status).toContainText('Showing 21–40 of 60');
  await expect(page.locator('#local tbody tr')).toHaveCount(20);
});

test('views', async ({ page }) => {
  await open(page);
  const views = page.locator('#local .dv-views');
  const all = views.getByRole('link', { name: /All/ });
  const quick = views.getByRole('link', { name: /Quick/ });
  await expect(all).toHaveAttribute('aria-current', 'true');
  await expect(quick).not.toHaveAttribute('aria-current');
  await page.locator('#local .dv-pages').getByRole('button', { name: 'Next' }).click();
  const status = page.locator('#local .dv-pages [role=status]');
  await expect(status).toContainText('Showing 21–40');
  await quick.click();
  await expect(quick).toHaveAttribute('aria-current', 'true');
  await expect(all).not.toHaveAttribute('aria-current');
  await expect(status).toContainText('Showing 1–');
  await expect(status).not.toContainText('of 60');
});

test('layout switch remembers the choice', async ({ page }) => {
  await open(page);
  const cardsBtn = page.locator('#local').getByRole('button', { name: 'Show cards' });
  const tableBtn = page.locator('#local').getByRole('button', { name: 'Show a table' });
  await expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(cardsBtn).toHaveAttribute('aria-pressed', 'false');
  await cardsBtn.click();
  await expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#local .dv-cards .dv-card')).toHaveCount(20);
  await expect(page.locator('#local table')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#local .dv-cards .dv-card')).toHaveCount(20);
  await expect(page.locator('#local').getByRole('button', { name: 'Show cards' })).toHaveAttribute('aria-pressed', 'true');
});

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });
  test('phone starts on cards', async ({ page }) => {
    await open(page);
    await expect(page.locator('#local .dv-cards .dv-card').first()).toBeVisible();
    await expect(page.locator('#local table')).toHaveCount(0);
    // No sideways page scroll.
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(wide).toBe(false);
    // 44px targets.
    const box = await page.locator('#local input[type=search]').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test('row text is escaped', async ({ page }) => {
  let alerted = false;
  page.on('dialog', (d) => { alerted = true; void d.dismiss(); });
  await open(page);
  await page.locator('#local input[type=search]').fill('onerror');
  const cell = page.locator('#local tbody th[scope=row]');
  await expect(cell).toHaveCount(1);
  await expect(cell).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#local img')).toHaveCount(0);
  expect(alerted).toBe(false);
});

test('server mode fires query and shows aria-busy', async ({ page }) => {
  await open(page);
  const root = page.locator('#remote .dv-root');
  const status = page.locator('#remote .dv-pages [role=status]');
  await expect(status).toContainText('Showing 1–20 of 45');
  await expect(root).toHaveAttribute('aria-busy', 'false');
  await page.locator('#remote .dv-pages').getByRole('button', { name: 'Next' }).click();
  await expect(root).toHaveAttribute('aria-busy', 'true');
  const queries = await page.evaluate(() => (window as unknown as { queries: unknown[] }).queries);
  expect(queries).toEqual([{ page: 2, search: '', sort: '', dir: 'asc', view: '' }]);
  await expect(root).toHaveAttribute('aria-busy', 'false');
  await expect(status).toContainText('Showing 21–40 of 45');
});

test('url-state keeps the list in the address, and Back works', async ({ page }) => {
  await open(page);
  const status = page.locator('#local .dv-pages [role=status]');
  await page.locator('#local .dv-pages').getByRole('button', { name: 'Next' }).click();
  await expect(page).toHaveURL(/[?&]r\.page=2/);
  await page.reload();
  await expect(status).toContainText('Showing 21–40 of 60');
  await page.locator('#local input[type=search]').fill('rose');
  await expect(page).toHaveURL(/r\.search=rose/);
  await expect(page).not.toHaveURL(/r\.page=/);
  // Typing replaces the current entry (no entry per keystroke), so Back goes to the page before it.
  await page.goBack();
  await expect(page).not.toHaveURL(/r\./);
  await expect(status).toContainText('Showing 1–20 of 60');
  await expect(page.locator('#local input[type=search]')).toHaveValue('');
});
