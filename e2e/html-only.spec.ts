import { test, expect, type Page } from '@playwright/test';

// demo/html-only.html: two viewers built from markup only (<lfdln-dv-column> children and
// card-* attributes), loading nothing but the built standalone script. #a is a table with
// url-state="a", #b is cards with url-state="b". Both get the same four recipes.
async function open(page: Page, query = '') {
  await page.goto(`/html-only.html${query}`);
  await expect(page.locator('#a tbody tr')).toHaveCount(4);
  await expect(page.locator('#b .dv-card')).toHaveCount(4);
}
const params = (page: Page) => [...new URL(page.url()).searchParams.keys()].sort();

test('columns from markup', async ({ page }) => {
  await open(page);
  const heads = page.locator('#a thead th');
  // Three columns plus the hidden "What you can do" column.
  await expect(heads).toHaveCount(4);
  await expect(heads.nth(0)).toHaveText('Name');
  await expect(heads.nth(1)).toHaveText('Minutes');
  await expect(heads.nth(2)).toHaveText('Price');
  // sortable is a plain attribute; Price has none.
  await expect(heads.nth(0).getByRole('button')).toHaveCount(1);
  await expect(heads.nth(1).getByRole('button')).toHaveCount(1);
  await expect(heads.nth(2).getByRole('button')).toHaveCount(0);
  // type="number" lines up right; align="left" overrides money's right.
  await expect(heads.nth(1)).toHaveClass(/dv-right/);
  await expect(heads.nth(2)).not.toHaveClass(/dv-right/);
  // currency goes into the money format.
  await expect(page.locator('#a tbody tr').first().locator('td').nth(1)).toContainText('€');
  // The column elements are gone from the light DOM once the viewer draws.
  await expect(page.locator('lfdln-dv-column')).toHaveCount(0);
  // Sorting works off the markup columns.
  await heads.nth(1).getByRole('button').click();
  await expect(page.locator('#a tbody th[scope=row]').first()).toContainText('Mint tea');
});

test('cards from attributes', async ({ page }) => {
  await open(page);
  const cards = page.locator('#b .dv-card');
  const first = cards.nth(0);
  await expect(first.locator('.dv-card-title')).toHaveText('Rose jam');
  const img = first.locator('.dv-card-picture img');
  await expect(img).toHaveAttribute('alt', '');
  await expect(img).toHaveAttribute('loading', 'lazy');
  await expect(img).toHaveAttribute('src', /\/pictures\/rose\.jpg$/);
  // card-facts lists three keys; only two are used. Minutes is formatted as a number column.
  await expect(first.locator('.dv-fact')).toHaveCount(2);
  await expect(first.locator('.dv-fact').nth(0)).toHaveText('French');
  await expect(first.locator('.dv-fact').nth(1)).toHaveText('45');
  await expect(first.locator('.dv-card-meta')).toHaveText('2 days ago');
  await expect(first.locator('.dv-card-value')).toContainText('€');
  await expect(first.locator('a.dv-card-link')).toHaveAttribute('href', /#rose-jam$/);
  // Unsafe picture and link: no picture, and the title is a button instead of a link.
  const mint = cards.nth(2);
  await expect(mint.locator('.dv-card-title')).toHaveText('Mint tea <b>hot</b>');
  await expect(mint.locator('b')).toHaveCount(0);
  await expect(mint.locator('img')).toHaveCount(0);
  await expect(mint.locator('a.dv-card-link')).toHaveCount(0);
  await expect(mint.locator('button.dv-card-link')).toHaveCount(1);
  // The table uses the same parts: the picture sits in the row header.
  await expect(page.locator('#a tbody tr').first().locator('.dv-row-picture img')).toHaveAttribute('loading', 'lazy');
});

test('two viewers with url-state', async ({ page }) => {
  await open(page);
  await page.locator('#a input[type=search]').fill('tart');
  await expect(page.locator('#a tbody tr')).toHaveCount(1);
  await expect.poll(() => params(page)).toEqual(['a.search']);
  await expect(page.locator('#b .dv-card')).toHaveCount(4);
  await page.locator('#b input[type=search]').fill('fig');
  await expect(page.locator('#b .dv-card')).toHaveCount(1);
  await expect.poll(() => params(page)).toEqual(['a.search', 'b.search']);
  expect(new URL(page.url()).searchParams.get('a.search')).toBe('tart');
  await expect(page.locator('#a tbody tr')).toHaveCount(1);
  // A reload brings each one back to its own state.
  await page.reload();
  await expect(page.locator('#a tbody tr')).toHaveCount(1);
  await expect(page.locator('#a tbody th[scope=row]')).toContainText('Lemon tart');
  await expect(page.locator('#b .dv-card')).toHaveCount(1);
  await expect(page.locator('#b .dv-card-title')).toHaveText('Fig salad');
  await expect(page.locator('#a input[type=search]')).toHaveValue('tart');
  await expect(page.locator('#b input[type=search]')).toHaveValue('fig');
});

test('a key for one viewer leaves the other alone', async ({ page }) => {
  await page.goto('/html-only.html?b.search=jam');
  await expect(page.locator('#b .dv-card')).toHaveCount(1);
  await expect(page.locator('#a tbody tr')).toHaveCount(4);
  await expect(page.locator('#a input[type=search]')).toHaveValue('');
});
