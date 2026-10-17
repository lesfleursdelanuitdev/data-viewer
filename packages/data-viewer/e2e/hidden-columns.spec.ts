import { test, expect, type Page } from '@playwright/test';

// demo/hidden-columns.html: three products in three viewers built from markup. "contents" comes
// first and is hidden + searchable; "test" is hidden + a filterable bool. #panel has search-in and
// filter-style="panel", #columns filter-style="columns", #cards is cards with the default card.
async function open(page: Page, query = '') {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  await page.goto(`/hidden-columns.html${query}`);
  await expect(page.locator('#panel tbody tr').first()).toBeVisible();
  return problems;
}
const names = (page: Page, id: string) => page.locator(`#${id} tbody th[scope=row]`).allTextContents();

test.use({ viewport: { width: 1280, height: 900 } });

test('a hidden column has no header and no cells; the first drawn column heads the row', async ({ page }) => {
  const problems = await open(page);
  await expect(page.locator('#panel thead th')).toHaveText(['Name', 'Kind', 'What you can do']);
  await expect(page.locator('#panel tbody tr').first().locator('th, td')).toHaveCount(3);
  await expect(page.locator('#panel tbody')).not.toContainText('rose jams');
  expect(await names(page, 'panel')).toEqual(['Rose box', 'Tea set', 'Sample']);
  expect(problems).toEqual([]);
});

test('search finds text only in the hidden column, and "Search in" lists it', async ({ page }) => {
  await open(page);
  const picker = page.locator('#panel').getByRole('combobox', { name: 'Search in' });
  await expect(picker.locator('option')).toHaveText(['All fields', 'Contents', 'Name']);
  await page.locator('#panel input[type=search]').first().fill('mint');
  await expect.poll(() => names(page, 'panel')).toEqual(['Tea set']);
  await picker.selectOption({ label: 'Name' });
  await expect.poll(() => names(page, 'panel')).toEqual([]);
  await picker.selectOption({ label: 'Contents' });
  await expect.poll(() => names(page, 'panel')).toEqual(['Tea set']);
  await expect(page).toHaveURL(/[?&]panel\.in=contents/);
});

test('a hidden bool column is a section in the panel and filters the rows', async ({ page }) => {
  await open(page);
  await page.locator('#panel .lfdln-filter-trigger').click();
  const panel = page.locator('#panel .lfdln-filter-panel');
  await expect(panel.locator('.lfdln-filter-panel-label')).toHaveText(['Kind']);
  await panel.getByRole('switch', { name: 'Test' }).click();
  await panel.locator('.lfdln-filter-show').click();
  await expect.poll(() => names(page, 'panel')).toEqual(['Sample']);
  await expect(page).toHaveURL(/panel\.f\.test=yes/);
});

test('the address filters by a hidden column too', async ({ page }) => {
  await open(page, '?columns.f.test=yes');
  await expect.poll(() => names(page, 'columns')).toEqual(['Sample']);
});

test('the columns style puts no button on a hidden column (none is drawn)', async ({ page }) => {
  await open(page);
  await expect(page.locator('#columns thead th')).toHaveText(['Name', 'Kind', 'What you can do']);
  await expect(page.locator('#columns').getByRole('button', { name: 'Filter by Kind' })).toBeVisible();
  await expect(page.locator('#columns').getByRole('button', { name: 'Filter by Test' })).toHaveCount(0);
});

test('the default card skips a hidden column: title and facts come from the drawn ones', async ({ page }) => {
  await open(page);
  const card = page.locator('#cards li').first();
  await expect(card).toContainText('Rose box');
  await expect(card).toContainText('Box');
  await expect(card).not.toContainText('rose jams');
  await page.locator('#cards input[type=search]').first().fill('pot');
  await expect(page.locator('#cards li', { hasText: 'Tea set' })).toHaveCount(1);
  await expect(page.locator('#cards li', { hasText: 'Rose box' })).toHaveCount(0);
});
